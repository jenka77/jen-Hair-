const express = require("express");
const multer = require("multer");
const { z } = require("zod");
const { supabase } = require("../supabase");
const { verifierAdmin } = require("../middleware/admin");
const { authOptionnelle, authObligatoire } = require("../middleware/auth");
const { GERMAN_STATE_SLUGS, estLandAllemandValide } = require("../constants/germanStates");
const {
  envoyerEmailNouvelleInscriptionCoiffeur,
  envoyerEmailReceptionCoiffeur,
  envoyerEmailCoiffeurApprouvee,
} = require("../services/email");

const router = express.Router();

const PHOTO_TYPES_COIFFEUR = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_TAILLE_MAX_COIFFEUR = 5 * 1024 * 1024;
const BUCKET_PHOTOS_COIFFEUSE = "review-images";
const DOSSIER_PHOTOS_COIFFEUR = "barbers";

const uploadPhotoCoiffeur = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_TAILLE_MAX_COIFFEUR, files: 1 },
  fileFilter(req, file, cb) {
    if (PHOTO_TYPES_COIFFEUR.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Format de photo non supporté (JPEG, PNG ou WebP)."));
  },
});

function prefixeStockagePhotoCoiffeur() {
  const base = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${BUCKET_PHOTOS_COIFFEUSE}/${DOSSIER_PHOTOS_COIFFEUR}/`;
}

function estUrlPhotoCoiffeurAutorisee(url) {
  const prefix = prefixeStockagePhotoCoiffeur();
  if (!prefix) return false;
  return String(url || "").trim().startsWith(prefix);
}

function extensionDepuisMimeCoiffeur(mimetype) {
  if (mimetype === "image/png") return "png";
  if (mimetype === "image/webp") return "webp";
  return "jpg";
}

const COLS_BASE =
  "id, state_slug, name, phone, address, travel_available, travel_notes, wig_install_customisation, sort_order";
const COLS_PUBLIC = `${COLS_BASE}, profile_image_url, professional_links, average_rating, rating_count`;
const COLS_PUBLIC_LEGACY = `${COLS_BASE}, profile_image_url, professional_links`;
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

const coiffeurAdminSchema = z.object({
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

const coiffeurSubmitSchema = z.object({
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

const noteCoiffeurSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
});

function messageErreurValidationCoiffeur(zodError) {
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
  return (
    colonnesProfilManquantes(error) ||
    colonneContactEmailManquante(error) ||
    colonnesNotesManquantes(error)
  );
}

function colonnesNotesManquantes(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return msg.includes("average_rating") || msg.includes("rating_count");
}

function tableNotesCoiffeurManquante(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return msg.includes("barber_ratings");
}

async function chargerNotesUtilisateurCoiffeur(userId, coiffeurIds) {
  if (!userId || !coiffeurIds.length) return {};

  const { data, error } = await supabase
    .from("barber_ratings")
    .select("barber_id, rating")
    .eq("user_id", userId)
    .in("barber_id", coiffeurIds);

  if (error) {
    if (tableNotesCoiffeurManquante(error)) return {};
    throw error;
  }

  const parId = {};
  (data || []).forEach((row) => {
    parId[row.barber_id] = Number(row.rating) || 0;
  });
  return parId;
}

async function recalculerNotesCoiffeur(barberId) {
  const { data: notes, error: errNotes } = await supabase
    .from("barber_ratings")
    .select("rating")
    .eq("barber_id", barberId);

  if (errNotes) throw errNotes;

  const liste = notes || [];
  const ratingCount = liste.length;
  const averageRating = ratingCount
    ? Math.round((liste.reduce((sum, row) => sum + Number(row.rating), 0) / ratingCount) * 100) /
      100
    : 0;

  const { error: errUpdate } = await supabase
    .from("barbers")
    .update({ average_rating: averageRating, rating_count: ratingCount })
    .eq("id", barberId);

  if (errUpdate && !colonnesNotesManquantes(errUpdate)) throw errUpdate;

  return { averageRating, ratingCount };
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

function normaliserCoiffeur(row, { inclureEmail = false } = {}) {
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
    averageRating: Number(row.average_rating) || 0,
    ratingCount: Number(row.rating_count) || 0,
    ...(row.user_rating !== undefined ? { userRating: Number(row.user_rating) || null } : {}),
    ...(inclureEmail && row.contact_email !== undefined
      ? { contactEmail: (row.contact_email || "").trim().toLowerCase() || null }
      : {}),
    ...(row.is_published !== undefined ? { isPublished: row.is_published !== false } : {}),
  };
}

async function selectionnerCoiffeursPubliques(state) {
  const construireRequete = (cols, triParNotes) => {
    let query = supabase.from("barbers").select(cols).eq("is_published", true).limit(200);

    if (triParNotes) {
      query = query
        .order("average_rating", { ascending: false })
        .order("rating_count", { ascending: false })
        .order("name", { ascending: true });
    } else {
      query = query.order("sort_order", { ascending: true }).order("name", { ascending: true });
    }

    if (state) query = query.eq("state_slug", state);
    return query;
  };

  let { data, error } = await construireRequete(COLS_PUBLIC, true);

  if (error && colonnesProfilManquantes(error)) {
    ({ data, error } = await construireRequete(COLS_BASE, false));
  } else if (error && colonnesNotesManquantes(error)) {
    ({ data, error } = await construireRequete(COLS_PUBLIC_LEGACY, false));
  }

  if (error) throw error;
  return data || [];
}

router.get("/barbers/states", async (req, res, next) => {
  try {
    const { data: counts, error: countError } = await supabase
      .from("barbers")
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

router.get("/barbers", authOptionnelle, async (req, res, next) => {
  try {
    const state = String(req.query.state || "").trim();

    if (state && !estLandAllemandValide(state)) {
      return res.status(400).json({ error: "Land (Bundesland) invalide" });
    }

    const data = await selectionnerCoiffeursPubliques(state || "");
    const ids = data.map((row) => row.id);
    const notesUtilisateur = req.user?.id ? await chargerNotesUtilisateurCoiffeur(req.user.id, ids) : {};

    const coiffeurs = data.map((row) =>
      normaliserCoiffeur({
        ...row,
        ...(req.user?.id ? { user_rating: notesUtilisateur[row.id] ?? null } : {}),
      })
    );

    res.json({ barbers: coiffeurs });
  } catch (error) {
    next(error);
  }
});

router.post("/barbers/:id/rate", authObligatoire, async (req, res, next) => {
  try {
    const validation = noteCoiffeurSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Note invalide (1 à 5 étoiles)." });
    }

    const { rating } = validation.data;
    const coiffeurId = req.params.id;

    const { data: coiffeur, error: errCoiffeur } = await supabase
      .from("barbers")
      .select("id, is_published, contact_email")
      .eq("id", coiffeurId)
      .maybeSingle();

    if (errCoiffeur) throw errCoiffeur;
    if (!coiffeur || coiffeur.is_published === false) {
      return res.status(404).json({ error: "Coiffeur introuvable" });
    }

    const emailClient = String(req.user.email || "")
      .trim()
      .toLowerCase();
    const emailCoiffeur = String(coiffeur.contact_email || "")
      .trim()
      .toLowerCase();

    if (emailClient && emailCoiffeur && emailClient === emailCoiffeur) {
      return res.status(403).json({
        error: "Vous ne pouvez pas noter votre propre profil coiffeur.",
      });
    }

    const { error: errNote } = await supabase.from("barber_ratings").upsert(
      {
        barber_id: coiffeurId,
        user_id: req.user.id,
        rating,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "barber_id,user_id" }
    );

    if (errNote) {
      if (tableNotesCoiffeurManquante(errNote)) {
        return res.status(503).json({
          error:
            "Système de notes indisponible. Exécutez backend/sql/add_barber_ratings.sql dans Supabase.",
        });
      }
      throw errNote;
    }

    const stats = await recalculerNotesCoiffeur(coiffeurId);

    res.json({
      ok: true,
      rating,
      averageRating: stats.averageRating,
      ratingCount: stats.ratingCount,
      userRating: rating,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/barbers/submit", async (req, res, next) => {
  try {
    if (String(req.body?.companyWebsite || "").trim()) {
      return res.status(400).json({ error: "Requête invalide" });
    }

    const validation = coiffeurSubmitSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: messageErreurValidationCoiffeur(validation.error),
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

    if (!estUrlPhotoCoiffeurAutorisee(profileImageUrl)) {
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
      .from("barbers")
      .insert(payload)
      .select(COLS_ADMIN)
      .single();

    if (error && colonnesAdminManquantes(error)) {
      if (colonneContactEmailManquante(error)) {
        return res.status(503).json({
          error:
            "La base de données doit être mise à jour (colonne contact_email). Exécutez backend/sql/add_barber_contact_email.sql dans Supabase.",
        });
      }
      delete payload.profile_image_url;
      delete payload.professional_links;
      ({ data, error } = await supabase
        .from("barbers")
        .insert(payload)
        .select(`${COLS_BASE}, contact_email, is_published`)
        .single());
    }

    if (error) throw error;

    const coiffeur = normaliserCoiffeur(data, { inclureEmail: true });
    let emailStatus = { admin: { sent: false }, coiffeur: { sent: false } };

    try {
      const resultAdmin = await envoyerEmailNouvelleInscriptionCoiffeur(coiffeur, locale || "fr");
      emailStatus.admin = resultAdmin?.skipped
        ? { sent: false, ...resultAdmin }
        : { sent: true, result: resultAdmin };
    } catch (emailError) {
      console.error("Erreur email admin nouvelle coiffeur :", emailError);
      emailStatus.admin = { sent: false, error: emailError.message };
    }

    try {
      const resultCoiffeur = await envoyerEmailReceptionCoiffeur(coiffeur, locale || "fr");
      emailStatus.coiffeur = resultCoiffeur?.skipped
        ? { sent: false, ...resultCoiffeur }
        : { sent: true, result: resultCoiffeur };
    } catch (emailError) {
      console.error("Erreur email accusé coiffeur :", emailError);
      emailStatus.coiffeur = { sent: false, error: emailError.message };
    }

    res.status(201).json({
      ok: true,
      message: "Profil envoyé. Il sera visible après validation.",
      barber: coiffeur,
      email: emailStatus,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/barbers/upload-photo", (req, res, next) => {
  uploadPhotoCoiffeur.single("photo")(req, res, (err) => {
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

    const ext = extensionDepuisMimeCoiffeur(req.file.mimetype);
    const chemin = `${DOSSIER_PHOTOS_COIFFEUR}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

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

router.get("/admin/barbers", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const state = String(req.query.state || "").trim();
    let query = supabase
      .from("barbers")
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
        .from("barbers")
        .select(`${COLS_BASE}, is_published`)
        .order("state_slug", { ascending: true })
        .order("sort_order", { ascending: true })
        .limit(500);
      if (state) query = query.eq("state_slug", state);
      ({ data, error } = await query);
    }

    if (error) throw error;
    res.json({ barbers: (data || []).map((row) => normaliserCoiffeur(row, { inclureEmail: true })) });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/barbers", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const validation = coiffeurAdminSchema.safeParse(req.body);
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
      .from("barbers")
      .insert(payload)
      .select(`${COLS_PUBLIC}, is_published`)
      .single();

    if (error && colonnesProfilManquantes(error)) {
      delete payload.profile_image_url;
      delete payload.professional_links;
      ({ data, error } = await supabase
        .from("barbers")
        .insert(payload)
        .select(`${COLS_BASE}, is_published`)
        .single());
    }

    if (error) throw error;
    res.status(201).json({ barber: normaliserCoiffeur(data) });
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/barbers/:id", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const validation = coiffeurAdminSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Données invalides",
        details: validation.error.flatten(),
      });
    }

    let ficheAvantRow = null;
    let { data: avant, error: erreurAvant } = await supabase
      .from("barbers")
      .select(COLS_ADMIN)
      .eq("id", req.params.id)
      .maybeSingle();

    if (erreurAvant && colonnesAdminManquantes(erreurAvant)) {
      ({ data: avant, error: erreurAvant } = await supabase
        .from("barbers")
        .select(`${COLS_BASE}, is_published`)
        .eq("id", req.params.id)
        .maybeSingle());
    }

    if (erreurAvant) throw erreurAvant;
    if (!avant) return res.status(404).json({ error: "Coiffeur introuvable" });

    ficheAvantRow = avant;
    const ficheAvant = normaliserCoiffeur(ficheAvantRow, { inclureEmail: true });

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
      .from("barbers")
      .update(payload)
      .eq("id", req.params.id)
      .select(COLS_ADMIN)
      .single();

    if (error && colonnesAdminManquantes(error)) {
      delete payload.profile_image_url;
      delete payload.professional_links;
      if (payload.contact_email !== undefined) delete payload.contact_email;
      ({ data, error } = await supabase
        .from("barbers")
        .update(payload)
        .eq("id", req.params.id)
        .select(`${COLS_BASE}, is_published`)
        .single());
    }

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Coiffeur introuvable" });

    const coiffeur = normaliserCoiffeur(data, { inclureEmail: true });
    let emailStatus = { sent: false };

    const vientDetrePubliee =
      isPublished === true && ficheAvant && ficheAvant.isPublished === false;

    if (vientDetrePubliee) {
      try {
        const result = await envoyerEmailCoiffeurApprouvee(coiffeur, req.body?.locale || "fr");
        emailStatus = result?.skipped ? { sent: false, ...result } : { sent: true, result };
      } catch (emailError) {
        console.error("Erreur email approbation coiffeur :", emailError);
        emailStatus = { sent: false, error: emailError.message };
      }
    }

    res.json({ barber: coiffeur, email: emailStatus });
  } catch (error) {
    next(error);
  }
});

router.delete("/admin/barbers/:id", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const { data, error } = await supabase
      .from("barbers")
      .delete()
      .eq("id", req.params.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Coiffeur introuvable" });

    res.json({ ok: true, id: data.id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
