/* ============================================================
   Jen's & Floran — Menu mobile (catalogue + navigation)
   ============================================================ */

const TYPES_MENU_FALLBACK = [
  { slug: "bone-straight", name: "Bone Straight" },
  { slug: "body-waves", name: "Body Waves" },
  { slug: "deep-waves", name: "Deep Waves" },
  { slug: "pixies-curls", name: "Pixies Curls" },
  { slug: "bob", name: "Bob" },
  { slug: "pixie-cut", name: "Pixie Cut" },
  { slug: "layered-hair", name: "Layered Hair" },
  { slug: "extensions", name: "Extensions" },
  { slug: "entretien", name: "Entretien" },
  { slug: "apprentissage", name: "Apprentissage" },
  { slug: "commentaires", name: "Vos avis" },
];

function cheminTypeCatalogue(slug) {
  const sousDossierLangue = /\/(fr|de|en)\//.test(window.location.pathname);
  const base = sousDossierLangue ? "../type.html" : "type.html";
  return `${base}?type=${encodeURIComponent(slug)}`;
}

async function chargerCategoriesMenu() {
  const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
  if (!apiBase) return TYPES_MENU_FALLBACK;

  try {
    const reponse = await fetch(`${apiBase}/api/categories`, { cache: "no-store" });
    if (!reponse.ok) throw new Error("categories indisponibles");
    const data = await reponse.json();
    const liste = (data.categories || [])
      .filter((c) => c.slug && c.name)
      .map((c) => ({ slug: c.slug, name: c.name }));
    return liste.length ? liste : TYPES_MENU_FALLBACK;
  } catch {
    return TYPES_MENU_FALLBACK;
  }
}

async function injecterCatalogueMenuMobile() {
  const nav = document.getElementById("site-nav");
  if (!nav || nav.querySelector(".nav-catalogue-mobile")) return;
  if (window.innerWidth > 900) return;

  const categories = await chargerCategoriesMenu();
  const bloc = document.createElement("div");
  bloc.className = "nav-catalogue-mobile";

  const titre = document.createElement("p");
  titre.className = "nav-mobile-section-title";
  titre.setAttribute("data-i18n", "nav.collection");
  titre.textContent = "Collection";
  bloc.appendChild(titre);

  categories.forEach(({ slug, name }) => {
    const lien = document.createElement("a");
    lien.href = cheminTypeCatalogue(slug);
    lien.className = "nav-catalogue-link";
    lien.dataset.slug = slug;
    lien.dataset.nameFallback = name;
    lien.textContent =
      typeof libelleTypeCatalogue === "function" ? libelleTypeCatalogue(slug, name) : name;
    bloc.appendChild(lien);
  });

  const authBloc = nav.querySelector(".nav-auth-mobile");
  if (authBloc) {
    nav.insertBefore(bloc, authBloc);
  } else {
    nav.appendChild(bloc);
  }

  if (typeof appliquerTraductions === "function") {
    appliquerTraductions();
  }
}

function actualiserLibellesCatalogueMenu() {
  document.querySelectorAll(".nav-catalogue-link[data-slug]").forEach((lien) => {
    const slug = lien.dataset.slug;
    const fallback = lien.dataset.nameFallback || lien.textContent;
    if (typeof libelleTypeCatalogue === "function") {
      lien.textContent = libelleTypeCatalogue(slug, fallback);
    }
  });
}

window.actualiserLibellesCatalogueMenu = actualiserLibellesCatalogueMenu;

document.addEventListener("langchange", actualiserLibellesCatalogueMenu);

document.addEventListener("DOMContentLoaded", () => {
  injecterCatalogueMenuMobile();
});