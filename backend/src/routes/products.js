const express = require("express");
const { z } = require("zod");
const { supabase } = require("../supabase");

const router = express.Router();

const produitSchema = z.object({
  category_slug: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  wig_type: z.string().optional().nullable(),
  wig_size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  lace_size: z.string().optional().nullable(),
  price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  image_url: z.string().optional().nullable(),
  image_url_2: z.string().optional().nullable(),
  image_url_3: z.string().optional().nullable(),
  video_url: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
});

const creationProduitSchema = produitSchema.extend({
  category_slug: z.string().min(1),
  name: z.string().min(1),
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

function nettoyerPayloadProduit(payload) {
  const resultat = {};
  Object.entries(payload).forEach(([cle, valeur]) => {
    if (valeur === undefined) return;
    resultat[cle] = typeof valeur === "string" ? valeur.trim() : valeur;
  });
  return resultat;
}

function normaliserProduit(p) {
  const image1 = (p.image_url || "").trim();
  const image2 = (p.image_url_2 || "").trim();
  const image3 = (p.image_url_3 || "").trim();
  const images = [image1, image2, image3].filter(Boolean);

  return {
    id: p.id,
    nom: (p.name || "").trim(),
    description: (p.description || "").trim(),
    type: (p.wig_type || "").trim(),
    taille: (p.wig_size || "").trim(),
    couleur: (p.color || "").trim(),
    tailleLace: (p.lace_size || "").trim(),
    prix: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    image: images[0] || "1.jpg",
    image2,
    image3,
    video: (p.video_url || "").trim(),
    fromBase: true,
  };
}

router.get("/categories", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("slug, name, description, is_learning, sort_order")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    res.json({ categories: data || [] });
  } catch (error) {
    next(error);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const category = req.query.category;

    let categorie = null;
    if (category) {
      const { data, error } = await supabase
        .from("categories")
        .select("slug, name, description, is_learning")
        .eq("slug", category)
        .maybeSingle();

      if (error) throw error;
      categorie = data;
    }

    let query = supabase
      .from("products")
      .select(
        "id, category_slug, name, description, wig_type, wig_size, color, lace_size, price, stock, image_url, image_url_2, image_url_3, video_url, is_active, sort_order, created_at"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (category) {
      query = query.eq("category_slug", category);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      category: categorie,
      produits: (data || []).map(normaliserProduit),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/products/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, category_slug, name, description, wig_type, wig_size, color, lace_size, price, stock, image_url, image_url_2, image_url_3, video_url, is_active, sort_order, created_at"
      )
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Produit introuvable" });

    res.json({ produit: normaliserProduit(data) });
  } catch (error) {
    next(error);
  }
});

router.post("/products", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const validation = creationProduitSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Données produit invalides",
        details: validation.error.flatten(),
      });
    }

    const payload = nettoyerPayloadProduit({
      is_active: true,
      sort_order: 0,
      ...validation.data,
    });

    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select(
        "id, category_slug, name, description, wig_type, wig_size, color, lace_size, price, stock, image_url, image_url_2, image_url_3, video_url, is_active, sort_order, created_at"
      )
      .single();

    if (error) throw error;
    res.status(201).json({ produit: normaliserProduit(data) });
  } catch (error) {
    next(error);
  }
});

router.patch("/products/:id", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const validation = produitSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Données produit invalides",
        details: validation.error.flatten(),
      });
    }

    const payload = nettoyerPayloadProduit(validation.data);
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "Aucune donnée à modifier" });
    }

    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", req.params.id)
      .select(
        "id, category_slug, name, description, wig_type, wig_size, color, lace_size, price, stock, image_url, image_url_2, image_url_3, video_url, is_active, sort_order, created_at"
      )
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Produit introuvable" });

    res.json({ produit: normaliserProduit(data) });
  } catch (error) {
    next(error);
  }
});

router.delete("/products/:id", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    // Suppression douce : le produit disparaît du site, mais reste en base.
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", req.params.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Produit introuvable" });

    res.json({ ok: true, id: data.id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
