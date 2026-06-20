const express = require("express");
const { z } = require("zod");
const { supabase } = require("../supabase");
const { authOptionnelle } = require("../middleware/auth");

const router = express.Router();

const COLS_BASE =
  "id, author_name, rating, comment, created_at";
const COLS_REPLY = "admin_reply, replied_at, reply_visible";
const COLS_PUBLIC = `${COLS_BASE}, ${COLS_REPLY}`;
const COLS_ADMIN = `id, author_name, author_email, rating, comment, created_at, ${COLS_REPLY}, is_published`;

const avisSchema = z.object({
  authorName: z.string().trim().min(2).max(80).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(2000),
});

const avisAdminSchema = z.object({
  adminReply: z.string().trim().max(2000).nullable().optional(),
  replyVisible: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

function colonnesReponseManquantes(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return (
    msg.includes("admin_reply") ||
    msg.includes("replied_at") ||
    msg.includes("reply_visible")
  );
}

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

function normaliserAvis(row, { publicView = false } = {}) {
  const replyVisible = row.reply_visible !== false;
  const adminReply = (row.admin_reply || "").trim();
  const showReply = !publicView || (replyVisible && adminReply.length > 0);

  return {
    id: row.id,
    authorName: row.author_name,
    rating: Number(row.rating) || 0,
    comment: row.comment,
    createdAt: row.created_at,
    adminReply: showReply ? adminReply : null,
    repliedAt: showReply && row.replied_at ? row.replied_at : null,
    ...(publicView
      ? {}
      : {
          authorEmail: row.author_email || null,
          isPublished: row.is_published !== false,
          replyVisible: row.reply_visible !== false,
        }),
  };
}

async function selectionnerAvisPublics() {
  let requete = supabase
    .from("site_reviews")
    .select(COLS_PUBLIC)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(100);

  let { data, error } = await requete;

  if (error && colonnesReponseManquantes(error)) {
    ({ data, error } = await supabase
      .from("site_reviews")
      .select(COLS_BASE)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(100));
  }

  if (error) throw error;
  return data || [];
}

async function selectionnerAvisAdmin() {
  let { data, error } = await supabase
    .from("site_reviews")
    .select(COLS_ADMIN)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error && colonnesReponseManquantes(error)) {
    ({ data, error } = await supabase
      .from("site_reviews")
      .select("id, author_name, author_email, rating, comment, created_at, is_published")
      .order("created_at", { ascending: false })
      .limit(200));
  }

  if (error) throw error;
  return data || [];
}

router.get("/reviews", async (req, res, next) => {
  try {
    const data = await selectionnerAvisPublics();
    res.json({ reviews: data.map((row) => normaliserAvis(row, { publicView: true })) });
  } catch (error) {
    next(error);
  }
});

router.post("/reviews", authOptionnelle, async (req, res, next) => {
  try {
    const validation = avisSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Avis invalide",
        details: validation.error.flatten(),
      });
    }

    const { rating, comment } = validation.data;
    let authorName = validation.data.authorName || "";
    let authorEmail = null;
    let userId = null;

    if (req.user) {
      userId = req.user.id;
      authorEmail = String(req.user.email || "").trim().toLowerCase() || null;
      if (!authorName) {
        authorName =
          req.user.user_metadata?.full_name ||
          req.user.user_metadata?.name ||
          (authorEmail ? authorEmail.split("@")[0] : "Visiteur");
      }
    }

    if (!authorName || authorName.length < 2) {
      return res.status(400).json({
        error: "Indiquez votre prénom ou un pseudonyme (2 caractères minimum).",
      });
    }

    const { data, error } = await supabase
      .from("site_reviews")
      .insert({
        author_name: authorName.trim(),
        author_email: authorEmail,
        user_id: userId,
        rating,
        comment: comment.trim(),
        is_published: true,
      })
      .select(COLS_BASE)
      .single();

    if (error) throw error;
    res.status(201).json({ review: normaliserAvis(data, { publicView: true }) });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/reviews", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const data = await selectionnerAvisAdmin();
    res.json({ reviews: data.map((row) => normaliserAvis(row)) });
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/reviews/:id", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const validation = avisAdminSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Données invalides",
        details: validation.error.flatten(),
      });
    }

    const { data: existing, error: existingError } = await supabase
      .from("site_reviews")
      .select("id")
      .eq("id", req.params.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return res.status(404).json({ error: "Avis introuvable" });

    const payload = {};
    const { adminReply, replyVisible, isPublished } = validation.data;

    if (adminReply !== undefined) {
      const texte = adminReply ? adminReply.trim() : "";
      payload.admin_reply = texte || null;
      payload.replied_at = texte ? new Date().toISOString() : null;
    }
    if (replyVisible !== undefined) payload.reply_visible = replyVisible;
    if (isPublished !== undefined) payload.is_published = isPublished;

    const { data, error } = await supabase
      .from("site_reviews")
      .update(payload)
      .eq("id", req.params.id)
      .select(COLS_ADMIN)
      .single();

    if (error && colonnesReponseManquantes(error)) {
      return res.status(503).json({
        error:
          "Les réponses admin ne sont pas encore activées. Exécutez supabase/migration_v6_review_replies.sql dans Supabase.",
      });
    }

    if (error) throw error;
    res.json({ review: normaliserAvis(data) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
