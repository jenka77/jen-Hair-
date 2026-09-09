const express = require("express");
const { z } = require("zod");
const { supabase } = require("../supabase");
const { verifierAdmin } = require("../middleware/admin");
const { normaliserLocale, deeplDisponible } = require("../services/deepl");
const {
  resoudreLangueRequete,
  extraireChampsProduitSource,
  construireTraductionsProduit,
  resoudreProduitPourLangue,
  resoudreCategoriePourLangue,
} = require("../services/contentTranslations");

const router = express.Router();

const COLS_PRODUIT =
  "id, category_slug, name, description, wig_type, wig_size, color, lace_size, price, stock, image_url, image_url_2, image_url_3, video_url, is_active, sort_order, created_at, translations, source_locale";

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
  source_locale: z.enum(["fr", "de", "en"]).optional(),
});

const creationProduitSchema = produitSchema.extend({
  category_slug: z.string().min(1),
  name: z.string().min(1),
});

function nettoyerPayloadProduit(payload) {
  const resultat = {};
  Object.entries(payload).forEach(([cle, valeur]) => {
    if (valeur === undefined) return;
    resultat[cle] = typeof valeur === "string" ? valeur.trim() : valeur;
  });
  return resultat;
}

function colonnesTraductionsManquantes(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("translations") || message.includes("source_locale");
}

function normaliserProduit(p, lang = "fr") {
  const texte = resoudreProduitPourLangue(p, lang);
  const image1 = (p.image_url || "").trim();
  const image2 = (p.image_url_2 || "").trim();
  const image3 = (p.image_url_3 || "").trim();
  const images = [image1, image2, image3].filter(Boolean);

  return {
    id: p.id,
    nom: texte.name,
    description: texte.description,
    type: texte.wig_type,
    taille: texte.wig_size,
    couleur: texte.color,
    tailleLace: texte.lace_size,
    prix: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    image: images[0] || "1.jpg",
    image2,
    image3,
    video: (p.video_url || "").trim(),
    fromBase: true,
  };
}

async function appliquerTraductionsProduit(payload, sourceLocale) {
  const locale = normaliserLocale(sourceLocale);
  const champs = extraireChampsProduitSource(payload);
  const translations = await construireTraductionsProduit(champs, locale);
  const source = translations[locale] || champs;

  return {
    ...payload,
    name: source.name,
    description: source.description || null,
    wig_type: source.wig_type || null,
    wig_size: source.wig_size || null,
    color: source.color || null,
    lace_size: source.lace_size || null,
    translations,
    source_locale: locale,
  };
}

