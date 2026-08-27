/* ============================================================
   Jen's & Floran — Annuaire coiffeurs (type n°14)
   ============================================================ */

(function () {
"use strict";

const LAND_SLUGS = [
  "baden-wuerttemberg",
  "bayern",
  "berlin",
  "brandenburg",
  "bremen",
  "hamburg",
  "hessen",
  "mecklenburg-vorpommern",
  "niedersachsen",
  "nordrhein-westfalen",
  "rheinland-pfalz",
  "saarland",
  "sachsen",
  "sachsen-anhalt",
  "schleswig-holstein",
  "thueringen",
];

let landSelectionne = "";
let coiffeursCache = [];
let clientConnecteCoiffeurs = false;
const editionNotesCoiffeur = new Set();
const selectionNotesCoiffeur = {};
let fermerDropdownLand = null;
let fichierPhotoCoiffeur = null;
let urlPhotoCoiffeur = "";
let formulaireInscriptionOuvert = false;

const COIFFEUR_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const COIFFEUR_PHOTO_TAILLE_MAX = 5 * 1024 * 1024;

function apiCoiffeurs() {
  if (typeof API_BASE_URL !== "undefined") return API_BASE_URL;
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:4000`;
  }
  return "https://jen-hair-api.onrender.com";
}

function echapperTexteCoiffeur(texte) {
  return String(texte ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function libelleLand(slug) {
  const cle = `states.${slug}`;
  const label = t(cle);
  return label === cle ? slug : label;
}

function urlMediaCoiffeuse(url) {
  const nettoyee = (url || "").trim();
  if (!nettoyee || !/^https:\/\//i.test(nettoyee)) return "";
  try {
    return encodeURI(decodeURI(nettoyee));
  } catch {
    return nettoyee.replace(/ /g, "%20");
  }
}

function initialesCoiffeur(nom) {
  return String(nom || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function avatarCoiffeurHtml(c) {
  const url = urlMediaCoiffeuse(c.profileImageUrl);
  const nom = echapperTexteCoiffeur(c.name);
  if (url) {
    return `<img class="coiffeuse-avatar" src="${echapperTexteCoiffeur(url)}" alt="${nom}" loading="lazy" />`;
  }
  return `<span class="coiffeuse-avatar coiffeuse-avatar--placeholder" aria-hidden="true">${echapperTexteCoiffeur(initialesCoiffeur(c.name))}</span>`;
}

function liensProfessionnelsHtml(links) {
  const liste = Array.isArray(links) ? links : [];
  if (!liste.length) {
    return `<span class="coiffeuse-muted">${t("coiffeurs.noProLinks")}</span>`;
  }

  return `<ul class="coiffeuse-pro-links">${liste
    .map((lien) => {
      const url = urlMediaCoiffeuse(lien.url);
      if (!url) return "";
      const label = echapperTexteCoiffeur(lien.label || t("coiffeurs.proLinkDefault"));
      return `<li><a class="coiffeuse-pro-link" href="${echapperTexteCoiffeur(url)}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
    })
    .filter(Boolean)
    .join("")}</ul>`;
}

function masquerRechercheTypeCoiffeurs() {
  const wrap = document.getElementById("type-search-wrap");
  const section = document.querySelector(".type-search-section");
  if (wrap) wrap.hidden = true;
  if (section) section.hidden = true;
}

function libelleLandSelectionne() {
  return landSelectionne ? libelleLand(landSelectionne) : t("coiffeurs.selectState");
}

function listeLandHtml() {
  return LAND_SLUGS.map((slug) => {
    const actif = slug === landSelectionne;
    return `<li class="coiffeuses-dropdown-item${actif ? " is-selected" : ""}" role="option" aria-selected="${actif}" data-slug="${slug}">${echapperTexteCoiffeur(libelleLand(slug))}</li>`;
  }).join("");
}

function menuDeroulantLandHtml() {
  return `
    <div class="coiffeuses-dropdown" id="coiffeurs-state-dropdown">
      <button
        type="button"
        class="coiffeuses-dropdown-trigger"
        id="coiffeurs-state-trigger"
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-controls="coiffeurs-state-list"
      >
        <span class="coiffeuses-dropdown-label">${echapperTexteCoiffeur(libelleLandSelectionne())}</span>
        <svg class="coiffeuses-dropdown-chevron" viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
          <path fill="currentColor" d="M1 1l5 5 5-5"></path>
        </svg>
      </button>
      <ul
        class="coiffeuses-dropdown-list"
        id="coiffeurs-state-list"
        role="listbox"
        aria-label="${echapperTexteCoiffeur(t("coiffeurs.stateLabel"))}"
        hidden
      >
        ${listeLandHtml()}
      </ul>
    </div>`;
}

function setDropdownOuvert(ouvert) {
  const dropdown = document.getElementById("coiffeurs-state-dropdown");
  const trigger = document.getElementById("coiffeurs-state-trigger");
  const list = document.getElementById("coiffeurs-state-list");
  if (!dropdown || !trigger || !list) return;

  dropdown.classList.toggle("is-open", ouvert);
  trigger.setAttribute("aria-expanded", ouvert ? "true" : "false");
  list.hidden = !ouvert;
}

function mettreAJourLibelleDropdown() {
  const label = document.querySelector(".coiffeuses-dropdown-label");
  if (label) label.textContent = libelleLandSelectionne();

  document.querySelectorAll(".coiffeuses-dropdown-item").forEach((item) => {
    const actif = item.dataset.slug === landSelectionne;
    item.classList.toggle("is-selected", actif);
    item.setAttribute("aria-selected", actif ? "true" : "false");
  });
}

function attacherMenuDeroulantLand() {
  const dropdown = document.getElementById("coiffeurs-state-dropdown");
  const trigger = document.getElementById("coiffeurs-state-trigger");
  const list = document.getElementById("coiffeurs-state-list");
  if (!dropdown || !trigger || !list) return;

  if (fermerDropdownLand) {
    document.removeEventListener("click", fermerDropdownLand);
    document.removeEventListener("keydown", fermerDropdownLand);
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    setDropdownOuvert(!dropdown.classList.contains("is-open"));
  });

  list.addEventListener("click", (e) => {
    const item = e.target.closest(".coiffeuses-dropdown-item");
    if (!item?.dataset.slug) return;
    landSelectionne = item.dataset.slug;
    formulaireInscriptionOuvert = false;
    mettreAJourLibelleDropdown();
    setDropdownOuvert(false);
    afficherCoiffeursLand(landSelectionne);
  });

  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setDropdownOuvert(true);
      list.querySelector(".coiffeuses-dropdown-item")?.focus();
    }
  });

  list.addEventListener("keydown", (e) => {
    const items = [...list.querySelectorAll(".coiffeuses-dropdown-item")];
    const index = items.indexOf(document.activeElement);

    if (e.key === "Escape") {
      e.preventDefault();
      setDropdownOuvert(false);
      trigger.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const suivant = items[Math.min(index + 1, items.length - 1)];
      suivant?.focus();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const precedent = items[Math.max(index - 1, 0)];
      precedent?.focus();
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const item = document.activeElement.closest(".coiffeuses-dropdown-item");
      if (!item?.dataset.slug) return;
      landSelectionne = item.dataset.slug;
      formulaireInscriptionOuvert = false;
      mettreAJourLibelleDropdown();
      setDropdownOuvert(false);
      trigger.focus();
      afficherCoiffeursLand(landSelectionne);
    }
  });

  list.querySelectorAll(".coiffeuses-dropdown-item").forEach((item) => {
    item.setAttribute("tabindex", "0");
  });

  fermerDropdownLand = (e) => {
    if (e.type === "keydown" && e.key !== "Escape") return;
    if (e.type === "click" && dropdown.contains(e.target)) return;
    setDropdownOuvert(false);
  };

  document.addEventListener("click", fermerDropdownLand);
  document.addEventListener("keydown", fermerDropdownLand);
}

function urlConnexionCoiffeurs() {
  const page = window.location.pathname.split("/").pop() || "type.html";
  const retour = encodeURIComponent(`${page}${window.location.search}`);
  if (typeof cheminPageCompte === "function") {
    return cheminPageCompte(`mode=login&return=${retour}`);
  }
  return `compte.html?mode=login&return=${retour}`;
}

function texteMoyenneNotesCoiffeur(c) {
  const count = Number(c.ratingCount) || 0;
  const avg = Number(c.averageRating) || 0;
  if (!count) return t("coiffeurs.ratingNone");
  const noteAffichee = avg % 1 === 0 ? String(avg) : avg.toFixed(1);
  return t("coiffeurs.ratingAverage", { avg: noteAffichee, count });
}

function estEnEditionNoteCoiffeur(c) {
  if (editionNotesCoiffeur.has(c.id)) return true;
  return !(Number(c.userRating) >= 1);
}

function noteBrouillonCoiffeur(c) {
  const brouillon = selectionNotesCoiffeur[c.id];
  if (brouillon >= 1) return brouillon;
  return Number(c.userRating) || 0;
}

function blocNotesCoiffeurHtml(c) {
  const moyenne = Math.round(Number(c.averageRating) || 0);
  const noteUtilisateur = Number(c.userRating) || 0;
  const enEdition = estEnEditionNoteCoiffeur(c);
  const noteSelectionnee = noteBrouillonCoiffeur(c);

  const affichageMoyenne = `
    <div class="coiffeuse-rating-summary">
      <span class="coiffeuse-label">${t("coiffeurs.rating")}</span>
      ${typeof etoilesHtml === "function" ? etoilesHtml(moyenne) : ""}
      <span class="coiffeuse-rating-meta">${echapperTexteCoiffeur(texteMoyenneNotesCoiffeur(c))}</span>
    </div>`;

  if (!clientConnecteCoiffeurs) {
    return `
      <div class="coiffeuse-rating" data-coiffeur-id="${echapperTexteCoiffeur(c.id)}">
        ${affichageMoyenne}
        <p class="coiffeuse-rating-login">
          ${t("coiffeurs.ratingLogin")}
          <a class="coiffeuse-link" href="${echapperTexteCoiffeur(urlConnexionCoiffeurs())}">${t("coiffeurs.ratingLoginBtn")}</a>
        </p>
      </div>`;
  }

  const blocVotreNote = enEdition
    ? `
      <div class="coiffeuse-rating-yours coiffeuse-rating-yours--edit">
        <span class="coiffeuse-label">${t("coiffeurs.ratingYours")}</span>
        <div class="coiffeuse-rating-stars-input">${typeof etoilesHtml === "function" ? etoilesHtml(noteSelectionnee, true) : ""}</div>
        <p class="coiffeuse-rating-hint">${t("coiffeurs.ratingSelectHint")}</p>
        <div class="coiffeuse-rating-actions">
          <button type="button" class="auth-btn auth-btn--fill coiffeuse-rating-save" data-coiffeur-id="${echapperTexteCoiffeur(c.id)}"${noteSelectionnee < 1 ? " disabled" : ""}>
            ${noteUtilisateur >= 1 ? t("coiffeurs.ratingKeep") : t("coiffeurs.ratingSave")}
          </button>
          ${
            noteUtilisateur >= 1
              ? `<button type="button" class="auth-btn auth-btn--outline coiffeuse-rating-cancel" data-coiffeur-id="${echapperTexteCoiffeur(c.id)}">${t("coiffeurs.ratingCancel")}</button>`
              : ""
          }
        </div>
      </div>`
    : `
      <div class="coiffeuse-rating-yours coiffeuse-rating-yours--saved">
        <span class="coiffeuse-label">${t("coiffeurs.ratingYours")}</span>
        ${typeof etoilesHtml === "function" ? etoilesHtml(noteUtilisateur) : ""}
        <span class="coiffeuse-rating-meta">${t("coiffeurs.ratingYoursValue", { n: noteUtilisateur })}</span>
        <button type="button" class="auth-btn auth-btn--outline coiffeuse-rating-modify" data-coiffeur-id="${echapperTexteCoiffeur(c.id)}">
          ${t("coiffeurs.ratingModify")}
        </button>
      </div>`;

  return `
    <div class="coiffeuse-rating" data-coiffeur-id="${echapperTexteCoiffeur(c.id)}" data-rating-mode="${enEdition ? "edit" : "view"}">
      ${affichageMoyenne}
      ${blocVotreNote}
      <p class="coiffeuse-rating-feedback" data-coiffeur-rating-feedback="${echapperTexteCoiffeur(c.id)}" hidden></p>
    </div>`;
}

function carteCoiffeur(c) {
  const tel = (c.phone || "").trim();
  const telHref = tel ? `tel:${tel.replace(/\s+/g, "")}` : "";
  const telHtml = tel
    ? `<a class="coiffeuse-link" href="${echapperTexteCoiffeur(telHref)}">${echapperTexteCoiffeur(tel)}</a>`
    : `<span class="coiffeuse-muted">${t("coiffeurs.noPhone")}</span>`;

  const adresse = (c.address || "").trim();
  const adresseHtml = adresse
    ? `<p class="coiffeuse-address">${echapperTexteCoiffeur(adresse)}</p>`
    : `<p class="coiffeuse-muted">${t("coiffeurs.noAddress")}</p>`;

  const deplacement = c.travelAvailable
    ? `<span class="coiffeuse-badge coiffeuse-badge--yes">${t("coiffeurs.travelYes")}</span>`
    : `<span class="coiffeuse-badge coiffeuse-badge--no">${t("coiffeurs.travelNo")}</span>`;

  const notes = (c.travelNotes || "").trim();
  const notesHtml = notes
    ? `<p class="coiffeuse-travel-notes">${echapperTexteCoiffeur(notes)}</p>`
    : "";

  const teinture = c.hairColoringAvailable
    ? `<span class="coiffeuse-badge coiffeuse-badge--yes">${t("coiffeurs.hairColoringYes")}</span>`
    : `<span class="coiffeuse-badge coiffeuse-badge--no">${t("coiffeurs.hairColoringNo")}</span>`;

  return `
    <article class="coiffeuse-card account-card" data-coiffeur-id="${echapperTexteCoiffeur(c.id)}">
      <div class="coiffeuse-card-head">
        ${avatarCoiffeurHtml(c)}
        <h3 class="coiffeuse-name">${echapperTexteCoiffeur(c.name)}</h3>
      </div>
      ${blocNotesCoiffeurHtml(c)}
      <ul class="coiffeuse-meta">
        <li>
          <span class="coiffeuse-label">${t("coiffeurs.proLinks")}</span>
          ${liensProfessionnelsHtml(c.professionalLinks)}
        </li>
        <li>
          <span class="coiffeuse-label">${t("coiffeurs.phone")}</span>
          ${telHtml}
        </li>
        <li>
          <span class="coiffeuse-label">${t("coiffeurs.address")}</span>
          ${adresseHtml}
        </li>
        <li>
          <span class="coiffeuse-label">${t("coiffeurs.travel")}</span>
          ${deplacement}
          ${notesHtml}
        </li>
        <li>
          <span class="coiffeuse-label">${t("coiffeurs.hairColoring")}</span>
          ${teinture}
        </li>
      </ul>
    </article>`;
}

function listeCoiffeursHtml(liste) {
  if (!landSelectionne) {
    return `<p class="account-empty">${t("coiffeurs.pickState")}</p>`;
  }
  if (!liste.length) {
    return `<p class="account-empty">${t("coiffeurs.empty")}</p>`;
  }
  return `<div class="coiffeuses-list">${liste.map(carteCoiffeur).join("")}</div>`;
}

async function actualiserConnexionCoiffeurs() {
  if (typeof obtenirUtilisateur !== "function") {
    clientConnecteCoiffeurs = false;
    return false;
  }
  const user = await obtenirUtilisateur();
  clientConnecteCoiffeurs = Boolean(user);
  return clientConnecteCoiffeurs;
}

async function chargerCoiffeurs(land) {
  const headers = {};
  if (typeof obtenirTokenAuth === "function") {
    const token = await obtenirTokenAuth();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const reponse = await fetch(
    `${apiCoiffeurs()}/api/barbers?state=${encodeURIComponent(land)}`,
    { cache: "no-store", headers }
  );
  const data = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new Error(data?.error || t("coiffeurs.loadError"));
  }
  return data.barbers || [];
}

async function afficherCoiffeursLand(land) {
  const listeEl = document.getElementById("coiffeurs-list");
  if (!listeEl) return;

  mettreAJourSectionInscription(land);

  if (!land) {
    coiffeursCache = [];
    listeEl.innerHTML = listeCoiffeursHtml([]);
    return;
  }

  listeEl.innerHTML = `<p class="account-loading">${t("coiffeurs.loading")}</p>`;

  try {
    await actualiserConnexionCoiffeurs();
    editionNotesCoiffeur.clear();
    Object.keys(selectionNotesCoiffeur).forEach((id) => delete selectionNotesCoiffeur[id]);
    coiffeursCache = await chargerCoiffeurs(land);
    listeEl.innerHTML = listeCoiffeursHtml(coiffeursCache);
    attacherNotesCoiffeurs();
  } catch (err) {
    listeEl.innerHTML = `<p class="account-empty">${err.message}</p>`;
  }
}

function lireLandDepuisUrl() {
  try {
    const land = new URLSearchParams(window.location.search).get("land") || "";
    return LAND_SLUGS.includes(land) ? land : "";
  } catch {
    return "";
  }
}

function ouvrirFormulaireInscription() {
  if (!landSelectionne) return;
  formulaireInscriptionOuvert = true;
  mettreAJourSectionInscription(landSelectionne);
  document.getElementById("coiffeurs-register-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function fermerFormulaireInscription() {
  formulaireInscriptionOuvert = false;
  mettreAJourSectionInscription(landSelectionne);
}

function reinitialiserPhotoProfilCoiffeur() {
  fichierPhotoCoiffeur = null;
  urlPhotoCoiffeur = "";
  const input = document.getElementById("coiffeurs-profile-photo");
  const hidden = document.getElementById("coiffeurs-profile-image-url");
  const preview = document.getElementById("coiffeurs-profile-photo-preview");
  if (input) input.value = "";
  if (hidden) hidden.value = "";
  if (preview) {
    preview.querySelectorAll("img[src^='blob:']").forEach((img) => URL.revokeObjectURL(img.src));
    preview.innerHTML = "";
    preview.hidden = true;
  }
}

function validerFichierPhotoCoiffeur(fichier) {
  if (!fichier) throw new Error(t("coiffeurs.profilePhotoRequired"));
  if (!COIFFEUR_PHOTO_TYPES.includes(fichier.type)) {
    throw new Error(t("coiffeurs.profilePhotoInvalidType"));
  }
  if (fichier.size > COIFFEUR_PHOTO_TAILLE_MAX) {
    throw new Error(t("coiffeurs.profilePhotoTooLarge"));
  }
  return fichier;
}

function rendreApercuPhotoProfilCoiffeur(fichier) {
  const preview = document.getElementById("coiffeurs-profile-photo-preview");
  if (!preview) return;

  preview.querySelectorAll("img[src^='blob:']").forEach((img) => URL.revokeObjectURL(img.src));

  if (!fichier) {
    preview.innerHTML = "";
    preview.hidden = true;
    return;
  }

  preview.hidden = false;
  preview.innerHTML = `
    <figure class="coiffeuses-photo-preview-figure">
      <img src="${URL.createObjectURL(fichier)}" alt="" />
      <button type="button" class="coiffeuses-photo-remove" id="coiffeurs-profile-photo-remove" aria-label="${echapperTexteCoiffeur(t("coiffeurs.profilePhotoRemove"))}">×</button>
    </figure>`;
}

async function uploaderPhotoProfilCoiffeur(fichier) {
  const formData = new FormData();
  formData.append("photo", fichier);

  const reponse = await fetch(`${apiCoiffeurs()}/api/barbers/upload-photo`, {
    method: "POST",
    body: formData,
  });
  const data = await reponse.json().catch(() => ({}));

  if (!reponse.ok) {
    throw new Error(data?.error || t("coiffeurs.profilePhotoUploadError"));
  }

  if (!data?.url) {
    throw new Error(t("coiffeurs.profilePhotoUploadError"));
  }

  return data.url;
}

function htmlLienProInscription(index) {
  return `
    <div class="coiffeuses-pro-link-row" data-pro-index="${index}">
      <label class="field coiffeuses-pro-link-field">
        <span>${t("coiffeurs.proLinkUrl")} *</span>
        <input type="url" name="proUrl_${index}" class="coiffeuses-input" required maxlength="500" placeholder="https://" inputmode="url" />
      </label>
      <label class="field coiffeuses-pro-link-field">
        <span>${t("coiffeurs.proLinkLabel")}</span>
        <input type="text" name="proLabel_${index}" class="coiffeuses-input" maxlength="80" placeholder="${echapperTexteCoiffeur(t("coiffeurs.proLinkLabelHint"))}" />
      </label>
      ${index > 0 ? `<button type="button" class="coiffeuses-remove-link" data-remove-pro="${index}" aria-label="${echapperTexteCoiffeur(t("coiffeurs.removeProLink"))}">×</button>` : ""}
    </div>`;
}

function initialiserLiensProInscription() {
  const liste = document.getElementById("coiffeurs-pro-links-list");
  if (!liste) return;
  liste.innerHTML = htmlLienProInscription(0);
}

function ajouterLienProInscription() {
  const liste = document.getElementById("coiffeurs-pro-links-list");
  if (!liste) return;
  const count = liste.querySelectorAll(".coiffeuses-pro-link-row").length;
  if (count >= 12) return;
  liste.insertAdjacentHTML("beforeend", htmlLienProInscription(count));
}

function retirerLienProInscription(index) {
  const liste = document.getElementById("coiffeurs-pro-links-list");
  const row = liste?.querySelector(`[data-pro-index="${index}"]`);
  row?.remove();
}

function mettreAJourSectionInscription(land) {
  const section = document.getElementById("coiffeurs-register-section");
  const cta = document.getElementById("coiffeurs-register-cta");
  const prompt = document.getElementById("coiffeurs-register-prompt");
  const stateName = document.getElementById("coiffeurs-register-state-name");
  const stateNameCta = document.getElementById("coiffeurs-register-state-name-cta");
  const stateSlugInput = document.getElementById("coiffeurs-register-state-slug");

  if (!section || !prompt || !cta) return;

  if (stateName) stateName.textContent = land ? libelleLand(land) : "";
  if (stateNameCta) stateNameCta.textContent = land ? libelleLand(land) : "";
  if (stateSlugInput) stateSlugInput.value = land || "";

  if (!land) {
    formulaireInscriptionOuvert = false;
    section.hidden = true;
    cta.hidden = true;
    prompt.hidden = false;
    return;
  }

  prompt.hidden = true;

  if (formulaireInscriptionOuvert) {
    section.hidden = false;
    cta.hidden = true;
  } else {
    section.hidden = true;
    cta.hidden = false;
  }
}

function lireLiensProDepuisFormulaire(form) {
  const liste = form.querySelectorAll(".coiffeuses-pro-link-row");
  const links = [];

  liste.forEach((row) => {
    const index = row.dataset.proIndex;
    const url = form.querySelector(`[name="proUrl_${index}"]`)?.value.trim() || "";
    const label = form.querySelector(`[name="proLabel_${index}"]`)?.value.trim() || "";
    if (!url) return;
    links.push({ url, ...(label ? { label } : {}) });
  });

  return links;
}

function messageErreurReponseInscriptionCoiffeur(data) {
  if (!data) return t("coiffeurs.registerError");

  const erreurServeur = String(data.error || "").trim();
  if (erreurServeur && erreurServeur !== "Données invalides") {
    return erreurServeur;
  }

  const fieldErrors = data.details?.fieldErrors || {};
  const ordreChamps = [
    "stateSlug",
    "name",
    "email",
    "phone",
    "address",
    "travelAvailable",
    "travelNotes",
    "hairColoringAvailable",
    "profileImageUrl",
    "professionalLinks",
  ];

  for (const champ of ordreChamps) {
    const messages = fieldErrors[champ];
    if (messages?.length) {
      const cle = `coiffeurs.validation.${champ}`;
      const traduit = t(cle);
      if (traduit !== cle) return traduit;
      return messages[0];
    }
  }

  for (const [cle, messages] of Object.entries(fieldErrors)) {
    if (!messages?.length) continue;
    if (cle.startsWith("professionalLinks")) {
      return t("coiffeurs.validation.professionalLinks");
    }
    const base = cle.split(".")[0];
    const cleI18n = `coiffeurs.validation.${base}`;
    const traduit = t(cleI18n);
    if (traduit !== cleI18n) return traduit;
    return messages[0];
  }

  return t("coiffeurs.registerErrorGeneric");
}

function validerRadiosObligatoires(form) {
  const travel = form.querySelector('input[name="travelAvailable"]:checked');
  const teinture = form.querySelector('input[name="hairColoringAvailable"]:checked');
  if (!travel) return t("coiffeurs.validation.travelAvailable");
  if (!teinture) return t("coiffeurs.validation.hairColoringAvailable");
  return "";
}

async function soumettreInscriptionCoiffeur(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const messageEl = document.getElementById("coiffeurs-register-message");
  const submitBtn = document.getElementById("coiffeurs-register-submit");

  if (!form.reportValidity()) return;

  const erreurRadios = validerRadiosObligatoires(form);
  if (erreurRadios) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.className = "account-message account-message--error";
      messageEl.textContent = erreurRadios;
    }
    return;
  }

  const fd = new FormData(form);
  const stateSlug = fd.get("stateSlug");
  if (!stateSlug) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.className = "account-message account-message--error";
      messageEl.textContent = t("coiffeurs.registerPickState");
    }
    return;
  }

  const professionalLinks = lireLiensProDepuisFormulaire(form);
  if (!professionalLinks.length) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.className = "account-message account-message--error";
      messageEl.textContent = t("coiffeurs.proLinkRequired");
    }
    return;
  }

  if (!fichierPhotoCoiffeur && !urlPhotoCoiffeur) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.className = "account-message account-message--error";
      messageEl.textContent = t("coiffeurs.profilePhotoRequired");
    }
    return;
  }

  if (messageEl) messageEl.hidden = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = t("coiffeurs.registerSending");
  }

  let profileImageUrl = urlPhotoCoiffeur;

  try {
    if (fichierPhotoCoiffeur) {
      if (submitBtn) submitBtn.textContent = t("coiffeurs.profilePhotoUploading");
      profileImageUrl = await uploaderPhotoProfilCoiffeur(fichierPhotoCoiffeur);
      urlPhotoCoiffeur = profileImageUrl;
    }

    const hiddenUrl = document.getElementById("coiffeurs-profile-image-url");
    if (hiddenUrl) hiddenUrl.value = profileImageUrl;

    if (submitBtn) submitBtn.textContent = t("coiffeurs.registerSending");

    const payload = {
      stateSlug: String(stateSlug),
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim().toLowerCase(),
      phone: String(fd.get("phone") || "").trim(),
      address: String(fd.get("address") || "").trim(),
      travelAvailable: fd.get("travelAvailable") === "yes",
      travelNotes: String(fd.get("travelNotes") || "").trim(),
      hairColoringAvailable: fd.get("hairColoringAvailable") === "yes",
      profileImageUrl,
      professionalLinks,
      companyWebsite: String(fd.get("companyWebsite") || "").trim(),
      locale: typeof langueActuelle !== "undefined" ? langueActuelle : "fr",
    };

    const reponse = await fetch(`${apiCoiffeurs()}/api/barbers/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await reponse.json().catch(() => ({}));

    if (!reponse.ok) {
      throw new Error(messageErreurReponseInscriptionCoiffeur(data));
    }

    form.reset();
    initialiserLiensProInscription();
    reinitialiserPhotoProfilCoiffeur();
    formulaireInscriptionOuvert = false;
    const slugInput = document.getElementById("coiffeurs-register-state-slug");
    if (slugInput) slugInput.value = landSelectionne;
    mettreAJourSectionInscription(landSelectionne);

    if (messageEl) {
      messageEl.hidden = false;
      messageEl.className = "account-message account-message--success";
      messageEl.textContent = t("coiffeurs.registerSuccess");
    }
  } catch (err) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.className = "account-message account-message--error";
      messageEl.textContent = err.message;
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = t("coiffeurs.registerSubmit");
    }
  }
}

function mettreAJourCarteCoiffeurDansDom(coiffeur, feedback) {
  const carte = document.querySelector(`.coiffeuse-card[data-coiffeur-id="${coiffeur.id}"]`);
  if (!carte) return;
  const bloc = carte.querySelector(".coiffeuse-rating");
  if (bloc) {
    bloc.outerHTML = blocNotesCoiffeurHtml(coiffeur);
  }
  if (feedback?.text) {
    afficherFeedbackNoteCoiffeur(coiffeur.id, feedback.text, feedback.type || "info");
  }
}

function afficherFeedbackNoteCoiffeur(id, texte, type = "info") {
  const el = document.querySelector(`[data-coiffeur-rating-feedback="${id}"]`);
  if (!el) return;
  el.hidden = !texte;
  el.textContent = texte;
  el.className = `coiffeuse-rating-feedback coiffeuse-rating-feedback--${type}`;
}

function activerEditionNoteCoiffeur(coiffeurId) {
  const coiffeur = coiffeursCache.find((c) => c.id === coiffeurId);
  if (!coiffeuse) return;
  editionNotesCoiffeur.add(coiffeurId);
  selectionNotesCoiffeur[coiffeurId] = Number(coiffeur.userRating) || 0;
  mettreAJourCarteCoiffeurDansDom(coiffeuse);
}

function annulerEditionNoteCoiffeur(coiffeurId) {
  editionNotesCoiffeur.delete(coiffeurId);
  delete selectionNotesCoiffeur[coiffeurId];
  const coiffeur = coiffeursCache.find((c) => c.id === coiffeurId);
  if (coiffeur) mettreAJourCarteCoiffeurDansDom(coiffeur);
}

async function envoyerNoteCoiffeur(coiffeurId, rating) {
  const token =
    typeof obtenirTokenAuth === "function" ? await obtenirTokenAuth() : null;
  if (!token) {
    window.location.href = urlConnexionCoiffeurs();
    return;
  }

  const saveBtn = document.querySelector(
    `.coiffeuse-rating-save[data-coiffeur-id="${coiffeurId}"]`
  );
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = t("coiffeurs.ratingSending");
  }
  afficherFeedbackNoteCoiffeur(coiffeurId, "");

  const reponse = await fetch(`${apiCoiffeurs()}/api/barbers/${coiffeurId}/rate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rating }),
  });
  const data = await reponse.json().catch(() => ({}));

  if (!reponse.ok) {
    const message =
      reponse.status === 403
        ? t("coiffeurs.ratingSelfBlocked")
        : data?.error || t("coiffeurs.ratingError");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent =
        Number(coiffeursCache.find((c) => c.id === coiffeurId)?.userRating) >= 1
          ? t("coiffeurs.ratingKeep")
          : t("coiffeurs.ratingSave");
    }
    afficherFeedbackNoteCoiffeur(coiffeurId, message, "error");
    return;
  }

  editionNotesCoiffeur.delete(coiffeurId);
  delete selectionNotesCoiffeur[coiffeurId];

  coiffeursCache = coiffeursCache.map((c) =>
    c.id === coiffeurId
      ? {
          ...c,
          averageRating: data.averageRating ?? c.averageRating,
          ratingCount: data.ratingCount ?? c.ratingCount,
          userRating: data.userRating ?? rating,
        }
      : c
  );

  const miseAJour = coiffeursCache.find((c) => c.id === coiffeurId);
  if (miseAJour) {
    mettreAJourCarteCoiffeurDansDom(miseAJour, {
      text: t("coiffeurs.ratingSaved"),
      type: "success",
    });
  }
}

