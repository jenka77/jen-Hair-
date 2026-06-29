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

  return `
    <article class="coiffeuse-card account-card">
      <h3 class="coiffeuse-name">${echapperTexteCoiffeuse(c.name)}</h3>
      <ul class="coiffeuse-meta">
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
