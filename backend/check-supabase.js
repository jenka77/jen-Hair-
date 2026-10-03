#!/usr/bin/env node
/**
 * Test rapide : le backend peut-il joindre Supabase ?
 * Usage : cd backend && node check-supabase.js
 */
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const url = process.env.SUPABASE_URL || "(manquant)";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

console.log("SUPABASE_URL :", url);
console.log(
  "Clé serveur :",
  key ? `${key.slice(0, 12)}… (${key.startsWith("sb_secret_") ? "format OK" : "⚠️ utilisez sb_secret_…"})` : "❌ manquante"
);

(async () => {
  try {
    const { supabase } = require("./src/supabase");
    const { data, error } = await supabase.from("categories").select("slug").limit(3);
    if (error) {
      console.error("\n❌ Supabase a répondu avec une erreur :", error.message);
      process.exit(1);
    }
    console.log("\n✅ Connexion OK. Exemples de catégories :", (data || []).map((r) => r.slug).join(", ") || "(aucune)");
  } catch (err) {
    console.error("\n❌ Impossible de joindre Supabase :", err.message);
    console.error("\nCauses fréquentes :");
    console.error("  • Projet Supabase en pause (dashboard → Restore project)");
    console.error("  • Mauvaise clé dans backend/.env (Secret key, pas publishable)");
    console.error("  • Pas de connexion Internet / pare-feu");
    process.exit(1);
  }
})();
