const LANGS = ["fr", "de", "en"];

function apiDeepLUrl() {
  if (process.env.DEEPL_API_URL) return process.env.DEEPL_API_URL;
  const key = process.env.DEEPL_API_KEY || "";
  return key.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

function deeplDisponible() {
  return Boolean(String(process.env.DEEPL_API_KEY || "").trim());
}

function normaliserLocale(locale) {
  const l = String(locale || "fr").toLowerCase().slice(0, 2);
  return LANGS.includes(l) ? l : "fr";
}

function codeDeepL(lang) {
  const map = { fr: "FR", de: "DE", en: "EN" };
  return map[normaliserLocale(lang)] || "FR";
}

async function traduireTextes(textes, sourceLang, targetLang) {
  const source = normaliserLocale(sourceLang);
  const target = normaliserLocale(targetLang);
  const liste = (textes || []).map((texte) => String(texte ?? ""));

  if (target === source) return liste.map((texte) => texte.trim());

  const aTraduire = liste.map((texte) => texte.trim());
  if (!aTraduire.some(Boolean)) return aTraduire;

  if (!deeplDisponible()) {
    console.warn("[DeepL] DEEPL_API_KEY manquante — texte source conservé pour", target);
    return aTraduire;
  }

  const reponse = await fetch(apiDeepLUrl(), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: aTraduire,
      source_lang: codeDeepL(source),
      target_lang: codeDeepL(target),
    }),
  });

  const data = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    const message = data?.message || reponse.statusText || "Erreur DeepL";
    throw new Error(`DeepL : ${message}`);
  }

  const traductions = (data.translations || []).map((item) => String(item.text || "").trim());
  return aTraduire.map((original, index) => traductions[index] || original);
}

async function traduireTexte(texte, sourceLang, targetLang) {
  const [resultat] = await traduireTextes([texte], sourceLang, targetLang);
  return resultat || "";
}

module.exports = {
  LANGS,
  deeplDisponible,
  normaliserLocale,
  traduireTexte,
  traduireTextes,
};
