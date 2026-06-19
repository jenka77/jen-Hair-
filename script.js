/* ============================================================
   Jen's & Flora — Module e-commerce partagé
   Panier (persistant) + Commande via backend + Vidéo
   Utilisé par index.html et par les pages de type (type.html)
   ============================================================ */

// Frais appliqués uniquement si la cliente choisit la livraison à domicile.
const FRAIS_LIVRAISON = 7.5;

function estEmail(valeur) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((valeur || "").trim());
}

function telephoneValide(valeur) {
  const brut = (valeur || "").trim();
  if (!/^\+?[0-9\s().-]{8,20}$/.test(brut)) return false;

  const chiffres = brut.replace(/\D/g, "");
  if (chiffres.length < 8 || chiffres.length > 15) return false;

  // Rejette les numéros manifestement fictifs : 00000000, 11111111, etc.
  if (/^(\d)\1+$/.test(chiffres)) return false;

  return true;
}

/* ============================================================
   UTILITAIRES
   ============================================================ */
function formaterPrix(montant) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(montant || 0);
}

/* ============================================================
   PANIER (persistant via localStorage)
   Chaque ligne : { uid, nom, prix, image, type, taille, couleur, tailleLace, stockMax, quantite }
   ============================================================ */
const PANIER_CLE = "jf_panier";
const PENDING_PAYPAL_CART_CLE = "jf_pending_paypal_cart";
let panier = [];

function chargerPanier() {
  try {
    panier = JSON.parse(localStorage.getItem(PANIER_CLE)) || [];
  } catch (e) {
    panier = [];
  }
}

function sauverPanier() {
  localStorage.setItem(PANIER_CLE, JSON.stringify(panier));
}

function stockDisponibleProduit(produit) {
  // La valeur officielle vient désormais du backend/Supabase.
  return Number(produit.stock || 0);
}

/* Ajoute un produit au panier.
   `produit` doit contenir : uid, nom, prix, image, type, stock */
function ajouterAuPanier(produit) {
  if (!produit) return;
  const uid = produit.uid || String(produit.id);
  const stockMax = stockDisponibleProduit(produit);
  if (stockMax <= 0) return;

  const ligne = panier.find((l) => l.uid === uid);
  if (ligne) {
    ligne.nom = produit.nom;
    ligne.prix = Number(produit.prix) || 0;
    ligne.image = produit.image || "1.jpg";
    ligne.type = produit.type || "";
    ligne.taille = produit.taille || "";
    ligne.couleur = produit.couleur || "";
    ligne.tailleLace = produit.tailleLace || "";
    ligne.stockMax = stockMax;
    ligne.fromBase = !!produit.fromBase;

    if (ligne.quantite < ligne.stockMax) {
      ligne.quantite += 1;
    } else {
      afficherToast(t("toast.maxStock"));
      return;
    }
  } else {
    panier.push({
      uid,
      nom: produit.nom,
      prix: Number(produit.prix) || 0,
      image: produit.image || "1.jpg",
      type: produit.type || "",
      taille: produit.taille || "",
      couleur: produit.couleur || "",
      tailleLace: produit.tailleLace || "",
      stockMax,
      fromBase: !!produit.fromBase,
      quantite: 1,
    });
  }

  sauverPanier();
  afficherToast(t("toast.added", { nom: produit.nom }));
  majPanier();
  ouvrirPanier();
}

function changerQuantite(uid, delta) {
  const ligne = panier.find((l) => l.uid === uid);
  if (!ligne) return;

  const nouvelle = ligne.quantite + delta;
  if (nouvelle <= 0) {
    retirerDuPanier(uid);
    return;
  }
  if (nouvelle > ligne.stockMax) {
    afficherToast(t("toast.maxStock"));
    return;
  }
  ligne.quantite = nouvelle;
  sauverPanier();
  majPanier();
}

function retirerDuPanier(uid) {
  panier = panier.filter((l) => l.uid !== uid);
  sauverPanier();
  majPanier();
}

function synchroniserPanierAvecProduits(produits) {
  if (!Array.isArray(produits) || produits.length === 0 || panier.length === 0) return;

  const produitsParUid = Object.fromEntries(produits.map((p) => [p.uid, p]));
  let modifie = false;

  panier = panier
    .map((ligne) => {
      const produit = produitsParUid[ligne.uid];
      if (!produit) return ligne;

      const stockMax = stockDisponibleProduit(produit);
      modifie = true;
      return {
        ...ligne,
        nom: produit.nom,
        prix: Number(produit.prix) || 0,
        image: produit.image || "1.jpg",
        type: produit.type || "",
        taille: produit.taille || "",
        couleur: produit.couleur || "",
        tailleLace: produit.tailleLace || "",
        stockMax,
        fromBase: !!produit.fromBase,
        quantite: Math.min(ligne.quantite, Math.max(stockMax, 0)),
      };
    })
    .filter((ligne) => ligne.quantite > 0);

  if (modifie) {
    sauverPanier();
    majPanier();
  }
}

