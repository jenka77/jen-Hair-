const STATUTS_SUIVI = ["paid", "preparing", "delivered"];

function htmlTrilingue(cle, variant = "default") {
  const all = tAll(cle);
  const lines = `
      <p class="confirmation-trilingual-line lang-fr"><span>FR</span> ${all.fr}</p>
      <p class="confirmation-trilingual-line lang-de"><span>DE</span> ${all.de}</p>
      <p class="confirmation-trilingual-line lang-en"><span>EN</span> ${all.en}</p>`;

  const classes = {
    title: "confirmation-trilingual confirmation-trilingual-title",
    lead: "confirmation-trilingual confirmation-trilingual-lead",
    note: "confirmation-trilingual confirmation-trilingual-note",
    default: "confirmation-trilingual",
  };

  return `<div class="${classes[variant] || classes.default}">${lines}</div>`;
}

function traduireModeRecuperation(mode) {
  const valeur = String(mode || "").trim();
  if (/retrait|boutique/i.test(valeur)) {
    return tAll("confirm.pickupModeValue");
  }
  if (/livraison|domicile/i.test(valeur)) {
    return tAll("confirm.deliveryModeValue");
  }
  return { fr: valeur, de: valeur, en: valeur };
}

function htmlModeRecuperation(mode) {
  const all = traduireModeRecuperation(mode);
  return `
    <div class="confirmation-trilingual confirmation-trilingual-compact">
      <p class="confirmation-trilingual-line lang-fr"><span>FR</span> ${all.fr}</p>
      <p class="confirmation-trilingual-line lang-de"><span>DE</span> ${all.de}</p>
      <p class="confirmation-trilingual-line lang-en"><span>EN</span> ${all.en}</p>
    </div>`;
}

function statutLibelle(status) {
  const key = `confirm.status.${status}`;
  const traduit = t(key);
  return traduit !== key ? traduit : t("confirm.status.unknown");
}

function statutClasse(status) {
  if (status === "paid" || status === "accepted") return "paid";
  if (status === "preparing") return "preparing";
  if (status === "delivered") return "delivered";
  if (status === "pending_payment") return "pending";
  if (status === "cancelled") return "cancelled";
  return "unknown";
}

function etapeActive(status, etape) {
  const indexStatut = STATUTS_SUIVI.indexOf(status === "accepted" ? "paid" : status);
  const indexEtape = STATUTS_SUIVI.indexOf(etape);
  if (indexStatut < 0) return etape === "paid" && status === "pending_payment";
  return indexEtape <= indexStatut;
}

function afficherSuiviCommande(status) {
  const etapes = [
    { id: "paid", label: t("confirm.step.paid") },
    { id: "preparing", label: t("confirm.step.preparing") },
    { id: "delivered", label: t("confirm.step.delivered") },
  ];

  return `
    <ol class="order-tracker">
      ${etapes
        .map(
          (etape) => `
        <li class="order-tracker-step${etapeActive(status, etape.id) ? " active" : ""}">
          <span class="order-tracker-dot"></span>
          <span>${etape.label}</span>
        </li>`
        )
        .join("")}
    </ol>`;
}

function afficherResumeCommande(data) {
  const { order, items } = data;
  const lignes = (items || [])
    .map(
      (item) => `
      <li>
        <span>${item.name} × ${item.quantity}</span>
        <strong>${formaterPrix(item.lineTotal)}</strong>
      </li>`
    )
    .join("");

  return `
    <div class="confirmation-success">
      ${htmlTrilingue("confirm.successTitle", "title")}
      ${htmlTrilingue("confirm.successLead", "lead")}

      <div class="confirmation-meta">
        <p><span>${t("confirm.orderNumber")}</span> <strong>${order.orderNumber}</strong></p>
        <p><span>${t("confirm.statusLabel")}</span> <strong class="status-badge ${statutClasse(order.status)}">${statutLibelle(order.status)}</strong></p>
      </div>

      ${afficherSuiviCommande(order.status)}

      <div class="confirmation-block">
        <h2>${t("confirm.articles")}</h2>
        <ul class="confirmation-items">${lignes}</ul>
        <p class="confirmation-total"><span>${t("confirm.total")}</span> <strong>${formaterPrix(order.totalAmount)}</strong></p>
      </div>

      <div class="confirmation-block">
        <h2>${t("confirm.deliveryTitle")}</h2>
        ${htmlModeRecuperation(order.pickupMode)}
        <p class="confirmation-address">${order.deliveryAddress || ""}</p>
      </div>

      ${htmlTrilingue("confirm.emailNote", "note")}
      ${htmlTrilingue("confirm.readyEmailNote", "note")}

      <div class="confirmation-actions">
        <a class="btn-order" href="maison.html">${t("confirm.backShop")}</a>
        <a class="btn-outline" href="index.html#contact">${t("confirm.contact")}</a>
      </div>
    </div>`;
}

