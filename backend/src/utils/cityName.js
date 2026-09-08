const { z } = require("zod");

const VILLE_MAX = 80;
const VILLE_MIN = 2;
const VILLE_PATTERN = /^[\p{L}][\p{L}\s'.-]*$/u;
const MOTS_RUE = /\b(strasse|straße|str\.|street|st\.|rue|avenue|av\.|weg|platz|allee|route|via|bd\.|boulevard|boul\.|gasse|damm|ufer|ring)\b/i;

function normaliserNomVille(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function estNomVilleAnnuaireValide(value) {
  const ville = normaliserNomVille(value);
  if (ville.length < VILLE_MIN || ville.length > VILLE_MAX) return false;
  if (/\d/.test(ville)) return false;
  if (/[,;@#\\/]/.test(ville)) return false;
  if (!VILLE_PATTERN.test(ville)) return false;
  if (MOTS_RUE.test(ville)) return false;
  return true;
}

const villeAnnuaireSchema = z
  .string()
  .trim()
  .min(VILLE_MIN, { message: "Indiquez uniquement le nom de la ville." })
  .max(VILLE_MAX, { message: "Nom de ville trop long." })
  .refine(estNomVilleAnnuaireValide, {
    message:
      "Indiquez uniquement le nom de la ville (sans rue, numéro ni code postal).",
  });

const villeAnnuaireOptionnelleSchema = z
  .string()
  .trim()
  .max(VILLE_MAX)
  .nullable()
  .optional()
  .refine((value) => value == null || value === "" || estNomVilleAnnuaireValide(value), {
    message:
      "Indiquez uniquement le nom de la ville (sans rue, numéro ni code postal).",
  });

module.exports = {
  VILLE_MAX,
  VILLE_MIN,
  normaliserNomVille,
  estNomVilleAnnuaireValide,
  villeAnnuaireSchema,
  villeAnnuaireOptionnelleSchema,
};