function calculerTotal() {
  return panier.reduce((total, l) => total + l.prix * l.quantite, 0);
}

function nombreArticles() {
  return panier.reduce((n, l) => n + l.quantite, 0);
}

function detailsPerruque(ligne) {
  return [
    ligne.type ? `${t("product.specType")}: ${ligne.type}` : "",
    ligne.taille ? `${t("product.specSize")}: ${ligne.taille}` : "",
    ligne.couleur ? `${t("product.specColor")}: ${ligne.couleur}` : "",
    ligne.tailleLace ? `${t("product.specLace")}: ${ligne.tailleLace}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

// Met à jour l'affichage du panier (liste, total, compteur, bouton)
function majPanier() {
  const conteneur = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  const compteur = document.getElementById("cart-count");
  const checkoutBtn = document.getElementById("checkout-btn");

  // Le compteur peut exister même sans tiroir (navbar)
  if (compteur) {
    const n = nombreArticles();
    compteur.textContent = n;
    compteur.classList.toggle("visible", n > 0);
  }

  if (!conteneur) return; // page sans tiroir panier

  if (panier.length === 0) {
    conteneur.innerHTML = `<p class="cart-empty">${t("cart.empty")}</p>`;
  } else {
    conteneur.innerHTML = panier
      .map((l) => {
        const sousTotal = l.prix * l.quantite;
        return `
          <div class="cart-item">
            <img src="${l.image}" alt="${l.nom}" />
            <div class="cart-item-info">
              <h4>${l.nom}</h4>
              <p class="cart-item-details">${detailsPerruque(l)}</p>
              <div class="cart-item-price">${formaterPrix(l.prix)}</div>
              <div class="qty-control">
                <button data-action="moins" data-uid="${l.uid}" aria-label="Diminuer">−</button>
                <span>${l.quantite}</span>
                <button data-action="plus" data-uid="${l.uid}" aria-label="Augmenter">+</button>
              </div>
              <button class="cart-item-remove" data-action="retirer" data-uid="${l.uid}">${t("cart.remove")}</button>
            </div>
            <div class="cart-line-total">${formaterPrix(sousTotal)}</div>
          </div>
        `;
      })
      .join("");
  }

  if (totalEl) totalEl.textContent = formaterPrix(calculerTotal());
  if (checkoutBtn) checkoutBtn.disabled = panier.length === 0;
}

// Ouverture / fermeture du tiroir panier
function ouvrirPanier() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  if (!drawer) return;
  drawer.classList.add("open");
  if (overlay) overlay.classList.add("show");
}

function fermerPanier() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  if (drawer) drawer.classList.remove("open");
  if (overlay) overlay.classList.remove("show");
}

/* ============================================================
   FORMULAIRE DE COMMANDE
   ============================================================ */
// Indique si la cliente a coché "Livraison à domicile" dans le formulaire
function livraisonChoisie() {
  const choisi = document.querySelector('input[name="mode"]:checked');
  return !!choisi && choisi.value === "Livraison à domicile";
}

function rendreRecap() {
  const resume = document.getElementById("order-summary");
  if (!resume) return;
  const lignes = panier
    .map(
      (l) =>
        `<div class="summary-line"><span>${l.nom} × ${l.quantite}</span><span>${formaterPrix(
          l.prix * l.quantite
        )}</span></div>`
    )
    .join("");

  const livraison = livraisonChoisie();
  const ligneFrais = livraison
    ? `<div class="summary-line"><span>${t("order.deliveryFeeLabel")}</span><span>${formaterPrix(
        FRAIS_LIVRAISON
      )}</span></div>`
    : "";
  const total = calculerTotal() + (livraison ? FRAIS_LIVRAISON : 0);

  resume.innerHTML =
    lignes +
    ligneFrais +
    `<div class="summary-total"><span>${t("cart.total")}</span><span>${formaterPrix(
      total
    )}</span></div>`;
}

function ouvrirCommande() {
  if (panier.length === 0) return;

  (async () => {
    const user =
      typeof exigerConnexionPourCommande === "function"
        ? await exigerConnexionPourCommande()
        : null;
    if (!user) return;

    if (typeof preparerFormulaireCommande === "function") {
      preparerFormulaireCommande(user);
    }

    rendreRecap();
    fermerPanier();
    const modal = document.getElementById("order-modal");
    const overlay = document.getElementById("overlay");
    if (modal) modal.classList.add("show");
    if (overlay) overlay.classList.add("show");
  })();
}

function fermerCommande() {
  const modal = document.getElementById("order-modal");
  const overlay = document.getElementById("overlay");
  if (modal) modal.classList.remove("show");
  if (overlay) overlay.classList.remove("show");
}

// Affiche ou masque le champ adresse selon le mode de récupération
function majChampAdresse() {
  const choisi = document.querySelector('input[name="mode"]:checked');
  const livraison = choisi && choisi.value === "Livraison à domicile";
  const champ = document.getElementById("adresse-field");
  const champsAdresse = document.querySelectorAll("[data-delivery-required]");
  if (!champ) return;
  champ.hidden = !livraison;
  champsAdresse.forEach((input) => {
    input.required = !!livraison;
    if (!livraison && input.name !== "adressePays") input.value = "";
    if (livraison && input.name === "adressePays" && !input.value.trim()) {
      input.value = "Deutschland";
    }
  });

  // Met à jour le total affiché (frais de livraison) si la modale est ouverte
  const modal = document.getElementById("order-modal");
  if (modal && modal.classList.contains("show")) rendreRecap();
}

function lireAdresseLivraison() {
  const rue = (document.getElementById("adresseRue")?.value || "").trim();
  const numero = (document.getElementById("adresseNumero")?.value || "").trim();
  const cp = (document.getElementById("adresseCp")?.value || "").trim();
  const ville = (document.getElementById("adresseVille")?.value || "").trim();
  const pays = (document.getElementById("adressePays")?.value || "").trim();

  return {
    rue,
    numero,
    cp,
    ville,
    pays,
    complete: `${rue} ${numero}, ${cp} ${ville}, ${pays}`,
  };
}

function adresseLivraisonValide(adresse) {
  return (
    adresse.rue.length >= 2 &&
    adresse.numero.length >= 1 &&
    /^[0-9]{5}$/.test(adresse.cp) &&
    adresse.ville.length >= 2 &&
    adresse.pays.length >= 2
  );
}

function initBoutonsRetour() {
  document.querySelectorAll("[data-back-button]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "index.html#hero";
      }
    });
  });
}

async function actualiserStockFrontend(stockUpdates) {
  if (
    Array.isArray(stockUpdates) &&
    stockUpdates.length > 0 &&
    typeof window.appliquerMiseAJourStock === "function"
  ) {
    window.appliquerMiseAJourStock(stockUpdates);
  }

  if (typeof window.rechargerProduitsType === "function") {
    await window.rechargerProduitsType();
    return;
  }

  document.dispatchEvent(new CustomEvent("basestockchange"));
}

function redirigerVersConfirmationSiPaypal() {
  const params = new URLSearchParams(window.location.search);
  if (!params.get("paypal")) return false;
  if (window.location.pathname.endsWith("confirmation.html")) return false;

  const cible = new URL("confirmation.html", window.location.href);
  params.forEach((valeur, cle) => cible.searchParams.set(cle, valeur));
  window.location.replace(cible.toString());
  return true;
}

async function gererRetourPaypal() {
  redirigerVersConfirmationSiPaypal();
}

// Validation + traitement de la commande
async function traiterCommande(event) {
  event.preventDefault();
  const form = event.target;

  const user =
    typeof exigerConnexionPourCommande === "function"
      ? await exigerConnexionPourCommande()
      : null;
  if (!user) return;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const nomComplet = (data.get("nomComplet") || "").trim();
  const telephone = (data.get("telephone") || "").trim();
  const email = (user.email || data.get("email") || "").trim();
  const mode = data.get("mode");
  const adresseLivraison = lireAdresseLivraison();

  if (!telephoneValide(telephone)) {
    afficherToast(t("toast.invalidPhone"));
    document.getElementById("telephone").focus();
    return;
  }

  if (mode === "Livraison à domicile" && !adresseLivraisonValide(adresseLivraison)) {
    afficherToast(t("toast.deliveryNeeded"));
    document.getElementById("adresseRue")?.focus();
    return;
  }

  const estLivraison = mode === "Livraison à domicile";
  const fraisLivraison = estLivraison ? FRAIS_LIVRAISON : 0;
  const sousTotal = calculerTotal();
  const totalCommande = sousTotal + fraisLivraison;

  let articlesTxt = panier
    .map(
      (l) =>
        `• ${l.nom} × ${l.quantite}
  - ${t("product.specType")} : ${l.type || "-"}
  - ${t("product.specSize")} : ${l.taille || "-"}
  - ${t("product.specColor")} : ${l.couleur || "-"}
  - ${t("product.specLace")} : ${l.tailleLace || "-"}
  - ${t("order.lineSubtotal")} : ${formaterPrix(l.prix * l.quantite)}`
    )
    .join("\n\n");

  // Explication des frais de livraison dans le mail (cliente + admin)
  if (estLivraison) {
    articlesTxt += `\n\n${t("order.deliveryFeeLabel")} : ${formaterPrix(fraisLivraison)}
${t("order.deliveryFeeNote", { montant: formaterPrix(fraisLivraison) })}`;
  }

  const modeTraduit = estLivraison ? t("order.delivery") : t("order.pickup");
  const adresseTraduit = estLivraison ? adresseLivraison.complete : t("order.pickupAddress");

  const params = {
    nom_client: nomComplet,
    contact_client: `${telephone} / ${email}`,
    telephone_client: telephone,
    email_du_client: email,
    mode_recuperation: modeTraduit,
    adresse: adresseTraduit,
    adresse_details: estLivraison ? adresseLivraison : null,
    articles: articlesTxt,
    sous_total: formaterPrix(sousTotal),
    frais_livraison: formaterPrix(fraisLivraison),
    frais_livraison_num: fraisLivraison,
    total: formaterPrix(totalCommande),
    email_client: email,
    langue_commande: langueActuelle,
  };

  const submitBtn = form.querySelector(".order-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = t("order.sending");

  try {
    if (typeof enregistrerCommandeBase === "function") {
      const resultatBase = await enregistrerCommandeBase(params, panier);
      if (resultatBase?.approveUrl) {
        localStorage.setItem(PENDING_PAYPAL_CART_CLE, JSON.stringify(panier));
        window.location.href = resultatBase.approveUrl;
        return;
      }
      if (resultatBase?.skipped) {
        throw new Error("Aucun produit Supabase à payer via PayPal.");
      }
    }
  } catch (err) {
    console.error("Erreur commande backend :", err);
    afficherToast(err.message || t("toast.emailErr"));
    submitBtn.disabled = false;
    submitBtn.textContent = t("order.confirm");
    return;
  }

  submitBtn.disabled = false;
  submitBtn.textContent = t("order.confirm");
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer;
function afficherToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

/* ============================================================
   MODALE VIDÉO
   ============================================================ */
function ouvrirVideo(src, nom) {
  if (!src) return;
  const modal = document.getElementById("video-modal");
  const player = document.getElementById("video-player");
  if (!modal || !player) return;
  const titre = document.getElementById("video-title");
  if (titre) titre.textContent = nom || "";
  player.src = src;
  modal.classList.add("show");
  player.play().catch(() => {});
}

function fermerVideo() {
  const modal = document.getElementById("video-modal");
  const player = document.getElementById("video-player");
  if (!modal || !player) return;
  player.pause();
  player.removeAttribute("src");
  player.load();
  modal.classList.remove("show");
}

/* ============================================================
   ÉVÉNEMENTS (tous protégés : éléments optionnels selon la page)
   ============================================================ */
function brancherEvenements() {
  const cartItems = document.getElementById("cart-items");
  if (cartItems) {
    cartItems.addEventListener("click", (e) => {
      const bouton = e.target.closest("[data-action]");
      if (!bouton) return;
      const uid = bouton.dataset.uid;
      const action = bouton.dataset.action;
      if (action === "plus") changerQuantite(uid, 1);
      else if (action === "moins") changerQuantite(uid, -1);
      else if (action === "retirer") retirerDuPanier(uid);
    });
  }

  const cartToggle = document.getElementById("cart-toggle");
  if (cartToggle) cartToggle.addEventListener("click", ouvrirPanier);

  const cartClose = document.getElementById("cart-close");
  if (cartClose) cartClose.addEventListener("click", fermerPanier);

  const overlay = document.getElementById("overlay");
  if (overlay) {
    overlay.addEventListener("click", () => {
      fermerPanier();
      fermerCommande();
    });
  }

  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) checkoutBtn.addEventListener("click", ouvrirCommande);

  const orderClose = document.getElementById("order-close");
  if (orderClose) orderClose.addEventListener("click", fermerCommande);

  document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener("change", majChampAdresse);
  });

  const orderForm = document.getElementById("order-form");
  if (orderForm) orderForm.addEventListener("submit", traiterCommande);

  const videoClose = document.getElementById("video-close");
  if (videoClose) videoClose.addEventListener("click", fermerVideo);

  const videoModal = document.getElementById("video-modal");
  if (videoModal) {
    videoModal.addEventListener("click", (e) => {
      if (e.target.id === "video-modal") fermerVideo();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      fermerPanier();
      fermerCommande();
      fermerVideo();
    }
  });
}

/* ============================================================
   INITIALISATION
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initBoutonsRetour();
  chargerPanier();
  majPanier();
  brancherEvenements();
  if (!window.location.pathname.endsWith("confirmation.html")) {
    gererRetourPaypal();
  }
});

// Re-traduit le contenu dynamique du panier / récapitulatif au changement de langue
document.addEventListener("langchange", () => {
  majPanier();
  const modal = document.getElementById("order-modal");
  if (modal && modal.classList.contains("show")) rendreRecap();
});