router.get("/categories", async (req, res, next) => {
  try {
    const lang = resoudreLangueRequete(req);
    const { data, error } = await supabase
      .from("categories")
      .select("slug, name, description, is_learning, sort_order, translations, source_locale")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    res.json({
      categories: (data || []).map((row) => {
        const texte = resoudreCategoriePourLangue(row, lang);
        return {
          slug: row.slug,
          name: texte.name,
          description: texte.description,
          is_learning: row.is_learning,
          sort_order: row.sort_order,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const lang = resoudreLangueRequete(req);
    const category = req.query.category;

    let categorie = null;
    if (category) {
      const { data, error } = await supabase
        .from("categories")
        .select("slug, name, description, is_learning, translations, source_locale")
        .eq("slug", category)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const texte = resoudreCategoriePourLangue(data, lang);
        categorie = {
          slug: data.slug,
          name: texte.name,
          description: texte.description,
          is_learning: data.is_learning,
        };
      }
    }

    let query = supabase
      .from("products")
      .select(COLS_PRODUIT)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (category) {
      query = query.eq("category_slug", category);
    }

    let { data, error } = await query;
    if (error && colonnesTraductionsManquantes(error)) {
      let fallback = supabase
        .from("products")
        .select(
          "id, category_slug, name, description, wig_type, wig_size, color, lace_size, price, stock, image_url, image_url_2, image_url_3, video_url, is_active, sort_order, created_at"
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (category) fallback = fallback.eq("category_slug", category);
      ({ data, error } = await fallback);
    }
    if (error) throw error;

    res.json({
      category: categorie,
      produits: (data || []).map((row) => normaliserProduit(row, lang)),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/products/:id", async (req, res, next) => {
  try {
    const lang = resoudreLangueRequete(req);
    let { data, error } = await supabase.from("products").select(COLS_PRODUIT).eq("id", req.params.id).maybeSingle();

    if (error && colonnesTraductionsManquantes(error)) {
      ({ data, error } = await supabase
        .from("products")
        .select(
          "id, category_slug, name, description, wig_type, wig_size, color, lace_size, price, stock, image_url, image_url_2, image_url_3, video_url, is_active, sort_order, created_at"
        )
        .eq("id", req.params.id)
        .maybeSingle());
    }

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Produit introuvable" });

    res.json({ produit: normaliserProduit(data, lang) });
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

    let payload = nettoyerPayloadProduit({
      is_active: true,
      sort_order: 0,
      ...validation.data,
    });

    payload = await appliquerTraductionsProduit(payload, payload.source_locale || "fr");

    let { data, error } = await supabase.from("products").insert(payload).select(COLS_PRODUIT).single();

    if (error && colonnesTraductionsManquantes(error)) {
      delete payload.translations;
      delete payload.source_locale;
      ({ data, error } = await supabase
        .from("products")
        .insert(payload)
        .select(
          "id, category_slug, name, description, wig_type, wig_size, color, lace_size, price, stock, image_url, image_url_2, image_url_3, video_url, is_active, sort_order, created_at"
        )
        .single());
    }

    if (error) throw error;
    res.status(201).json({ produit: normaliserProduit(data, payload.source_locale || "fr") });
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

    let payload = nettoyerPayloadProduit(validation.data);
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "Aucune donnée à modifier" });
    }

    const champsTexte = ["name", "description", "wig_type", "wig_size", "color", "lace_size"];
    const texteModifie = champsTexte.some((cle) => payload[cle] !== undefined);

    if (texteModifie || payload.source_locale) {
      const { data: existant, error: erreurExistant } = await supabase
        .from("products")
        .select(COLS_PRODUIT)
        .eq("id", req.params.id)
        .maybeSingle();

      if (erreurExistant && !colonnesTraductionsManquantes(erreurExistant)) throw erreurExistant;
      if (!existant) return res.status(404).json({ error: "Produit introuvable" });

      const fusion = { ...extraireChampsProduitSource(existant), ...payload };
      const sourceLocale = payload.source_locale || existant.source_locale || "fr";
      const traduit = await appliquerTraductionsProduit(fusion, sourceLocale);
      payload = { ...payload, ...traduit };
    }

    let { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", req.params.id)
      .select(COLS_PRODUIT)
      .maybeSingle();

    if (error && colonnesTraductionsManquantes(error)) {
      delete payload.translations;
      delete payload.source_locale;
      ({ data, error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", req.params.id)
        .select(
          "id, category_slug, name, description, wig_type, wig_size, color, lace_size, price, stock, image_url, image_url_2, image_url_3, video_url, is_active, sort_order, created_at"
        )
        .maybeSingle());
    }

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Produit introuvable" });

    res.json({ produit: normaliserProduit(data, resoudreLangueRequete(req)) });
  } catch (error) {
    next(error);
  }
});

router.delete("/products/:id", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
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

router.post("/admin/backfill-translations", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    if (!deeplDisponible()) {
      return res.status(503).json({
        error: "DEEPL_API_KEY manquante. Ajoutez-la dans backend/.env puis redémarrez le serveur.",
      });
    }

    const scope = String(req.body?.scope || "all");
    const sourceLocale = normaliserLocale(req.body?.source_locale || "fr");
    const rapport = { products: 0, hairdressers: 0, barbers: 0, reviews: 0, errors: [] };

    if (scope === "all" || scope === "products") {
      const { data: produits, error } = await supabase.from("products").select(COLS_PRODUIT).eq("is_active", true);
      if (error && !colonnesTraductionsManquantes(error)) throw error;

      for (const produit of produits || []) {
        try {
          const traduit = await appliquerTraductionsProduit(
            { ...extraireChampsProduitSource(produit), category_slug: produit.category_slug },
            produit.source_locale || sourceLocale
          );
          const { error: updateError } = await supabase
            .from("products")
            .update({
              name: traduit.name,
              description: traduit.description,
              wig_type: traduit.wig_type,
              wig_size: traduit.wig_size,
              color: traduit.color,
              lace_size: traduit.lace_size,
              translations: traduit.translations,
              source_locale: traduit.source_locale,
            })
            .eq("id", produit.id);
          if (updateError) throw updateError;
          rapport.products += 1;
        } catch (itemError) {
          rapport.errors.push(`product:${produit.id}:${itemError.message}`);
        }
      }
    }

    if (scope === "all" || scope === "reviews") {
      const {
        construireTexteI18n,
        serialiserTexteI18n,
        extraireTexteSourceI18n,
      } = require("../services/contentTranslations");

      const { data: avis, error: avisError } = await supabase
        .from("site_reviews")
        .select("id, comment, admin_reply")
        .limit(500);

      if (avisError) throw avisError;

      for (const row of avis || []) {
        try {
          const payload = {};
          const commentSource = extraireTexteSourceI18n(row.comment, sourceLocale);
          if (commentSource && !String(row.comment || "").trim().startsWith("{")) {
            const i18n = await construireTexteI18n(commentSource, sourceLocale);
            if (i18n) payload.comment = serialiserTexteI18n(i18n);
          }

          const replySource = extraireTexteSourceI18n(row.admin_reply, sourceLocale);
          if (replySource && !String(row.admin_reply || "").trim().startsWith("{")) {
            const i18nReply = await construireTexteI18n(replySource, sourceLocale);
            if (i18nReply) payload.admin_reply = serialiserTexteI18n(i18nReply);
          }

          if (!Object.keys(payload).length) continue;

          const { error: updateError } = await supabase
            .from("site_reviews")
            .update(payload)
            .eq("id", row.id);
          if (updateError) throw updateError;
          rapport.reviews += 1;
        } catch (itemError) {
          rapport.errors.push(`review:${row.id}:${itemError.message}`);
        }
      }
    }

    if (scope === "all" || scope === "directory") {
      const { construireTravelNotesI18n, serialiserTravelNotesI18n } = require("../services/contentTranslations");

      for (const table of ["hairdressers", "barbers"]) {
        const { data: fiches, error } = await supabase
          .from(table)
          .select("id, travel_notes, travel_available")
          .eq("travel_available", true)
          .not("travel_notes", "is", null);

        if (error) throw error;

        for (const fiche of fiches || []) {
          try {
            const i18n = await construireTravelNotesI18n(fiche.travel_notes, sourceLocale);
            if (!i18n) continue;
            const { error: updateError } = await supabase
              .from(table)
              .update({ travel_notes: serialiserTravelNotesI18n(i18n) })
              .eq("id", fiche.id);
            if (updateError) throw updateError;
            if (table === "hairdressers") rapport.hairdressers += 1;
            else rapport.barbers += 1;
          } catch (itemError) {
            rapport.errors.push(`${table}:${fiche.id}:${itemError.message}`);
          }
        }
      }
    }

    res.json({ ok: true, ...rapport, deepl: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