function attacherNotesCoiffeurs() {
  const liste = document.getElementById("coiffeurs-list");
  if (!liste || liste.dataset.ratingBound === "1") return;
  liste.dataset.ratingBound = "1";

  liste.addEventListener("click", (e) => {
    const saveBtn = e.target.closest(".coiffeuse-rating-save");
    if (saveBtn) {
      if (!clientConnecteCoiffeurs) {
        window.location.href = urlConnexionCoiffeurs();
        return;
      }
      const coiffeurId = saveBtn.dataset.coiffeurId;
      const rating = selectionNotesCoiffeur[coiffeurId] || 0;
      if (!coiffeurId || rating < 1) return;
      envoyerNoteCoiffeur(coiffeurId, rating);
      return;
    }

    const modifyBtn = e.target.closest(".coiffeuse-rating-modify");
    if (modifyBtn?.dataset.coiffeurId) {
      activerEditionNoteCoiffeur(modifyBtn.dataset.coiffeurId);
      return;
    }

    const cancelBtn = e.target.closest(".coiffeuse-rating-cancel");
    if (cancelBtn?.dataset.coiffeurId) {
      annulerEditionNoteCoiffeur(cancelBtn.dataset.coiffeurId);
      return;
    }

    const starBtn = e.target.closest(".coiffeuse-rating-yours--edit .avis-star-btn");
    if (!starBtn) return;

    if (!clientConnecteCoiffeurs) {
      window.location.href = urlConnexionCoiffeurs();
      return;
    }

    const bloc = starBtn.closest(".coiffeuse-rating");
    const coiffeurId = bloc?.dataset.coiffeurId;
    const rating = Number(starBtn.dataset.star) || 0;
    if (!coiffeurId || rating < 1) return;

    selectionNotesCoiffeur[coiffeurId] = rating;
    const coiffeur = coiffeursCache.find((c) => c.id === coiffeurId);
    if (coiffeur) mettreAJourCarteCoiffeurDansDom(coiffeur);
  });
}

