/* ============================================================
   Jen's & Floran — Liens légaux selon la langue du site
   ============================================================ */

const LEGAL_PAGES = {
  cgv: { fr: "fr/cgv.html", en: "en/gtc.html", de: "de/agb.html" },
  retours: { fr: "fr/retours.html", en: "en/returns.html", de: "de/widerruf.html" },
  privacy: { fr: "fr/confidentialite.html", en: "en/privacy.html", de: "de/datenschutz.html" },
};

const LEGAL_LANG_SISTER = {
  "fr/cgv.html": LEGAL_PAGES.cgv,
  "fr/retours.html": LEGAL_PAGES.retours,
  "fr/confidentialite.html": LEGAL_PAGES.privacy,
  "en/gtc.html": LEGAL_PAGES.cgv,
  "en/returns.html": LEGAL_PAGES.retours,
  "en/privacy.html": LEGAL_PAGES.privacy,
  "de/agb.html": LEGAL_PAGES.cgv,
  "de/widerruf.html": LEGAL_PAGES.retours,
  "de/datenschutz.html": LEGAL_PAGES.privacy,
};

function dossierLangueCourant() {
  const match = window.location.pathname.match(/\/(fr|en|de)\//);
  return match ? match[1] : null;
}

function pageLegaleCourante() {
  const path = window.location.pathname;
  for (const rel of Object.keys(LEGAL_LANG_SISTER)) {
    if (path.endsWith(rel) || path.endsWith("/" + rel.replace(".html", ""))) {
      return rel;
    }
  }
  return null;
}

function urlLegale(type, lang) {
  const cible = (LEGAL_PAGES[type] && LEGAL_PAGES[type][lang]) || LEGAL_PAGES[type].fr;
  const dossier = dossierLangueCourant();

  if (!dossier) return cible;

  if (cible.startsWith(dossier + "/")) {
    return cible.split("/").pop();
  }
  return "../" + cible;
}

function mettreAJourLiensLegaux() {
  const dossier = dossierLangueCourant();
  const lang =
    (dossier && LEGAL_PAGES.cgv[dossier] && dossier) ||
    (typeof langueActuelle !== "undefined" && LEGAL_PAGES.cgv[langueActuelle]
      ? langueActuelle
      : "fr");

  document.querySelectorAll("[data-legal]").forEach((el) => {
    const type = el.dataset.legal;
    if (LEGAL_PAGES[type]) {
      el.href = urlLegale(type, lang);
    }
  });
}

function redirigerPageLegaleSiBesoin(lang) {
  const page = pageLegaleCourante();
  if (!page) return false;
  const mapping = LEGAL_LANG_SISTER[page];
  if (!mapping || !mapping[lang]) return false;

  const dossier = dossierLangueCourant();
  let destination = mapping[lang];
  if (dossier) {
    destination = destination.startsWith(dossier + "/")
      ? destination.split("/").pop()
      : "../" + destination;
  }
  window.location.href = destination;
  return true;
}

document.addEventListener("DOMContentLoaded", mettreAJourLiensLegaux);
document.addEventListener("langchange", mettreAJourLiensLegaux);
