const express = require("express");
const multer = require("multer");
const { z } = require("zod");
const { supabase } = require("../supabase");
const { verifierAdmin } = require("../middleware/admin");
const { GERMAN_STATE_SLUGS, estLandAllemandValide } = require("../constants/germanStates");
const {
  envoyerEmailNouvelleInscriptionCoiffeuse,
  envoyerEmailReceptionCoiffeuse,
  envoyerEmailCoiffeuseApprouvee,
} = require("../services/email");

const router = express.Router();

const PHOTO_TYPES_COIFFEUSE = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_TAILLE_MAX_COIFFEUSE = 5 * 1024 * 1024;
const BUCKET_PHOTOS_COIFFEUSE = "review-images";
const DOSSIER_PHOTOS_COIFFEUSE = "hairdressers";

const uploadPhotoCoiffeuse = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_TAILLE_MAX_COIFFEUSE, files: 1 },
  fileFilter(req, file, cb) {
    if (PHOTO_TYPES_COIFFEUSE.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Format de photo non supporté (JPEG, PNG ou WebP)."));
  },
});

function prefixeStockagePhotoCoiffeuse() {
  const base = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${BUCKET_PHOTOS_COIFFEUSE}/${DOSSIER_PHOTOS_COIFFEUSE}/`;
}

function estUrlPhotoCoiffeuseAutorisee(url) {
  const prefix = prefixeStockagePhotoCoiffeuse();
  if (!prefix) return false;
  return String(url || "").trim().startsWith(prefix);
}

function extensionDepuisMimeCoiffeuse(mimetype) {
  if (mimetype === "image/png") return "png";
  if (mimetype === "image/webp") return "webp";
  return "jpg";
}

const COLS_BASE =
  "id, state_slug, name, phone, address, travel_available, travel_notes, wig_install_customisation, sort_order";
const COLS_PUBLIC = `${COLS_BASE}, profile_image_url, professional_links`;
const COLS_ADMIN = `${COLS_PUBLIC}, contact_email, is_published`;

const lienProSchema = z.object({
  label: z.string().trim().max(80).nullable().optional(),
  url: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine((url) => url.startsWith("https://"), {
      message: "L'URL doit commencer par https://",
    }),
});

const coiffeuseAdminSchema = z.object({
  stateSlug: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  travelAvailable: z.boolean().optional(),
  travelNotes: z.string().trim().max(500).nullable().optional(),
  wigInstallCustomisation: z.boolean().optional(),
  profileImageUrl: z
    .string()
    .trim()
    .url()
    .max(500)
    .nullable()
    .optional()
    .refine((url) => !url || url.startsWith("https://"), {
      message: "L'URL de la photo doit commencer par https://",
    }),
  professionalLinks: z.array(lienProSchema).max(12).optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isPublished: z.boolean().optional(),
});

const coiffeuseSubmitSchema = z.object({
  stateSlug: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(3).max(40),
  address: z.string().trim().min(5).max(500),
  travelAvailable: z.boolean(),
  travelNotes: z.string().trim().min(2).max(500),
  wigInstallCustomisation: z.boolean(),
  profileImageUrl: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine((url) => url.startsWith("https://"), {
      message: "L'URL de la photo doit commencer par https://",
    }),
  professionalLinks: z.array(lienProSchema).min(1).max(12),
  locale: z.enum(["fr", "de", "en"]).optional(),
});

function messageErreurValidationCoiffeuse(zodError) {
  const LABELS = {
    stateSlug: "Land (État)",
    name: "Nom / prénom",
    email: "Adresse e-mail",
    phone: "Téléphone",
    address: "Adresse",
    travelAvailable: "Déplacement",
    travelNotes: "Précisions déplacement",
    wigInstallCustomisation: "Pose & customisation perruque",
    profileImageUrl: "Photo de profil",
    professionalLinks: "Liens professionnels",
  };

  for (const issue of zodError.issues) {
    const field = issue.path[0];
    const label = LABELS[field] || String(field || "Champ");
    const sousChamp = issue.path[2];

    if (field === "email") {
      return "Adresse e-mail invalide. Utilisez un format du type vous@exemple.com.";
    }
    if (field === "profileImageUrl") {
      return "Photo de profil manquante ou invalide. Choisissez une photo (JPEG, PNG ou WebP) depuis votre galerie.";
    }
    if (field === "professionalLinks") {
      if (sousChamp === "url") {
        return "Lien professionnel invalide : l'URL doit commencer par https:// (ex. https://www.instagram.com/votre-compte).";
      }
      return "Au moins un lien professionnel valide est requis.";
    }
    if (field === "travelAvailable" || field === "wigInstallCustomisation") {
      return `${label} : veuillez sélectionner une option (Oui ou Non).`;
    }
    if (issue.code === "too_small") {
      return `${label} : texte trop court. Complétez ce champ.`;
    }
    if (issue.code === "invalid_type") {
      return `${label} : valeur manquante ou incorrecte.`;
    }
    return `${label} : ${issue.message}`;
  }

  return "Certaines informations sont invalides. Vérifiez tous les champs obligatoires (*).";
}

function colonnesProfilManquantes(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return msg.includes("profile_image_url") || msg.includes("professional_links");
}

function colonneContactEmailManquante(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return msg.includes("contact_email");
}

function colonnesAdminManquantes(error) {
  return colonnesProfilManquantes(error) || colonneContactEmailManquante(error);
}

function normaliserLiensProfessionnels(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const url = String(item?.url || "").trim();
      if (!url.startsWith("https://")) return null;
      const label = String(item?.label || "").trim();
      return {
        label: label || url.replace(/^https:\/\/(www\.)?/, "").split("/")[0],
        url,
      };
    })
    .filter(Boolean);
}

function normaliserCoiffeuse(row, { inclureEmail = false } = {}) {
  return {
    id: row.id,
    stateSlug: row.state_slug,
    name: row.name,
    phone: row.phone || null,
    address: row.address || null,
    travelAvailable: row.travel_available === true,
    travelNotes: (row.travel_notes || "").trim() || null,
    wigInstallCustomisation: row.wig_install_customisation === true,
    profileImageUrl: (row.profile_image_url || "").trim() || null,
    professionalLinks: normaliserLiensProfessionnels(row.professional_links),
    sortOrder: Number(row.sort_order) || 0,
    ...(inclureEmail && row.contact_email !== undefined
      ? { contactEmail: (row.contact_email || "").trim().toLowerCase() || null }
      : {}),
    ...(row.is_published !== undefined ? { isPublished: row.is_published !== false } : {}),
  };
}

async function selectionnerCoiffeusesPubliques(state) {
  let query = supabase
    .from("hairdressers")
    .select(COLS_PUBLIC)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(200);

  if (state) query = query.eq("state_slug", state);

  let { data, error } = await query;

  if (error && colonnesProfilManquantes(error)) {
    query = supabase
      .from("hairdressers")
      .select(COLS_BASE)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(200);
    if (state) query = query.eq("state_slug", state);
    ({ data, error } = await query);
  }

  if (error) throw error;
  return data || [];
}

router.get("/hairdressers/states", async (req, res, next) => {
  try {
    const { data: counts, error: countError } = await supabase
      .from("hairdressers")
      .select("state_slug")
      .eq("is_published", true);

    if (countError) throw countError;

    const parLand = {};
    (counts || []).forEach((row) => {
      parLand[row.state_slug] = (parLand[row.state_slug] || 0) + 1;
    });

    res.json({
      states: GERMAN_STATE_SLUGS.map((slug) => ({
        slug,
        count: parLand[slug] || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/hairdressers", async (req, res, next) => {
  try {
    const state = String(req.query.state || "").trim();

    if (state && !estLandAllemandValide(state)) {
      return res.status(400).json({ error: "Land (Bundesland) invalide" });
    }

    const data = await selectionnerCoiffeusesPubliques(state || "");
    res.json({ hairdressers: data.map((row) => normaliserCoiffeuse(row)) });
  } catch (error) {
    next(error);
  }
});

router.post("/hairdressers/submit", async (req, res, next) => {
  try {
    if (String(req.body?.companyWebsite || "").trim()) {
      return res.status(400).json({ error: "Requête invalide" });
    }

    const validation = coiffeuseSubmitSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: messageErreurValidationCoiffeuse(validation.error),
        details: validation.error.flatten(),
      });
    }

    const {
      stateSlug,
      name,
      email,
      phone,
      address,
      travelAvailable,
      travelNotes,
      wigInstallCustomisation,
      profileImageUrl,
      professionalLinks,
      locale,
    } = validation.data;

    if (!estLandAllemandValide(stateSlug)) {
      return res.status(400).json({ error: "Land (Bundesland) invalide" });
    }

    if (!estUrlPhotoCoiffeuseAutorisee(profileImageUrl)) {
      return res.status(400).json({ error: "Photo de profil invalide ou non téléversée." });
    }

    const payload = {
      state_slug: stateSlug,
      name: name.trim(),
      contact_email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      travel_available: travelAvailable,
      travel_notes: travelNotes.trim(),
      wig_install_customisation: wigInstallCustomisation,
      profile_image_url: profileImageUrl.trim(),
      professional_links: normaliserLiensProfessionnels(professionalLinks),
      sort_order: 0,
      is_published: false,
    };

    let { data, error } = await supabase
      .from("hairdressers")
      .insert(payload)
      .select(COLS_ADMIN)
      .single();

    if (error && colonnesAdminManquantes(error)) {
      if (colonneContactEmailManquante(error)) {
        return res.status(503).json({
          error:
            "La base de données doit être mise à jour (colonne contact_email). Exécutez backend/sql/add_hairdresser_contact_email.sql dans Supabase.",
        });
      }
      delete payload.profile_image_url;
      delete payload.professional_links;
      ({ data, error } = await supabase
        .from("hairdressers")
        .insert(payload)
        .select(`${COLS_BASE}, contact_email, is_published`)
        .single());
    }

    if (error) throw error;

    const coiffeuse = normaliserCoiffeuse(data, { inclureEmail: true });
    let emailStatus = { admin: { sent: false }, coiffeuse: { sent: false } };

    try {
      const resultAdmin = await envoyerEmailNouvelleInscriptionCoiffeuse(coiffeuse, locale || "fr");
      emailStatus.admin = resultAdmin?.skipped
        ? { sent: false, ...resultAdmin }
        : { sent: true, result: resultAdmin };
    } catch (emailError) {
      console.error("Erreur email admin nouvelle coiffeuse :", emailError);
      emailStatus.admin = { sent: false, error: emailError.message };
    }

    try {
      const resultCoiffeuse = await envoyerEmailReceptionCoiffeuse(coiffeuse, locale || "fr");
      emailStatus.coiffeuse = resultCoiffeuse?.skipped
        ? { sent: false, ...resultCoiffeuse }
        : { sent: true, result: resultCoiffeuse };
    } catch (emailError) {
      console.error("Erreur email accusé coiffeuse :", emailError);
      emailStatus.coiffeuse = { sent: false, error: emailError.message };
    }

    res.status(201).json({
      ok: true,
      message: "Profil envoyé. Il sera visible après validation.",
      hairdresser: coiffeuse,
      email: emailStatus,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/hairdressers/upload-photo", (req, res, next) => {
  uploadPhotoCoiffeuse.single("photo")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "La photo doit faire 5 Mo ou moins."
          : err.message || "Upload impossible";
      return res.status(400).json({ error: message });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucune photo reçue." });
    }

    const ext = extensionDepuisMimeCoiffeuse(req.file.mimetype);
    const chemin = `${DOSSIER_PHOTOS_COIFFEUSE}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET_PHOTOS_COIFFEUSE).upload(chemin, req.file.buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: req.file.mimetype,
    });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET_PHOTOS_COIFFEUSE).getPublicUrl(chemin);
    const url = data?.publicUrl || "";

    if (!url.startsWith("https://")) {
      return res.status(500).json({ error: "Impossible de générer l'URL de la photo." });
    }

    res.json({ ok: true, url });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/hairdressers", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const state = String(req.query.state || "").trim();
    let query = supabase
      .from("hairdressers")
      .select(COLS_ADMIN)
      .order("state_slug", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(500);

    if (state) {
      if (!estLandAllemandValide(state)) {
        return res.status(400).json({ error: "Land (Bundesland) invalide" });
      }
      query = query.eq("state_slug", state);
    }

    let { data, error } = await query;

    if (error && colonnesAdminManquantes(error)) {
      query = supabase
        .from("hairdressers")
        .select(`${COLS_BASE}, is_published`)
        .order("state_slug", { ascending: true })
        .order("sort_order", { ascending: true })
        .limit(500);
      if (state) query = query.eq("state_slug", state);
      ({ data, error } = await query);
    }

    if (error) throw error;
    res.json({ hairdressers: (data || []).map((row) => normaliserCoiffeuse(row, { inclureEmail: true })) });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/hairdressers", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const validation = coiffeuseAdminSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Données invalides",
        details: validation.error.flatten(),
      });
    }

    const {
      stateSlug,
      name,
      phone,
      address,
      travelAvailable,
      travelNotes,
      wigInstallCustomisation,
      profileImageUrl,
      professionalLinks,
      sortOrder,
      isPublished,
    } = validation.data;

    if (!estLandAllemandValide(stateSlug)) {
      return res.status(400).json({ error: "Land (Bundesland) invalide" });
    }

    const payload = {
      state_slug: stateSlug,
      name: name.trim(),
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      travel_available: travelAvailable ?? false,
      travel_notes: travelNotes?.trim() || null,
      wig_install_customisation: wigInstallCustomisation ?? false,
      profile_image_url: profileImageUrl?.trim() || null,
      professional_links: normaliserLiensProfessionnels(professionalLinks || []),
      sort_order: sortOrder ?? 0,
      is_published: isPublished !== false,
    };

    let { data, error } = await supabase
      .from("hairdressers")
      .insert(payload)
      .select(`${COLS_PUBLIC}, is_published`)
      .single();

    if (error && colonnesProfilManquantes(error)) {
      delete payload.profile_image_url;
      delete payload.professional_links;
      ({ data, error } = await supabase
        .from("hairdressers")
        .insert(payload)
        .select(`${COLS_BASE}, is_published`)
        .single());
    }

    if (error) throw error;
    res.status(201).json({ hairdresser: normaliserCoiffeuse(data) });
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/hairdressers/:id", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const validation = coiffeuseAdminSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Données invalides",
        details: validation.error.flatten(),
      });
    }

    let ficheAvantRow = null;
    let { data: avant, error: erreurAvant } = await supabase
      .from("hairdressers")
      .select(COLS_ADMIN)
      .eq("id", req.params.id)
      .maybeSingle();

    if (erreurAvant && colonnesAdminManquantes(erreurAvant)) {
      ({ data: avant, error: erreurAvant } = await supabase
        .from("hairdressers")
        .select(`${COLS_BASE}, is_published`)
        .eq("id", req.params.id)
        .maybeSingle());
    }

    if (erreurAvant) throw erreurAvant;
    if (!avant) return res.status(404).json({ error: "Coiffeuse introuvable" });

    ficheAvantRow = avant;
    const ficheAvant = normaliserCoiffeuse(ficheAvantRow, { inclureEmail: true });

    const payload = {};
    const {
      stateSlug,
      name,
      email,
      phone,
      address,
      travelAvailable,
      travelNotes,
      wigInstallCustomisation,
      profileImageUrl,
      professionalLinks,
      sortOrder,
      isPublished,
    } = validation.data;

    if (stateSlug !== undefined) {
      if (!estLandAllemandValide(stateSlug)) {
        return res.status(400).json({ error: "Land (Bundesland) invalide" });
      }
      payload.state_slug = stateSlug;
    }
    if (name !== undefined) payload.name = name.trim();
    if (email !== undefined) payload.contact_email = email.trim().toLowerCase();
    if (phone !== undefined) payload.phone = phone?.trim() || null;
    if (address !== undefined) payload.address = address?.trim() || null;
    if (travelAvailable !== undefined) payload.travel_available = travelAvailable;
    if (travelNotes !== undefined) payload.travel_notes = travelNotes?.trim() || null;
    if (wigInstallCustomisation !== undefined) {
      payload.wig_install_customisation = wigInstallCustomisation;
    }
    if (profileImageUrl !== undefined) {
      payload.profile_image_url = profileImageUrl?.trim() || null;
    }
    if (professionalLinks !== undefined) {
      payload.professional_links = normaliserLiensProfessionnels(professionalLinks);
    }
    if (sortOrder !== undefined) payload.sort_order = sortOrder;
    if (isPublished !== undefined) payload.is_published = isPublished;

    let { data, error } = await supabase
      .from("hairdressers")
      .update(payload)
      .eq("id", req.params.id)
      .select(COLS_ADMIN)
      .single();

    if (error && colonnesAdminManquantes(error)) {
      delete payload.profile_image_url;
      delete payload.professional_links;
      if (payload.contact_email !== undefined) delete payload.contact_email;
      ({ data, error } = await supabase
        .from("hairdressers")
        .update(payload)
        .eq("id", req.params.id)
        .select(`${COLS_BASE}, is_published`)
        .single());
    }

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Coiffeuse introuvable" });

    const coiffeuse = normaliserCoiffeuse(data, { inclureEmail: true });
    let emailStatus = { sent: false };

    const vientDetrePubliee =
      isPublished === true && ficheAvant && ficheAvant.isPublished === false;

    if (vientDetrePubliee) {
      try {
        const result = await envoyerEmailCoiffeuseApprouvee(coiffeuse, req.body?.locale || "fr");
        emailStatus = result?.skipped ? { sent: false, ...result } : { sent: true, result };
      } catch (emailError) {
        console.error("Erreur email approbation coiffeuse :", emailError);
        emailStatus = { sent: false, error: emailError.message };
      }
    }

    res.json({ hairdresser: coiffeuse, email: emailStatus });
  } catch (error) {
    next(error);
  }
});

router.delete("/admin/hairdressers/:id", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const { data, error } = await supabase
      .from("hairdressers")
      .delete()
      .eq("id", req.params.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Coiffeuse introuvable" });

    res.json({ ok: true, id: data.id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
