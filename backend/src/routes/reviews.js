const express = require("express");
const { z } = require("zod");
const { supabase } = require("../supabase");
const { authOptionnelle } = require("../middleware/auth");

const router = express.Router();

const avisSchema = z.object({
  authorName: z.string().trim().min(2).max(80).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(2000),
});

function normaliserAvis(row) {
  return {
    id: row.id,
    authorName: row.author_name,
    rating: Number(row.rating) || 0,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

router.get("/reviews", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("site_reviews")
      .select("id, author_name, rating, comment, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ reviews: (data || []).map(normaliserAvis) });
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
          (authorEmail ? authorEmail.split("@")[0] : "Cliente");
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
      .select("id, author_name, rating, comment, created_at")
      .single();

    if (error) throw error;
    res.status(201).json({ review: normaliserAvis(data) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