function attacherFormulaireInscription() {
  const form = document.getElementById("coiffeurs-register-form");
  form?.addEventListener("submit", soumettreInscriptionCoiffeur);

  document.getElementById("coiffeurs-add-pro-link")?.addEventListener("click", () => {
    ajouterLienProInscription();
  });

  document.getElementById("coiffeurs-pro-links-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-pro]");
    if (!btn) return;
    retirerLienProInscription(btn.dataset.removePro);
  });

  document.getElementById("coiffeurs-open-register")?.addEventListener("click", () => {
    ouvrirFormulaireInscription();
  });

  document.getElementById("coiffeurs-close-register")?.addEventListener("click", () => {
    fermerFormulaireInscription();
  });

  document.getElementById("coiffeurs-profile-photo")?.addEventListener("change", (e) => {
    const messageEl = document.getElementById("coiffeurs-register-message");
    if (messageEl) messageEl.hidden = true;

    try {
      const fichier = e.target.files?.[0];
      if (!fichier) {
        reinitialiserPhotoProfilCoiffeur();
        return;
      }
      fichierPhotoCoiffeur = validerFichierPhotoCoiffeur(fichier);
      urlPhotoCoiffeur = "";
      rendreApercuPhotoProfilCoiffeur(fichierPhotoCoiffeur);
    } catch (err) {
      reinitialiserPhotoProfilCoiffeur();
      if (messageEl) {
        messageEl.hidden = false;
        messageEl.className = "account-message account-message--error";
        messageEl.textContent = err.message;
      }
    }
  });

  document.getElementById("coiffeurs-register-form")?.addEventListener("click", (e) => {
    if (e.target.id === "coiffeurs-profile-photo-remove") {
      reinitialiserPhotoProfilCoiffeur();
    }
  });

  initialiserLiensProInscription();
  mettreAJourSectionInscription(landSelectionne);
}

