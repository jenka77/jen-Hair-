/* ============================================================
   Jen's & Floran — Annuaire coiffeuses (type n°13)
   ============================================================ */

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
let coiffeusesCache = [];
let fermerDropdownLand = null;
let fichierPhotoCoiffeuse = null;
let urlPhotoCoiffeuse = "";

const COIFFEUSE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const COIFFEUSE_PHOTO_TAILLE_MAX = 5 * 1024 * 1024;

function apiCoiffeuses() {
  if (typeof API_BASE_URL !== "undefined") return API_BASE_URL;
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:4000`;
  }
  return "https://jen-hair-api.onrender.com";
}

function echapperTexteCoiffeuse(texte) {
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

function initialesCoiffeuse(nom) {
  return String(nom || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function avatarCoiffeuseHtml(c) {
  const url = urlMediaCoiffeuse(c.profileImageUrl);
  const nom = echapperTexteCoiffeuse(c.name);
  if (url) {
    return `<img class="coiffeuse-avatar" src="${echapperTexteCoiffeuse(url)}" alt="${nom}" loading="lazy" />`;
  }
  return `<span class="coiffeuse-avatar coiffeuse-avatar--placeholder" aria-hidden="true">${echapperTexteCoiffeuse(initialesCoiffeuse(c.name))}</span>`;
}

function liensProfessionnelsHtml(links) {
  const liste = Array.isArray(links) ? links : [];
  if (!liste.length) {
    return `<span class="coiffeuse-muted">${t("coiffeuses.noProLinks")}</span>`;
  }

  return `<ul class="coiffeuse-pro-links">${liste
    .map((lien) => {
      const url = urlMediaCoiffeuse(lien.url);
      if (!url) return "";
      const label = echapperTexteCoiffeuse(lien.label || t("coiffeuses.proLinkDefault"));
      return `<li><a class="coiffeuse-pro-link" href="${echapperTexteCoiffeuse(url)}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
    })
    .filter(Boolean)
    .join("")}</ul>`;
}

function masquerRechercheTypeCoiffeuses() {
  const wrap = document.getElementById("type-search-wrap");
  const section = document.querySelector(".type-search-section");
  if (wrap) wrap.hidden = true;
  if (section) section.hidden = true;
}

function libelleLandSelectionne() {
  return landSelectionne ? libelleLand(landSelectionne) : t("coiffeuses.selectState");
}

function listeLandHtml() {
  return LAND_SLUGS.map((slug) => {
    const actif = slug === landSelectionne;
    return `<li class="coiffeuses-dropdown-item${actif ? " is-selected" : ""}" role="option" aria-selected="${actif}" data-slug="${slug}">${echapperTexteCoiffeuse(libelleLand(slug))}</li>`;
  }).join("");
}

function menuDeroulantLandHtml() {
  return `
    <div class="coiffeuses-dropdown" id="coiffeuses-state-dropdown">
      <button
        type="button"
        class="coiffeuses-dropdown-trigger"
        id="coiffeuses-state-trigger"
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-controls="coiffeuses-state-list"
      >
        <span class="coiffeuses-dropdown-label">${echapperTexteCoiffeuse(libelleLandSelectionne())}</span>
        <svg class="coiffeuses-dropdown-chevron" viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
          <path fill="currentColor" d="M1 1l5 5 5-5"></path>
        </svg>
      </button>
      <ul
        class="coiffeuses-dropdown-list"
        id="coiffeuses-state-list"
        role="listbox"
        aria-label="${echapperTexteCoiffeuse(t("coiffeuses.stateLabel"))}"
        hidden
      >
        ${listeLandHtml()}
      </ul>
    </div>`;
}

function setDropdownOuvert(ouvert) {
  const dropdown = document.getElementById("coiffeuses-state-dropdown");
  const trigger = document.getElementById("coiffeuses-state-trigger");
  const list = document.getElementById("coiffeuses-state-list");
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
  const dropdown = document.getElementById("coiffeuses-state-dropdown");
  const trigger = document.getElementById("coiffeuses-state-trigger");
  const list = document.getElementById("coiffeuses-state-list");
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
    mettreAJourLibelleDropdown();
    setDropdownOuvert(false);
    afficherCoiffeusesLand(landSelectionne);
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
      mettreAJourLibelleDropdown();
      setDropdownOuvert(false);
      trigger.focus();
      afficherCoiffeusesLand(landSelectionne);
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

function carteCoiffeuse(c) {
  const tel = (c.phone || "").trim();
  const telHref = tel ? `tel:${tel.replace(/\s+/g, "")}` : "";
  const telHtml = tel
    ? `<a class="coiffeuse-link" href="${echapperTexteCoiffeuse(telHref)}">${echapperTexteCoiffeuse(tel)}</a>`
    : `<span class="coiffeuse-muted">${t("coiffeuses.noPhone")}</span>`;

  const adresse = (c.address || "").trim();
  const adresseHtml = adresse
    ? `<p class="coiffeuse-address">${echapperTexteCoiffeuse(adresse)}</p>`
    : `<p class="coiffeuse-muted">${t("coiffeuses.noAddress")}</p>`;

  const deplacement = c.travelAvailable
    ? `<span class="coiffeuse-badge coiffeuse-badge--yes">${t("coiffeuses.travelYes")}</span>`
    : `<span class="coiffeuse-badge coiffeuse-badge--no">${t("coiffeuses.travelNo")}</span>`;

  const notes = (c.travelNotes || "").trim();
  const notesHtml = notes
    ? `<p class="coiffeuse-travel-notes">${echapperTexteCoiffeuse(notes)}</p>`
    : "";

  const wigInstall = c.wigInstallCustomisation
    ? `<span class="coiffeuse-badge coiffeuse-badge--yes">${t("coiffeuses.wigInstallYes")}</span>`
    : `<span class="coiffeuse-badge coiffeuse-badge--no">${t("coiffeuses.wigInstallNo")}</span>`;

  return `
    <article class="coiffeuse-card account-card">
      <div class="coiffeuse-card-head">
        ${avatarCoiffeuseHtml(c)}
        <h3 class="coiffeuse-name">${echapperTexteCoiffeuse(c.name)}</h3>
      </div>
      <ul class="coiffeuse-meta">
        <li>
          <span class="coiffeuse-label">${t("coiffeuses.proLinks")}</span>
          ${liensProfessionnelsHtml(c.professionalLinks)}
        </li>
        <li>
          <span class="coiffeuse-label">${t("coiffeuses.phone")}</span>
          ${telHtml}
        </li>
        <li>
          <span class="coiffeuse-label">${t("coiffeuses.address")}</span>
          ${adresseHtml}
        </li>
        <li>
          <span class="coiffeuse-label">${t("coiffeuses.travel")}</span>
          ${deplacement}
          ${notesHtml}
        </li>
        <li>
          <span class="coiffeuse-label">${t("coiffeuses.wigInstall")}</span>
          ${wigInstall}
        </li>
      </ul>
    </article>`;
}

function listeCoiffeusesHtml(liste) {
  if (!landSelectionne) {
    return `<p class="account-empty">${t("coiffeuses.pickState")}</p>`;
  }
  if (!liste.length) {
    return `<p class="account-empty">${t("coiffeuses.empty")}</p>`;
  }
  return `<div class="coiffeuses-list">${liste.map(carteCoiffeuse).join("")}</div>`;
}

async function chargerCoiffeuses(land) {
  const reponse = await fetch(
    `${apiCoiffeuses()}/api/hairdressers?state=${encodeURIComponent(land)}`,
    { cache: "no-store" }
  );
  const data = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new Error(data?.error || t("coiffeuses.loadError"));
  }
  return data.hairdressers || [];
}

async function afficherCoiffeusesLand(land) {
  const listeEl = document.getElementById("coiffeuses-list");
  if (!listeEl) return;

  mettreAJourSectionInscription(land);

  if (!land) {
    coiffeusesCache = [];
    listeEl.innerHTML = listeCoiffeusesHtml([]);
    return;
  }

  listeEl.innerHTML = `<p class="account-loading">${t("coiffeuses.loading")}</p>`;

  try {
    coiffeusesCache = await chargerCoiffeuses(land);
    listeEl.innerHTML = listeCoiffeusesHtml(coiffeusesCache);
  } catch (err) {
    listeEl.innerHTML = `<p class="account-empty">${err.message}</p>`;
  }
}

function reinitialiserPhotoProfilCoiffeuse() {
  fichierPhotoCoiffeuse = null;
  urlPhotoCoiffeuse = "";
  const input = document.getElementById("coiffeuses-profile-photo");
  const hidden = document.getElementById("coiffeuses-profile-image-url");
  const preview = document.getElementById("coiffeuses-profile-photo-preview");
  if (input) input.value = "";
  if (hidden) hidden.value = "";
  if (preview) {
    preview.querySelectorAll("img[src^='blob:']").forEach((img) => URL.revokeObjectURL(img.src));
    preview.innerHTML = "";
    preview.hidden = true;
  }
}

function validerFichierPhotoCoiffeuse(fichier) {
  if (!fichier) throw new Error(t("coiffeuses.profilePhotoRequired"));
  if (!COIFFEUSE_PHOTO_TYPES.includes(fichier.type)) {
    throw new Error(t("coiffeuses.profilePhotoInvalidType"));
  }
  if (fichier.size > COIFFEUSE_PHOTO_TAILLE_MAX) {
    throw new Error(t("coiffeuses.profilePhotoTooLarge"));
  }
  return fichier;
}

function rendreApercuPhotoProfilCoiffeuse(fichier) {
  const preview = document.getElementById("coiffeuses-profile-photo-preview");
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
      <button type="button" class="coiffeuses-photo-remove" id="coiffeuses-profile-photo-remove" aria-label="${echapperTexteCoiffeuse(t("coiffeuses.profilePhotoRemove"))}">×</button>
    </figure>`;
}

async function uploaderPhotoProfilCoiffeuse(fichier) {
  const formData = new FormData();
  formData.append("photo", fichier);

  const reponse = await fetch(`${apiCoiffeuses()}/api/hairdressers/upload-photo`, {
    method: "POST",
    body: formData,
  });
  const data = await reponse.json().catch(() => ({}));

  if (!reponse.ok) {
    throw new Error(data?.error || t("coiffeuses.profilePhotoUploadError"));
  }

  if (!data?.url) {
    throw new Error(t("coiffeuses.profilePhotoUploadError"));
  }

  return data.url;
}

function htmlLienProInscription(index) {
  return `
    <div class="coiffeuses-pro-link-row" data-pro-index="${index}">
      <label class="field coiffeuses-pro-link-field">
        <span>${t("coiffeuses.proLinkUrl")} *</span>
        <input type="url" name="proUrl_${index}" class="coiffeuses-input" required maxlength="500" placeholder="https://" inputmode="url" />
      </label>
      <label class="field coiffeuses-pro-link-field">
        <span>${t("coiffeuses.proLinkLabel")}</span>
        <input type="text" name="proLabel_${index}" class="coiffeuses-input" maxlength="80" placeholder="${echapperTexteCoiffeuse(t("coiffeuses.proLinkLabelHint"))}" />
      </label>
      ${index > 0 ? `<button type="button" class="coiffeuses-remove-link" data-remove-pro="${index}" aria-label="${echapperTexteCoiffeuse(t("coiffeuses.removeProLink"))}">×</button>` : ""}
    </div>`;
}

function initialiserLiensProInscription() {
  const liste = document.getElementById("coiffeuses-pro-links-list");
  if (!liste) return;
  liste.innerHTML = htmlLienProInscription(0);
}

function ajouterLienProInscription() {
  const liste = document.getElementById("coiffeuses-pro-links-list");
  if (!liste) return;
  const count = liste.querySelectorAll(".coiffeuses-pro-link-row").length;
  if (count >= 12) return;
  liste.insertAdjacentHTML("beforeend", htmlLienProInscription(count));
}

function retirerLienProInscription(index) {
  const liste = document.getElementById("coiffeuses-pro-links-list");
  const row = liste?.querySelector(`[data-pro-index="${index}"]`);
  row?.remove();
}

function mettreAJourSectionInscription(land) {
  const section = document.getElementById("coiffeuses-register-section");
  const prompt = document.getElementById("coiffeuses-register-prompt");
  const stateName = document.getElementById("coiffeuses-register-state-name");
  const stateSlugInput = document.getElementById("coiffeuses-register-state-slug");

  if (!section || !prompt) return;

  if (land) {
    section.hidden = false;
    prompt.hidden = true;
    if (stateName) stateName.textContent = libelleLand(land);
    if (stateSlugInput) stateSlugInput.value = land;
  } else {
    section.hidden = true;
    prompt.hidden = false;
    if (stateName) stateName.textContent = "";
    if (stateSlugInput) stateSlugInput.value = "";
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

async function soumettreInscriptionCoiffeuse(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const messageEl = document.getElementById("coiffeuses-register-message");
  const submitBtn = document.getElementById("coiffeuses-register-submit");

  if (!form.reportValidity()) return;

  const fd = new FormData(form);
  const stateSlug = fd.get("stateSlug");
  if (!stateSlug) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.className = "account-message account-message--error";
      messageEl.textContent = t("coiffeuses.registerPickState");
    }
    return;
  }

  const professionalLinks = lireLiensProDepuisFormulaire(form);
  if (!professionalLinks.length) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.className = "account-message account-message--error";
      messageEl.textContent = t("coiffeuses.proLinkRequired");
    }
    return;
  }

  if (!fichierPhotoCoiffeuse && !urlPhotoCoiffeuse) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.className = "account-message account-message--error";
      messageEl.textContent = t("coiffeuses.profilePhotoRequired");
    }
    return;
  }

  if (messageEl) messageEl.hidden = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = t("coiffeuses.registerSending");
  }

  let profileImageUrl = urlPhotoCoiffeuse;

  try {
    if (fichierPhotoCoiffeuse) {
      if (submitBtn) submitBtn.textContent = t("coiffeuses.profilePhotoUploading");
      profileImageUrl = await uploaderPhotoProfilCoiffeuse(fichierPhotoCoiffeuse);
      urlPhotoCoiffeuse = profileImageUrl;
    }

    const hiddenUrl = document.getElementById("coiffeuses-profile-image-url");
    if (hiddenUrl) hiddenUrl.value = profileImageUrl;

    if (submitBtn) submitBtn.textContent = t("coiffeuses.registerSending");

    const payload = {
      stateSlug: String(stateSlug),
      name: String(fd.get("name") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      address: String(fd.get("address") || "").trim(),
      travelAvailable: fd.get("travelAvailable") === "yes",
      travelNotes: String(fd.get("travelNotes") || "").trim(),
      wigInstallCustomisation: fd.get("wigInstallCustomisation") === "yes",
      profileImageUrl,
      professionalLinks,
      companyWebsite: String(fd.get("companyWebsite") || "").trim(),
    };

    const reponse = await fetch(`${apiCoiffeuses()}/api/hairdressers/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await reponse.json().catch(() => ({}));

    if (!reponse.ok) {
      throw new Error(data?.error || t("coiffeuses.registerError"));
    }

    form.reset();
    initialiserLiensProInscription();
    reinitialiserPhotoProfilCoiffeuse();
    const slugInput = document.getElementById("coiffeuses-register-state-slug");
    if (slugInput) slugInput.value = landSelectionne;

    if (messageEl) {
      messageEl.hidden = false;
      messageEl.className = "account-message account-message--success";
      messageEl.textContent = t("coiffeuses.registerSuccess");
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
      submitBtn.textContent = t("coiffeuses.registerSubmit");
    }
  }
}

function attacherFormulaireInscription() {
  const form = document.getElementById("coiffeuses-register-form");
  form?.addEventListener("submit", soumettreInscriptionCoiffeuse);

  document.getElementById("coiffeuses-add-pro-link")?.addEventListener("click", () => {
    ajouterLienProInscription();
  });

  document.getElementById("coiffeuses-pro-links-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-pro]");
    if (!btn) return;
    retirerLienProInscription(btn.dataset.removePro);
  });

  document.getElementById("coiffeuses-profile-photo")?.addEventListener("change", (e) => {
    const messageEl = document.getElementById("coiffeuses-register-message");
    if (messageEl) messageEl.hidden = true;

    try {
      const fichier = e.target.files?.[0];
      if (!fichier) {
        reinitialiserPhotoProfilCoiffeuse();
        return;
      }
      fichierPhotoCoiffeuse = validerFichierPhotoCoiffeuse(fichier);
      urlPhotoCoiffeuse = "";
      rendreApercuPhotoProfilCoiffeuse(fichierPhotoCoiffeuse);
    } catch (err) {
      reinitialiserPhotoProfilCoiffeuse();
      if (messageEl) {
        messageEl.hidden = false;
        messageEl.className = "account-message account-message--error";
        messageEl.textContent = err.message;
      }
    }
  });

  document.getElementById("coiffeuses-register-form")?.addEventListener("click", (e) => {
    if (e.target.id === "coiffeuses-profile-photo-remove") {
      reinitialiserPhotoProfilCoiffeuse();
    }
  });

  initialiserLiensProInscription();
  mettreAJourSectionInscription(landSelectionne);
}

