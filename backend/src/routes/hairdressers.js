const express = require("express");
const { z } = require("zod");
const { supabase } = require("../supabase");
const { GERMAN_STATE_SLUGS, estLandAllemandValide } = require("../constants/germanStates");

const router = express.Router();

const COLS_BASE =
  "id, state_slug, name, phone, address, travel_available, travel_notes, wig_install_customisation, sort_order";
const COLS_PUBLIC = `${COLS_BASE}, profile_image_url, professional_links`;

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

function verifierAdmin(req, res) {
  const motDePasse = req.headers["x-admin-password"];
  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: "ADMIN_PASSWORD n'est pas configuré côté serveur" });
    return false;
  }
  if (motDePasse !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Accès admin refusé" });
    return false;
  }
  return true;
}

function colonnesProfilManquantes(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return msg.includes("profile_image_url") || msg.includes("professional_links");
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

function normaliserCoiffeuse(row) {
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

router.get("/admin/hairdressers", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const state = String(req.query.state || "").trim();
    let query = supabase
      .from("hairdressers")
      .select(`${COLS_PUBLIC}, is_published`)
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

    if (error && colonnesProfilManquantes(error)) {
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
    res.json({ hairdressers: (data || []).map(normaliserCoiffeuse) });
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

    const payload = {};
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

    if (stateSlug !== undefined) {
      if (!estLandAllemandValide(stateSlug)) {
        return res.status(400).json({ error: "Land (Bundesland) invalide" });
      }
      payload.state_slug = stateSlug;
    }
    if (name !== undefined) payload.name = name.trim();
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
      .select(`${COLS_PUBLIC}, is_published`)
      .single();

    if (error && colonnesProfilManquantes(error)) {
      delete payload.profile_image_url;
      delete payload.professional_links;
      ({ data, error } = await supabase
        .from("hairdressers")
        .update(payload)
        .eq("id", req.params.id)
        .select(`${COLS_BASE}, is_published`)
        .single());
    }

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Coiffeuse introuvable" });

    res.json({ hairdresser: normaliserCoiffeuse(data) });
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
