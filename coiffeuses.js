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

function optionsLandHtml() {
  const placeholder = `<option value="">${t("coiffeuses.selectState")}</option>`;
  const options = LAND_SLUGS.map(
    (slug) =>
      `<option value="${slug}"${slug === landSelectionne ? " selected" : ""}>${echapperTexteCoiffeuse(libelleLand(slug))}</option>`
  ).join("");
  return placeholder + options;
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
      <label class="field coiffeuses-state-field">
        <span>${t("coiffeuses.stateLabel")}</span>
        <select id="coiffeuses-state" class="coiffeuses-select" aria-label="${t("coiffeuses.stateLabel")}">
          ${optionsLandHtml()}
        </select>
      </label>
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

  grille.className = "coiffeuses-page";
  grille.innerHTML = pageCoiffeusesHtml();

  const select = document.getElementById("coiffeuses-state");
  select?.addEventListener("change", () => {
    landSelectionne = select.value;
    afficherCoiffeusesLand(landSelectionne);
  });

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
