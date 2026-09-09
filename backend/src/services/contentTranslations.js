const { LANGS, normaliserLocale, traduireTextes } = require("./deepl");

const PRODUCT_FIELDS = ["name", "description", "wig_type", "wig_size", "color", "lace_size"];

function resoudreLangueRequete(req) {
  const lang = String(req?.query?.lang || req?.body?.locale || "fr")
    .toLowerCase()
    .slice(0, 2);
  return LANGS.includes(lang) ? lang : "fr";
}

function estBlocStructure(objet) {
  return Boolean(
    objet &&
      typeof objet === "object" &&
      !Array.isArray(objet) &&
      ("area" in objet || "fee" in objet || "conditions" in objet)
  );
}

function nettoyerTexteTravelNotes(texte) {
  const brut = String(texte || "").trim();
  if (!brut) return "";

  const seuleCondition = brut.match(/^\*\s*Conditions\s*:\s*(.+)$/is);
  if (seuleCondition && !/Zone de service|Frais de déplacement|Servicebereich|Anfahrtskosten/i.test(brut)) {
    return seuleCondition[1].trim();
  }

  return brut;
}

function estFormatTravelNotesI18nTexte(objet) {
  return Boolean(
    objet &&
      typeof objet === "object" &&
      LANGS.some((lang) => typeof objet[lang] === "string")
  );
}

function estFormatTravelNotesI18nStructure(objet) {
  return Boolean(
    objet &&
      typeof objet === "object" &&
      LANGS.some((lang) => estBlocStructure(objet[lang]))
  );
}

function texteDepuisBlocStructure(bloc) {
  if (!bloc || typeof bloc !== "object") return "";
  const area = String(bloc.area || "").trim();
  const fee = String(bloc.fee || "").trim();
  const conditions = String(bloc.conditions || "").trim();

  if (!area && !fee && conditions) return conditions;

  const parties = [];
  if (area) parties.push(`* Zone de service : ${area}`);
  if (fee) parties.push(`* Frais de déplacement : ${fee}`);
  if (conditions) parties.push(`* Conditions : ${conditions}`);

  return parties.join(" ").trim();
}

function extraireTexteSourceTravelNotes(raw, sourceLocale = "fr") {
  if (!raw) return "";
  const texte = String(raw).trim();
  if (!texte) return "";

  if (!texte.startsWith("{")) return nettoyerTexteTravelNotes(texte);

  try {
    const objet = JSON.parse(texte);
    if (!objet || typeof objet !== "object") return texte;

    if (estFormatTravelNotesI18nTexte(objet)) {
      const source = normaliserLocale(sourceLocale);
      return nettoyerTexteTravelNotes(objet[source] || objet.fr || objet.de || objet.en || "");
    }

    if (estFormatTravelNotesI18nStructure(objet)) {
      const source = normaliserLocale(sourceLocale);
      const bloc = objet[source] || objet.fr || objet.de || objet.en;
      return texteDepuisBlocStructure(bloc);
    }

    if (estBlocStructure(objet)) {
      return texteDepuisBlocStructure(objet);
    }
  } catch {
    return texte;
  }

  return texte;
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
  const source = normaliserLocale(sourceLocale);
  const texte = extraireTexteSourceTravelNotes(rawNotes, source);
  if (!texte.trim()) return null;

  const resultat = {};
  for (const lang of LANGS) {
    if (lang === source) {
      resultat[lang] = texte.trim();
      continue;
    }
    const [traduit] = await traduireTextes([texte], source, lang);
    resultat[lang] = (traduit || texte).trim();
  }

  return resultat;
}

function resoudreTravelNotesPourLangue(stored, lang) {
  if (!stored) return null;
  const texte = String(stored).trim();
  if (!texte) return null;

  if (!texte.startsWith("{")) return texte;

  try {
    const objet = JSON.parse(texte);

    if (estFormatTravelNotesI18nTexte(objet)) {
      const locale = normaliserLocale(lang);
      const resolu = nettoyerTexteTravelNotes(objet[locale] || objet.fr || objet.de || objet.en || "");
      return resolu || null;
    }

    if (estFormatTravelNotesI18nStructure(objet)) {
      const locale = normaliserLocale(lang);
      const bloc = objet[locale] || objet.fr || objet.de || objet.en;
      const resolu = texteDepuisBlocStructure(bloc);
      return resolu || null;
    }

    if (estBlocStructure(objet)) {
      const resolu = texteDepuisBlocStructure(objet);
      return resolu || null;
    }
  } catch {
    return texte;
  }

  return texte;
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

function estFormatTexteI18n(objet) {
  return estFormatTravelNotesI18nTexte(objet);
}

function extraireTexteSourceI18n(raw, sourceLocale = "fr") {
  if (!raw) return "";
  const texte = String(raw).trim();
  if (!texte) return "";
  if (!texte.startsWith("{")) return texte;

  try {
    const objet = JSON.parse(texte);
    if (estFormatTexteI18n(objet)) {
      const source = normaliserLocale(sourceLocale);
      return String(objet[source] || objet.fr || objet.de || objet.en || "").trim();
    }
  } catch {
    return texte;
  }

  return texte;
}

function serialiserTexteI18n(blocParLangue) {
  return JSON.stringify(blocParLangue);
}

async function construireTexteI18n(texteBrut, sourceLocale) {
  const source = normaliserLocale(sourceLocale);
  const texte = extraireTexteSourceI18n(texteBrut, source);
  if (!texte.trim()) return null;

  const resultat = {};
  for (const lang of LANGS) {
    if (lang === source) {
      resultat[lang] = texte.trim();
      continue;
    }
    const [traduit] = await traduireTextes([texte], source, lang);
    resultat[lang] = (traduit || texte).trim();
  }

  return resultat;
}

function resoudreTexteI18nPourLangue(stored, lang) {
  if (!stored) return null;
  const texte = String(stored).trim();
  if (!texte) return null;
  if (!texte.startsWith("{")) return texte;

  try {
    const objet = JSON.parse(texte);
    if (estFormatTexteI18n(objet)) {
      const locale = normaliserLocale(lang);
      const resolu = String(objet[locale] || objet.fr || objet.de || objet.en || "").trim();
      return resolu || null;
    }
  } catch {
    return texte;
  }

  return texte;
}

module.exports = {
  LANGS,
  PRODUCT_FIELDS,
  resoudreLangueRequete,
  extraireTexteSourceTravelNotes,
  construireTravelNotesI18n,
  serialiserTravelNotesI18n,
  resoudreTravelNotesPourLangue,
  extraireChampsProduitSource,
  construireTraductionsProduit,
  resoudreProduitPourLangue,
  resoudreCategoriePourLangue,
  traduireChampsVersLangues,
  extraireTexteSourceI18n,
  construireTexteI18n,
  serialiserTexteI18n,
  resoudreTexteI18nPourLangue,
};