function pageCoiffeursHtml() {
  return `
    <section class="coiffeuses-intro account-card">
      <h2 class="coiffeuses-title">${t("coiffeurs.title")}</h2>
      <p class="coiffeuses-lead">${t("coiffeurs.lead")}</p>
      <div class="field coiffeuses-state-field">
        <span class="coiffeuses-state-label">${t("coiffeurs.stateLabel")}</span>
        ${menuDeroulantLandHtml()}
      </div>
    </section>
    <section id="coiffeurs-register-area" class="coiffeuses-register-area">
      <section id="coiffeurs-register-prompt" class="coiffeuses-register-prompt account-card">
        <p class="account-empty">${t("coiffeurs.registerPickState")}</p>
      </section>
      <section id="coiffeurs-register-cta" class="coiffeuses-register-cta account-card" hidden>
        <h2 class="coiffeuses-results-title">${t("coiffeurs.registerTitle")}</h2>
        <p class="coiffeuses-lead">${t("coiffeurs.registerCtaLead")}</p>
        <p class="coiffeuses-register-state">
          <span class="coiffeuses-label">${t("coiffeurs.stateLabel")}</span>
          <strong id="coiffeurs-register-state-name-cta"></strong>
        </p>
        <button type="button" id="coiffeurs-open-register" class="btn-order account-submit coiffeuses-open-register">
          ${t("coiffeurs.registerOpenBtn")}
        </button>
      </section>
      <section id="coiffeurs-register-section" class="coiffeuses-register account-card" hidden>
      <h2 class="coiffeuses-results-title">${t("coiffeurs.registerTitle")}</h2>
      <p class="coiffeuses-lead">${t("coiffeurs.registerLead")}</p>
      <p class="coiffeuses-register-state">
        <span class="coiffeuses-label">${t("coiffeurs.stateLabel")}</span>
        <strong id="coiffeurs-register-state-name"></strong>
      </p>
      <form id="coiffeurs-register-form" class="coiffeuses-register-form account-form" novalidate>
        <input type="hidden" name="stateSlug" id="coiffeurs-register-state-slug" value="" />
        <div class="coiffeuses-honeypot" aria-hidden="true">
          <label>
            <span>Site web</span>
            <input type="text" name="companyWebsite" tabindex="-1" autocomplete="off" />
          </label>
        </div>
        <label class="field">
          <span>${t("coiffeurs.name")} *</span>
          <input class="coiffeuses-input" type="text" name="name" required minlength="2" maxlength="120" autocomplete="name" />
        </label>
        <label class="field">
          <span>${t("coiffeurs.email")} *</span>
          <input class="coiffeuses-input" type="email" name="email" required maxlength="200" autocomplete="email" inputmode="email" placeholder="${echapperTexteCoiffeur(t("coiffeurs.emailHint"))}" />
        </label>
        <label class="field">
          <span>${t("coiffeurs.phone")} *</span>
          <input class="coiffeuses-input" type="tel" name="phone" required minlength="3" maxlength="40" autocomplete="tel" />
        </label>
        <label class="field coiffeuses-field--large">
          <span>${t("coiffeurs.address")} *</span>
          <textarea class="coiffeuses-textarea coiffeuses-textarea--large" name="address" required minlength="5" maxlength="500" rows="4" autocomplete="street-address" placeholder="${echapperTexteCoiffeur(t("coiffeurs.addressHint"))}"></textarea>
        </label>
        <fieldset class="coiffeuses-fieldset">
          <legend>${t("coiffeurs.travel")} *</legend>
          <div class="coiffeuses-radio-group">
            <label class="coiffeuses-radio">
              <input type="radio" name="travelAvailable" value="yes" required />
              <span>${t("coiffeurs.travelYes")}</span>
            </label>
            <label class="coiffeuses-radio">
              <input type="radio" name="travelAvailable" value="no" required />
              <span>${t("coiffeurs.travelNo")}</span>
            </label>
          </div>
        </fieldset>
        <label class="field coiffeuses-field--large">
          <span>${t("coiffeurs.travelNotes")} *</span>
          <textarea class="coiffeuses-textarea coiffeuses-textarea--xlarge" name="travelNotes" required minlength="2" maxlength="500" rows="5" placeholder="${echapperTexteCoiffeur(t("coiffeurs.travelNotesHint"))}"></textarea>
        </label>
        <fieldset class="coiffeuses-fieldset">
          <legend>${t("coiffeurs.hairColoring")} *</legend>
          <div class="coiffeuses-radio-group">
            <label class="coiffeuses-radio">
              <input type="radio" name="hairColoringAvailable" value="yes" required />
              <span>${t("coiffeurs.hairColoringYes")}</span>
            </label>
            <label class="coiffeuses-radio">
              <input type="radio" name="hairColoringAvailable" value="no" required />
              <span>${t("coiffeurs.hairColoringNo")}</span>
            </label>
          </div>
        </fieldset>
        <fieldset class="coiffeuses-photo-field">
          <legend>${t("coiffeurs.profilePhoto")} *</legend>
          <p class="coiffeuses-field-hint">${t("coiffeurs.profilePhotoUploadHint")}</p>
          <label class="coiffeuses-photo-upload">
            <input type="file" id="coiffeurs-profile-photo" accept="image/jpeg,image/png,image/webp" />
            <span class="coiffeuses-photo-upload-btn">${t("coiffeurs.profilePhotoChoose")}</span>
          </label>
          <div id="coiffeurs-profile-photo-preview" class="coiffeuses-photo-preview-wrap" hidden></div>
          <input type="hidden" name="profileImageUrl" id="coiffeurs-profile-image-url" value="" />
        </fieldset>
        <div class="coiffeuses-pro-links-field">
          <span class="coiffeuses-pro-links-label">${t("coiffeurs.proLinks")} *</span>
          <div id="coiffeurs-pro-links-list" class="coiffeuses-pro-links-list"></div>
          <button type="button" id="coiffeurs-add-pro-link" class="auth-btn auth-btn--outline coiffeuses-add-link">${t("coiffeurs.addProLink")}</button>
        </div>
        <button type="submit" class="btn-order account-submit" id="coiffeurs-register-submit">${t("coiffeurs.registerSubmit")}</button>
        <button type="button" id="coiffeurs-close-register" class="auth-btn auth-btn--outline coiffeuses-close-register">${t("coiffeurs.registerClose")}</button>
        <p id="coiffeurs-register-message" class="account-message" hidden></p>
      </form>
    </section>
    </section>
    <section class="coiffeuses-results">
      <h2 class="coiffeuses-results-title">${t("coiffeurs.resultsTitle")}</h2>
      <div id="coiffeurs-list" class="coiffeuses-list-wrap">
        <p class="account-empty">${t("coiffeurs.pickState")}</p>
      </div>
    </section>`;
}

async function rendrePageCoiffeurs() {
  masquerRechercheTypeCoiffeurs();

  const grille = document.getElementById("type-grid");
  if (!grille) return;

  if (fermerDropdownLand) {
    document.removeEventListener("click", fermerDropdownLand);
    document.removeEventListener("keydown", fermerDropdownLand);
    fermerDropdownLand = null;
  }

  grille.className = "coiffeuses-page";
  grille.innerHTML = pageCoiffeursHtml();

  const landUrl = lireLandDepuisUrl();
  if (landUrl) landSelectionne = landUrl;

  attacherMenuDeroulantLand();
  attacherFormulaireInscription();

  if (landSelectionne) {
    mettreAJourLibelleDropdown();
    await afficherCoiffeursLand(landSelectionne);
  } else {
    mettreAJourSectionInscription("");
  }
}

window.rendrePageCoiffeurs = rendrePageCoiffeurs;

document.addEventListener("langchange", () => {
  if (typeof etatType !== "undefined" && etatType.coiffeurs) {
    rendrePageCoiffeurs();
  }
});

document.addEventListener("authchange", () => {
  if (typeof etatType !== "undefined" && etatType.coiffeurs && landSelectionne) {
    afficherCoiffeursLand(landSelectionne);
  }
});

})();