function afficherEtat(type, messageKeyOrText) {
  const contenu = document.getElementById("confirmation-content");
  if (!contenu) return;

  if (type === "loading") {
    if (messageKeyOrText && I18N.fr[messageKeyOrText]) {
      contenu.innerHTML = htmlTrilingue(messageKeyOrText, "lead");
    } else if (messageKeyOrText) {
      contenu.innerHTML = `<div class="confirmation-trilingual confirmation-trilingual-lead"><p class="confirmation-trilingual-line">${messageKeyOrText}</p></div>`;
    } else {
      contenu.innerHTML = htmlTrilingue("confirm.loading", "lead");
    }
    return;
  }

  if (type === "cancel") {
    contenu.innerHTML = `
      <div class="confirmation-state cancel">
        ${htmlTrilingue("confirm.cancelTitle", "title")}
        ${htmlTrilingue("confirm.cancelLead", "lead")}
        <div class="confirmation-actions">
          <a class="btn-order" href="maison.html">${t("confirm.backShop")}</a>
        </div>
      </div>`;
    return;
  }

  if (type === "error") {
    const messageHtml =
      messageKeyOrText && !I18N.fr[messageKeyOrText]
        ? `<div class="confirmation-trilingual confirmation-trilingual-lead"><p class="confirmation-trilingual-line">${messageKeyOrText}</p></div>`
        : htmlTrilingue("confirm.errorLead", "lead");

    contenu.innerHTML = `
      <div class="confirmation-state error">
        ${htmlTrilingue("confirm.errorTitle", "title")}
        ${messageHtml}
        <div class="confirmation-actions">
          <a class="btn-order" href="maison.html">${t("confirm.backShop")}</a>
          <a class="btn-outline" href="index.html#contact">${t("confirm.contact")}</a>
        </div>
      </div>`;
  }
}

function nettoyerUrl(orderId) {
  const url = new URL(window.location.href);
  const parts = url.pathname.split("/");
  parts[parts.length - 1] = "confirmation.html";
  url.pathname = parts.join("/");
  url.search = orderId ? `?order_id=${encodeURIComponent(orderId)}` : "";
  window.history.replaceState({}, "", url.toString());
}

async function chargerEtAfficherCommande(orderId) {
  const data = await chargerResumeCommande(orderId);
  const contenu = document.getElementById("confirmation-content");
  if (contenu) contenu.innerHTML = afficherResumeCommande(data);
  nettoyerUrl(orderId);
}

async function traiterRetourPaypal() {
  const params = new URLSearchParams(window.location.search);
  const statutPaypal = params.get("paypal");
  const orderId = params.get("order_id");
  const paypalOrderId = params.get("token");

  if (statutPaypal === "cancel") {
    afficherEtat("cancel");
    nettoyerUrl();
    return;
  }

  if (!statutPaypal && orderId) {
    try {
      await chargerEtAfficherCommande(orderId);
    } catch (err) {
      afficherEtat("error", err.message);
    }
    return;
  }

  if (statutPaypal !== "success" || !orderId || !paypalOrderId) {
    afficherEtat("error");
    return;
  }

  try {
    afficherEtat("loading", "confirm.processing");
    const resultat = await capturerCommandePaypal(orderId, paypalOrderId);

    localStorage.removeItem("jf_pending_paypal_cart");
    if (typeof panier !== "undefined") {
      panier = [];
      if (typeof sauverPanier === "function") sauverPanier();
      if (typeof majPanier === "function") majPanier();
    }

    document.dispatchEvent(new CustomEvent("basestockchange"));
    await chargerEtAfficherCommande(orderId);

    if (typeof afficherToast === "function") {
      const numero = resultat.orderNumber || orderId.slice(0, 8).toUpperCase();
      afficherToast(t("confirm.toastSuccess", { number: numero }));
    }
  } catch (err) {
    console.error("Erreur confirmation :", err);
    // Si la capture a déjà eu lieu, afficher quand même la commande.
    try {
      await chargerEtAfficherCommande(orderId);
      return;
    } catch (resumeErr) {
      afficherEtat("error", err.message || t("confirm.errorLead"));
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  traiterRetourPaypal();
});

document.addEventListener("langchange", () => {
  const orderId = new URLSearchParams(window.location.search).get("order_id");
  if (orderId) {
    chargerEtAfficherCommande(orderId).catch(() => {});
  }
});