function pageCoiffeusesHtml() {
  return `
    <section class="coiffeuses-intro account-card">
      <h2 class="coiffeuses-title">${t("coiffeuses.title")}</h2>
      <p class="coiffeuses-lead">${t("coiffeuses.lead")}</p>
      <div class="field coiffeuses-state-field">
        <span class="coiffeuses-state-label">${t("coiffeuses.stateLabel")}</span>
        ${menuDeroulantLandHtml()}
      </div>
    </section>
    <section id="coiffeuses-register-section" class="coiffeuses-register account-card" hidden>
      <h2 class="coiffeuses-results-title">${t("coiffeuses.registerTitle")}</h2>
      <p class="coiffeuses-lead">${t("coiffeuses.registerLead")}</p>
      <p class="coiffeuses-register-state">
        <span class="coiffeuses-label">${t("coiffeuses.stateLabel")}</span>
        <strong id="coiffeuses-register-state-name"></strong>
      </p>
      <form id="coiffeuses-register-form" class="coiffeuses-register-form account-form" novalidate>
        <input type="hidden" name="stateSlug" id="coiffeuses-register-state-slug" value="" />
        <div class="coiffeuses-honeypot" aria-hidden="true">
          <label>
            <span>Site web</span>
            <input type="text" name="companyWebsite" tabindex="-1" autocomplete="off" />
          </label>
        </div>
        <label class="field">
          <span>${t("coiffeuses.name")} *</span>
          <input class="coiffeuses-input" type="text" name="name" required minlength="2" maxlength="120" autocomplete="name" />
        </label>
        <label class="field">
          <span>${t("coiffeuses.phone")} *</span>
          <input class="coiffeuses-input" type="tel" name="phone" required minlength="3" maxlength="40" autocomplete="tel" />
        </label>
        <label class="field coiffeuses-field--large">
          <span>${t("coiffeuses.address")} *</span>
          <textarea class="coiffeuses-textarea coiffeuses-textarea--large" name="address" required minlength="5" maxlength="500" rows="4" autocomplete="street-address" placeholder="${echapperTexteCoiffeuse(t("coiffeuses.addressHint"))}"></textarea>
        </label>
        <fieldset class="coiffeuses-fieldset">
          <legend>${t("coiffeuses.travel")} *</legend>
          <div class="coiffeuses-radio-group">
            <label class="coiffeuses-radio">
              <input type="radio" name="travelAvailable" value="yes" required />
              <span>${t("coiffeuses.travelYes")}</span>
            </label>
            <label class="coiffeuses-radio">
              <input type="radio" name="travelAvailable" value="no" required />
              <span>${t("coiffeuses.travelNo")}</span>
            </label>
          </div>
        </fieldset>
        <label class="field coiffeuses-field--large">
          <span>${t("coiffeuses.travelNotes")} *</span>
          <textarea class="coiffeuses-textarea coiffeuses-textarea--xlarge" name="travelNotes" required minlength="2" maxlength="500" rows="5" placeholder="${echapperTexteCoiffeuse(t("coiffeuses.travelNotesHint"))}"></textarea>
        </label>
        <fieldset class="coiffeuses-fieldset">
          <legend>${t("coiffeuses.wigInstall")} *</legend>
          <div class="coiffeuses-radio-group">
            <label class="coiffeuses-radio">
              <input type="radio" name="wigInstallCustomisation" value="yes" required />
              <span>${t("coiffeuses.wigInstallYes")}</span>
            </label>
            <label class="coiffeuses-radio">
              <input type="radio" name="wigInstallCustomisation" value="no" required />
              <span>${t("coiffeuses.wigInstallNo")}</span>
            </label>
          </div>
        </fieldset>
        <fieldset class="coiffeuses-photo-field">
          <legend>${t("coiffeuses.profilePhoto")} *</legend>
          <p class="coiffeuses-field-hint">${t("coiffeuses.profilePhotoUploadHint")}</p>
          <label class="coiffeuses-photo-upload">
            <input type="file" id="coiffeuses-profile-photo" accept="image/jpeg,image/png,image/webp" />
            <span class="coiffeuses-photo-upload-btn">${t("coiffeuses.profilePhotoChoose")}</span>
          </label>
          <div id="coiffeuses-profile-photo-preview" class="coiffeuses-photo-preview-wrap" hidden></div>
          <input type="hidden" name="profileImageUrl" id="coiffeuses-profile-image-url" value="" />
        </fieldset>
        <div class="coiffeuses-pro-links-field">
          <span class="coiffeuses-pro-links-label">${t("coiffeuses.proLinks")} *</span>
          <div id="coiffeuses-pro-links-list" class="coiffeuses-pro-links-list"></div>
          <button type="button" id="coiffeuses-add-pro-link" class="auth-btn auth-btn--outline coiffeuses-add-link">${t("coiffeuses.addProLink")}</button>
        </div>
        <button type="submit" class="btn-order account-submit" id="coiffeuses-register-submit">${t("coiffeuses.registerSubmit")}</button>
        <p id="coiffeuses-register-message" class="account-message" hidden></p>
      </form>
    </section>
    <section id="coiffeuses-register-prompt" class="coiffeuses-register-prompt account-card">
      <p class="account-empty">${t("coiffeuses.registerPickState")}</p>
    </section>
    <section class="coiffeuses-results">
      <h2 class="coiffeuses-results-title">${t("coiffeuses.resultsTitle")}</h2>
      <div id="coiffeuses-list" class="coiffeuses-list-wrap">
        <p class="account-empty">${t("coiffeuses.pickState")}</p>
      </div>
    </section>`;
}

async function rendrePageCoiffeuses() {
  masquerRechercheTypeCoiffeuses();

  const grille = document.getElementById("type-grid");
  if (!grille) return;

  if (fermerDropdownLand) {
    document.removeEventListener("click", fermerDropdownLand);
    document.removeEventListener("keydown", fermerDropdownLand);
    fermerDropdownLand = null;
  }

  grille.className = "coiffeuses-page";
  grille.innerHTML = pageCoiffeusesHtml();
  attacherMenuDeroulantLand();
  attacherFormulaireInscription();

  if (landSelectionne) {
    await afficherCoiffeusesLand(landSelectionne);
  }
}

window.rendrePageCoiffeuses = rendrePageCoiffeuses;

document.addEventListener("langchange", () => {
  if (typeof etatType !== "undefined" && etatType.coiffeuses) {
    rendrePageCoiffeuses();
  }
});
