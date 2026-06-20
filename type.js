/* ============================================================
   Jen's & Flora — Page d'un type de perruque
   Charge les produits via backend / Supabase (?type=...)
   Le panier / commande sont gérés par script.js (partagé).
   ============================================================ */

const TYPES = new Set([
  "bone-straight",
  "body-waves",
  "deep-waves",
  "pixies-curls",
  "bob",
  "pixie-cut",
  "layered-hair",
  "extensions",
  "entretien",
  "apprentissage",
]);

// Map uid -> produit (pour retrouver un produit au clic "Commander")
const produitsMap = {};

function echapperHtml(texte) {
  return String(texte ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function specLigne(label, valeur) {
  if (!valeur) return "";
  return `<li><span>${label}</span><strong>${echapperHtml(valeur)}</strong></li>`;
}

// État courant (pour re-render au changement de langue)
let etatType = { produits: [], apprentissage: false, slug: "", nom: "", description: "" };
let filtreRecherche = "";

function normaliserRecherche(texte) {
  return String(texte || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function texteRechercheProduit(p) {
  return [
    p.nom,
    p.description,
    p.type,
    p.taille,
    p.couleur,
    p.tailleLace,
    p.prix != null ? String(p.prix) : "",
  ].join(" ");
}

function produitCorrespondRecherche(p, query) {
  if (!query) return true;
  const haystack = normaliserRecherche(texteRechercheProduit(p));
  const mots = normaliserRecherche(query).split(/\s+/).filter(Boolean);
  return mots.every((mot) => haystack.includes(mot));
}

function produitsFiltres() {
  const query = filtreRecherche.trim();
  if (!query) return etatType.produits;
  return etatType.produits.filter((p) => produitCorrespondRecherche(p, query));
}

function mettreAJourBoutonEffacer() {
  const clearBtn = document.getElementById("type-search-clear");
  const input = document.getElementById("type-search");
  const visible = !!(input?.value.trim() || filtreRecherche.trim());
  if (clearBtn) clearBtn.hidden = !visible;
}

function mettreAJourBarreRecherche(total, affiches) {
  const wrap = document.getElementById("type-search-wrap");
  const status = document.getElementById("type-search-status");
  if (!wrap) return;

  wrap.hidden = total === 0;
  mettreAJourBoutonEffacer();

  if (!status) return;

  const query = filtreRecherche.trim();
  if (!query) {
    status.textContent = "";
    return;
  }

  status.textContent =
    affiches === 0
      ? t("type.searchNoResults")
      : t("type.searchResults", { n: affiches, total });
}

function reinitialiserRecherche() {
  filtreRecherche = "";
  const input = document.getElementById("type-search");
  const clearBtn = document.getElementById("type-search-clear");
  if (input) input.value = "";
  if (clearBtn) clearBtn.hidden = true;
}

function estVideoDirecte(url) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url || "");
}

function urlMedia(url) {
  const nettoyee = (url || "").trim();
  if (!nettoyee) return "";
  try {
    // Normalise une seule fois (évite %2520 si l'URL est déjà en %20).
    return encodeURI(decodeURI(nettoyee));
  } catch {
    return nettoyee.replace(/ /g, "%20");
  }
}

function imagesProduit(p) {
  const urls = [
    p.image ?? p.image_url,
    p.image2 ?? p.image_url_2,
    p.image3 ?? p.image_url_3,
  ]
    .map((url) => (url || "").trim())
    .filter(Boolean);

  const uniques = [];
  urls.forEach((url) => {
    if (!uniques.includes(url)) uniques.push(url);
  });

  return uniques.length ? uniques : ["1.jpg"];
}

function nombreSlidesMedia(p) {
  const images = imagesProduit(p);
  const videoDirecte = p.video && estVideoDirecte(p.video);
  return images.length + (videoDirecte ? 1 : 0);
}

function flecheCycleMedia(p) {
  const slides = nombreSlidesMedia(p);
  if (slides <= 1) return "";

  return `
    <button type="button" class="media-toggle" data-action="cycle-media" aria-label="Photo suivante" title="Photo suivante">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6"/>
      </svg>
    </button>
    <span class="media-counter" aria-hidden="true">1/${slides}</span>`;
}

// Vidéo externe (YouTube, Pinterest…) + flèche pour parcourir les images
function flechesMedia(p) {
  const images = imagesProduit(p);
  const videoDirecte = p.video && estVideoDirecte(p.video);
  const fleche = flecheCycleMedia(p);

  if (p.video && !videoDirecte) {
    const lienVideo =
      images.length <= 1
        ? `
      <a class="media-toggle" href="${p.video}" target="_blank" rel="noopener" aria-label="Voir la vidéo" title="Voir la vidéo">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </a>`
        : "";
    return `${lienVideo}${fleche}`;
  }

  if (!videoDirecte) return fleche;

  return `
    <video class="media-video" src="${p.video}" controls playsinline preload="metadata"></video>
    ${fleche}`;
}

// Carte d'un produit (perruque)
function carteProduit(p) {
  const stock = stockDisponibleProduit(p);
  const enStock = stock > 0;
  const badge = enStock
    ? `<span class="stock-badge in">${t("product.inStock")}</span>`
    : `<span class="stock-badge out">${t("product.outStock")}</span>`;
  const specs = `
    <ul class="product-specs">
      ${specLigne(t("product.specType"), p.type)}
      ${specLigne(t("product.specSize"), p.taille)}
      ${specLigne(t("product.specColor"), p.couleur)}
      ${specLigne(t("product.specLace"), p.tailleLace)}
    </ul>`;
  const infoStock = enStock
    ? `<span class="product-stock">${t("product.unitsLeft", { n: stock })}</span>`
    : `<span class="product-stock">${t("product.unavailable")}</span>`;
  const bouton = enStock
    ? `<button class="btn-order" data-uid="${p.uid}">${t("product.order")}</button>`
    : `<button class="btn-disabled" disabled>${t("product.soldout")}</button>`;

  const images = imagesProduit(p);
  const videoDirecte = p.video && estVideoDirecte(p.video);
  const classesMedia = [
    "product-media",
    videoDirecte ? "has-video" : "",
    nombreSlidesMedia(p) > 1 ? "has-media-cycle" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <article class="product-card">
      <div class="${classesMedia}" data-media-index="0" data-images="${encodeURIComponent(JSON.stringify(images))}">
        ${badge}
        <img class="media-photo" src="${urlMedia(images[0])}" alt="${echapperHtml(p.nom)}" />
        ${flechesMedia(p)}
      </div>
      <div class="product-body">
        <h3 class="product-name">${echapperHtml(p.nom)}</h3>
        <p class="product-desc">${echapperHtml(p.description || "")}</p>
        ${specs}
        <div class="product-meta">
          <span class="product-price">${formaterPrix(p.prix)}</span>
          ${infoStock}
        </div>
        ${bouton}
      </div>
    </article>
  `;
}

// Carte d'un contenu d'apprentissage
function carteApprentissage(p) {
  // Bouton vidéo relié au lien (fichier local ou lien YouTube/Drive...)
  const action = p.video
    ? `<a class="btn-order video-link" href="${p.video}" target="_blank" rel="noopener">
         <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
         ${t("product.watch")}
       </a>`
    : `<button class="btn-disabled" disabled>${t("product.soon")}</button>`;

  return `
    <article class="product-card">
      <div class="product-media">
        <img src="${p.image || "1.jpg"}" alt="${p.nom}" />
      </div>
      <div class="product-body">
        <h3 class="product-name">${p.nom}</h3>
        <p class="product-desc">${p.description || ""}</p>
        ${action}
      </div>
    </article>
  `;
}

/* ---------------- En-tête de page ---------------- */
function mettreAJourEnteteType() {
  const { slug, nom, description } = etatType;
  if (!slug) return;

  const label =
    typeof libelleTypeCatalogue === "function" ? libelleTypeCatalogue(slug, nom) : nom;
  const desc =
    typeof descriptionTypeCatalogue === "function"
      ? descriptionTypeCatalogue(slug, description)
      : description;

  const titreEl = document.getElementById("type-title");
  const descEl = document.getElementById("type-desc");
  const crumbEl = document.getElementById("crumb-type");

  if (titreEl) titreEl.textContent = label;
  if (descEl) descEl.textContent = desc;
  if (crumbEl) crumbEl.textContent = label;
  document.title = t("page.typeTitle", { name: label });
}

window.mettreAJourEnteteType = mettreAJourEnteteType;

/* ---------------- Chargement ---------------- */
async function charger() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("type");
  const grille = document.getElementById("type-grid");
  const titre = document.getElementById("type-title");

  if (!slug || !TYPES.has(slug)) {
    etatType = { produits: [], apprentissage: false, slug: "", nom: "", description: "" };
    titre.textContent = t("type.notFound");
    grille.innerHTML = `<p class="cart-empty">${t("type.notExist")} <a href="maison.html" style="color:var(--gold-light)">${t("type.back")}</a></p>`;
    mettreAJourBarreRecherche(0, 0);
    return;
  }

  reinitialiserRecherche();
  if (titre) titre.textContent = t("type.loading");

  try {
    let data = null;

    if (typeof chargerProduitsDepuisBase === "function") {
      data = await chargerProduitsDepuisBase(slug);
    }

    if (!data) {
      throw new Error("Catalogue indisponible");
    }

    const produits = data.produits || [];

    // uid unique par type + compatibilité noms Supabase bruts (image_url_2, etc.)
    produits.forEach((p) => {
      p.image = (p.image ?? p.image_url ?? "1.jpg").trim();
      p.image2 = (p.image2 ?? p.image_url_2 ?? "").trim();
      p.image3 = (p.image3 ?? p.image_url_3 ?? "").trim();
      p.video = (p.video ?? p.video_url ?? "").trim();
      p.uid = `${slug}:${p.id}`;
      produitsMap[p.uid] = p;
    });

    etatType = {
      produits,
      apprentissage: !!data.apprentissage,
      slug,
      nom: data.type,
      description: data.description || "",
    };
    mettreAJourEnteteType();
    if (typeof synchroniserPanierAvecProduits === "function") {
      synchroniserPanierAvecProduits(produits);
    }
    rendreGrille();
  } catch (err) {
    titre.textContent = t("type.loadError");
    grille.innerHTML = `<p class="cart-empty">${t("type.loadError")}<br />${t("type.loadHint")}</p>`;
    mettreAJourBarreRecherche(0, 0);
    console.error("Erreur chargement catalogue :", err);
  }
}

// (Re)génère les cartes de la grille selon l'état courant, la langue et la recherche
function rendreGrille() {
  const grille = document.getElementById("type-grid");
  if (!grille) return;

  const total = etatType.produits.length;
  if (total === 0) {
    grille.innerHTML = `<p class="cart-empty">${t("type.noProducts")}</p>`;
    mettreAJourBarreRecherche(0, 0);
    return;
  }

  const filtrés = produitsFiltres();
  mettreAJourBarreRecherche(total, filtrés.length);

  if (filtrés.length === 0) {
    grille.innerHTML = `<p class="cart-empty">${t("type.searchNoResults")}</p>`;
    return;
  }

  const rendu = etatType.apprentissage ? carteApprentissage : carteProduit;
  grille.innerHTML = filtrés.map(rendu).join("");
  attacherFallbackImages();
}

function attacherFallbackImages() {
  document.querySelectorAll(".product-media .media-photo").forEach((img) => {
    const media = img.closest(".product-media");
    if (!media || img.dataset.fallbackBound) return;
    img.dataset.fallbackBound = "1";

    img.addEventListener("error", () => {
      let images = [];
      try {
        images = JSON.parse(decodeURIComponent(media.dataset.images || "%5B%5D"));
      } catch {
        return;
      }

      const current = img.getAttribute("src") || "";
      const start = Math.max(
        0,
        images.findIndex((url) => urlMedia(url) === current || url === current) + 1
      );
      const suivante = images.slice(start).find((url) => url && url !== current);

      if (suivante) {
        img.src = urlMedia(suivante);
        return;
      }

      img.classList.add("media-photo--missing");
      img.removeAttribute("src");
    });
  });
}

function idProduitDepuisUid(uid) {
  const parts = String(uid || "").split(":");
  return parts.length > 1 ? parts.slice(1).join(":") : uid;
}

function appliquerMiseAJourStock(stockUpdates) {
  if (!Array.isArray(stockUpdates) || stockUpdates.length === 0) return false;

  const stockParId = Object.fromEntries(
    stockUpdates.map((item) => [item.productId, Number(item.stock) || 0])
  );

  let modifie = false;

  etatType.produits.forEach((produit) => {
    const productId = produit.id || idProduitDepuisUid(produit.uid);
    if (stockParId[productId] === undefined) return;

    produit.stock = stockParId[productId];
    if (produit.uid && produitsMap[produit.uid]) {
      produitsMap[produit.uid].stock = produit.stock;
    }
    modifie = true;
  });

  if (modifie) {
    if (typeof synchroniserPanierAvecProduits === "function") {
      synchroniserPanierAvecProduits(etatType.produits);
    }
    rendreGrille();
    document.dispatchEvent(new CustomEvent("stockchange"));
  }

  return modifie;
}

window.appliquerMiseAJourStock = appliquerMiseAJourStock;
window.rechargerProduitsType = charger;

document.addEventListener("langchange", rendreGrille);
document.addEventListener("stockchange", rendreGrille);
document.addEventListener("basestockchange", charger);

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("type-search");
  const searchClear = document.getElementById("type-search-clear");

  searchInput?.addEventListener("input", () => {
    filtreRecherche = searchInput.value;
    mettreAJourBoutonEffacer();
    rendreGrille();
  });

  searchClear?.addEventListener("click", () => {
    reinitialiserRecherche();
    searchInput?.focus();
    rendreGrille();
  });

  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchInput.value) {
      e.preventDefault();
      reinitialiserRecherche();
      rendreGrille();
    }
  });

  charger();

  // Re-render des cartes au changement de langue
  document.getElementById("type-grid").addEventListener("click", (e) => {
    // Parcours images → vidéo (en dernier) sur la carte
    const toggle = e.target.closest('[data-action="cycle-media"]');
    if (toggle) {
      cycleMedia(toggle.closest(".product-media"));
      return;
    }

    // Ajout au panier
    const cmd = e.target.closest(".btn-order");
    if (cmd && cmd.dataset.uid) {
      const produit = produitsMap[cmd.dataset.uid];
      if (produit) ajouterAuPanier(produit);
      return;
    }

    // Tutoriels d'apprentissage (modale vidéo)
    const play = e.target.closest(".play-video");
    if (play) ouvrirVideo(play.dataset.video, play.dataset.nom);
  });
});

// Parcourt les images puis la vidéo (toujours en dernier)
function cycleMedia(media) {
  if (!media) return;

  const photo = media.querySelector(".media-photo");
  const video = media.querySelector(".media-video");
  if (!photo) return;

  let images = [];
  try {
    images = JSON.parse(decodeURIComponent(media.dataset.images || "%5B%5D"));
  } catch (err) {
    images = imagesProduit({ image: photo.getAttribute("src") || "1.jpg" });
  }

  const hasVideo = media.classList.contains("has-video") && video;
  const total = images.length + (hasVideo ? 1 : 0);
  if (total <= 1) return;

  let index = Number.parseInt(media.dataset.mediaIndex || "0", 10);
  if (Number.isNaN(index)) index = 0;
  index = (index + 1) % total;
  media.dataset.mediaIndex = String(index);

  const counter = media.querySelector(".media-counter");
  if (counter) counter.textContent = `${index + 1}/${total}`;

  if (index < images.length) {
    media.classList.remove("show-video");
    photo.src = urlMedia(images[index]);
    if (video) video.pause();
    return;
  }

  media.classList.add("show-video");
  if (video) video.play().catch(() => {});
}
