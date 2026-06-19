const { supabase } = require("../supabase");

async function extraireUtilisateur(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function authOptionnelle(req, res, next) {
  try {
    req.user = await extraireUtilisateur(req);
    next();
  } catch (error) {
    next(error);
  }
}

async function authObligatoire(req, res, next) {
  try {
    req.user = await extraireUtilisateur(req);
    if (!req.user) {
      return res.status(401).json({ error: "Connexion requise" });
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { authOptionnelle, authObligatoire, extraireUtilisateur };
