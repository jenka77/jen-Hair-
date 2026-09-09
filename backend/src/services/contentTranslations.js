const { LANGS, normaliserLocale, traduireTextes } = require("./deepl");

const PRODUCT_FIELDS = ["name", "description", "wig_type", "wig_size", "color", "lace_size"];
const TRAVEL_FIELDS = ["area", "fee", "conditions"];

function resoudreLangueRequete(req) {
  const lang = String(req?.query?.lang || req?.body?.locale || "fr")
    .toLowerCase()
    .slice(0, 2);
  return LANGS.includes(lang) ? lang : "fr";
}

function estFormatTravelNotesI18n(objet) {
  return Boolean(objet && typeof objet === "object" && (objet.fr || objet.de || objet.en));
}

function parserTravelNotesEntree(raw) {
  if (!raw) return null;
  const texte = String(raw).trim();
  if (!texte) return null;

  try {
    const objet = JSON.parse(texte);
    if (!objet || typeof objet !== "object") return null;

    if (estFormatTravelNotesI18n(objet)) {
      const source =
        LANGS.find((lang) => objet[lang]?.area || objet[lang]?.fee || objet[lang]?.conditions) || "fr";
      return {
        area: String(objet[source]?.area || "").trim(),
        fee: String(objet[source]?.fee || "").trim(),
        conditions: String(objet[source]?.conditions || "").trim(),
      };
    }

    return {
      area: String(objet.area || "").trim(),
      fee: String(objet.fee || "").trim(),
      conditions: String(objet.conditions || "").trim(),
    };
  } catch {
    return { area: "", fee: "", conditions: texte };
  }
}

function serialiserTravelNotesI18n(blocParLangue) {
  return JSON.stringify(blocParLangue);
}

async function traduireChampsVersLangues(champs, sourceLocale) {
  const source = normaliserLocale(sourceLocale);
  const cles = Object.keys(champs || {});
  const valeurs = cles.map((cle) => String(champs[cle] ?? "").trim());
  const resultat = { fr: {}, de: {}, en: {} };

  for (const lang of LANGS) {
    let traduits = valeurs;
    if (lang !== source && valeurs.some(Boolean)) {
      traduits = await traduireTextes(valeurs, source, lang);
    }
    cles.forEach((cle, index) => {
      resultat[lang][cle] = traduits[index] || "";
    });
  }

  return resultat;
}

async function construireTravelNotesI18n(rawNotes, sourceLocale) {
  const source = parserTravelNotesEntree(rawNotes);
  if (!source || !Object.values(source).some(Boolean)) return null;
  return traduireChampsVersLangues(source, sourceLocale);
}

function resoudreTravelNotesPourLangue(stored, lang) {
  if (!stored) return null;
  const texte = String(stored).trim();
  if (!texte) return null;

  try {
    const objet = JSON.parse(texte);
    if (estFormatTravelNotesI18n(objet)) {
      const locale = normaliserLocale(lang);
      const bloc =
        objet[locale] ||
        objet.fr ||
        objet.de ||
        objet.en ||
        null;
      if (!bloc) return null;
      return serialiserTravelNotesI18n({
        area: String(bloc.area || "").trim(),
        fee: String(bloc.fee || "").trim(),
        conditions: String(bloc.conditions || "").trim(),
      });
    }
    return texte;
  } catch {
    return texte;
  }
}

function extraireChampsProduitSource(row) {
  return {
    name: String(row.name || "").trim(),
    description: String(row.description || "").trim(),
    wig_type: String(row.wig_type || "").trim(),
    wig_size: String(row.wig_size || "").trim(),
    color: String(row.color || "").trim(),
    lace_size: String(row.lace_size || "").trim(),
  };
}

async function construireTraductionsProduit(champsSource, sourceLocale) {
  return traduireChampsVersLangues(champsSource, sourceLocale);
}

function resoudreProduitPourLangue(row, lang) {
  const locale = normaliserLocale(lang);
  const source = normaliserLocale(row.source_locale || "fr");
  const traductions = row.translations && typeof row.translations === "object" ? row.translations : {};
  const bloc = traductions[locale] || traductions[source] || {};
  const fallback = extraireChampsProduitSource(row);

  return {
    name: String(bloc.name ?? fallback.name).trim(),
    description: String(bloc.description ?? fallback.description ?? "").trim(),
    wig_type: String(bloc.wig_type ?? fallback.wig_type ?? "").trim(),
    wig_size: String(bloc.wig_size ?? fallback.wig_size ?? "").trim(),
    color: String(bloc.color ?? fallback.color ?? "").trim(),
    lace_size: String(bloc.lace_size ?? fallback.lace_size ?? "").trim(),
  };
}

function resoudreCategoriePourLangue(row, lang) {
  const locale = normaliserLocale(lang);
  const source = normaliserLocale(row.source_locale || "fr");
  const traductions = row.translations && typeof row.translations === "object" ? row.translations : {};
  const bloc = traductions[locale] || traductions[source] || {};

  return {
    name: String(bloc.name ?? row.name ?? "").trim(),
    description: String(bloc.description ?? row.description ?? "").trim(),
  };
}

module.exports = {
  LANGS,
  PRODUCT_FIELDS,
  TRAVEL_FIELDS,
  resoudreLangueRequete,
  parserTravelNotesEntree,
  construireTravelNotesI18n,
  serialiserTravelNotesI18n,
  resoudreTravelNotesPourLangue,
  extraireChampsProduitSource,
  construireTraductionsProduit,
  resoudreProduitPourLangue,
  resoudreCategoriePourLangue,
  traduireChampsVersLangues,
};
