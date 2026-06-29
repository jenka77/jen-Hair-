const express = require("express");
const { z } = require("zod");
const { supabase } = require("../supabase");
const { GERMAN_STATE_SLUGS, estLandAllemandValide } = require("../constants/germanStates");

const router = express.Router();

const COLS_PUBLIC =
  "id, state_slug, name, phone, address, travel_available, travel_notes, sort_order";

const coiffeuseAdminSchema = z.object({
  stateSlug: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  travelAvailable: z.boolean().optional(),
  travelNotes: z.string().trim().max(500).nullable().optional(),
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

function normaliserCoiffeuse(row) {
  return {
    id: row.id,
    stateSlug: row.state_slug,
    name: row.name,
    phone: row.phone || null,
    address: row.address || null,
    travelAvailable: row.travel_available === true,
    travelNotes: (row.travel_notes || "").trim() || null,
    sortOrder: Number(row.sort_order) || 0,
    ...(row.is_published !== undefined ? { isPublished: row.is_published !== false } : {}),
  };
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

    let query = supabase
      .from("hairdressers")
      .select(COLS_PUBLIC)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (state) query = query.eq("state_slug", state);

    const { data, error } = await query.limit(200);
    if (error) throw error;

    res.json({ hairdressers: (data || []).map(normaliserCoiffeuse) });
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

    const { data, error } = await query;
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
      sortOrder,
      isPublished,
    } = validation.data;

    if (!estLandAllemandValide(stateSlug)) {
      return res.status(400).json({ error: "Land (Bundesland) invalide" });
    }

    const { data, error } = await supabase
      .from("hairdressers")
      .insert({
        state_slug: stateSlug,
        name: name.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        travel_available: travelAvailable ?? false,
        travel_notes: travelNotes?.trim() || null,
        sort_order: sortOrder ?? 0,
        is_published: isPublished !== false,
      })
      .select(`${COLS_PUBLIC}, is_published`)
      .single();

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
    if (sortOrder !== undefined) payload.sort_order = sortOrder;
    if (isPublished !== undefined) payload.is_published = isPublished;

    const { data, error } = await supabase
      .from("hairdressers")
      .update(payload)
      .eq("id", req.params.id)
      .select(`${COLS_PUBLIC}, is_published`)
      .single();

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
