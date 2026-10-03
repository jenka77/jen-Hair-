const STATUTS_SUIVI = ["paid", "preparing", "delivered"];

let etatConfirmationCourant = { type: null, message: null };

function htmlTitre(cle) {
  return `<h1 class="confirmation-title">${t(cle)}</h1>`;
}

function htmlLead(cle) {
  return `<p class="confirmation-lead">${t(cle)}</p>`;
}

function htmlNote(cle) {
  return `<p class="confirmation-note">${t(cle)}</p>`;
}

function libelleModeRecuperation(mode) {
  const valeur = String(mode || "").trim().toLowerCase();
  if (valeur === "pickup" || /retrait|boutique/i.test(valeur)) {
    return t("confirm.pickupModeValue");
  }
  if (valeur === "delivery" || /livraison|domicile/i.test(valeur)) {
    return t("confirm.deliveryModeValue");
  }
  return mode || "—";
}

function adresseAffichable(adresse) {
  const val = String(adresse || "").trim();
  return val && val !== "—" ? val : "";
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

function commandeEstPayee(status) {
  const s = String(status || "").toLowerCase();
  return s === "paid" || s === "accepted" || s === "preparing" || s === "ready" || s === "delivered";
}

function afficherResumeCommande(data) {
  const { order, items } = data;
  const payee = commandeEstPayee(order.status);
  const lignes = (items || [])
    .map(
      (item) => `
      <li>
        <span>${item.name} × ${item.quantity}</span>
        <strong>${formaterPrix(item.lineTotal)}</strong>
      </li>`
    )
    .join("");

  const adresse = adresseAffichable(order.deliveryAddress);

  const titre = payee ? htmlTitre("confirm.successTitle") : htmlTitre("confirm.pendingTitle");
  const lead = payee ? htmlLead("confirm.successLead") : htmlLead("confirm.pendingLead");
  const notesEmail = payee
    ? `${htmlNote("confirm.emailNote")}${htmlNote("confirm.readyEmailNote")}`
    : htmlNote("confirm.pendingEmailNote");

  return `
    <div class="confirmation-success${payee ? "" : " confirmation-pending"}">
      ${titre}
      ${lead}

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
        <p class="confirmation-mode">${libelleModeRecuperation(order.pickupMode)}</p>
        ${adresse ? `<p class="confirmation-address">${adresse}</p>` : ""}
      </div>

      ${notesEmail}

      <div class="confirmation-actions">
        <a class="btn-order" href="maison.html">${t("confirm.backShop")}</a>
        <a class="btn-outline" href="index.html#contact">${t("confirm.contact")}</a>
      </div>
    </div>`;
}

function afficherEtat(type, messageKeyOrText) {
  const contenu = document.getElementById("confirmation-content");
  if (!contenu) return;

  etatConfirmationCourant = { type, message: messageKeyOrText };

  if (type === "loading") {
    if (messageKeyOrText && I18N.fr[messageKeyOrText]) {
      contenu.innerHTML = htmlLead(messageKeyOrText);
    } else if (messageKeyOrText) {
      contenu.innerHTML = `<p class="confirmation-lead">${messageKeyOrText}</p>`;
    } else {
      contenu.innerHTML = htmlLead("confirm.loading");
    }
    return;
  }

  if (type === "cancel") {
    contenu.innerHTML = `
      <div class="confirmation-state cancel">
        ${htmlTitre("confirm.cancelTitle")}
        ${htmlLead("confirm.cancelLead")}
        <div class="confirmation-actions">
          <a class="btn-order" href="maison.html">${t("confirm.backShop")}</a>
        </div>
      </div>`;
    return;
  }

  if (type === "error") {
    const messageHtml =
      messageKeyOrText && !I18N.fr[messageKeyOrText]
        ? `<p class="confirmation-lead">${messageKeyOrText}</p>`
        : htmlLead("confirm.errorLead");

    contenu.innerHTML = `
      <div class="confirmation-state error">
        ${htmlTitre("confirm.errorTitle")}
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
  etatConfirmationCourant = { type: "success", message: null };
  nettoyerUrl(orderId);
  return data;
}

async function relancerFinalisationStripe(orderId, sessionId) {
  if (!orderId || !sessionId) return null;
  for (let i = 0; i < 10; i += 1) {
    let data;
    try {
      data = await chargerResumeCommande(orderId);
    } catch {
      break;
    }
    if (commandeEstPayee(data.order.status)) return data;

    try {
      await confirmerCommandeStripe(orderId, sessionId);
    } catch (err) {
      console.warn("Relance confirmation Stripe :", err.message);
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  try {
    return await chargerResumeCommande(orderId);
  } catch {
    return null;
  }
}

async function attendreSessionAuth(msMax = 10000) {
  if (typeof obtenirTokenAuth !== "function") return null;
  const debut = Date.now();
  while (Date.now() - debut < msMax) {
    const token = await obtenirTokenAuth();
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return null;
}

async function confirmerStripeAvecRetry(orderId, sessionId) {
  let derniereErreur = null;
  for (let i = 0; i < 3; i += 1) {
    try {
      return await confirmerCommandeStripe(orderId, sessionId);
    } catch (err) {
      derniereErreur = err;
      await attendreSessionAuth(4000);
    }
  }
  throw derniereErreur || new Error("Confirmation impossible");
}

async function traiterRetourStripe() {
  const params = new URLSearchParams(window.location.search);
  const statutStripe = params.get("stripe");
  const orderId = params.get("order_id");
  const sessionId = params.get("session_id");

  if (statutStripe === "cancel") {
    afficherEtat("cancel");
    nettoyerUrl();
    return true;
  }

  if (statutStripe !== "success" || !orderId || !sessionId) {
    return false;
  }

  try {
    afficherEtat("loading", "confirm.processing");
    await attendreSessionAuth(8000);
    const resultat = await confirmerStripeAvecRetry(orderId, sessionId);

    localStorage.removeItem("jf_pending_paypal_cart");
    if (typeof panier !== "undefined") {
      panier = [];
      if (typeof sauverPanier === "function") sauverPanier();
      if (typeof majPanier === "function") majPanier();
    }

    document.dispatchEvent(new CustomEvent("basestockchange"));
    let data = await chargerEtAfficherCommande(orderId);
    if (!commandeEstPayee(data?.order?.status)) {
      data = (await relancerFinalisationStripe(orderId, sessionId)) || data;
      const contenu = document.getElementById("confirmation-content");
      if (contenu && data) contenu.innerHTML = afficherResumeCommande(data);
    }

    if (typeof afficherToast === "function") {
      if (commandeEstPayee(data?.order?.status)) {
        const numero = resultat.orderNumber || data?.order?.orderNumber || orderId.slice(0, 8).toUpperCase();
        afficherToast(t("confirm.toastSuccess", { number: numero }));
      } else {
        afficherToast(t("confirm.pendingToast"));
      }
    }
  } catch (err) {
    console.error("Erreur confirmation Stripe :", err);
    try {
      let data = await relancerFinalisationStripe(orderId, sessionId);
      if (!data) data = await chargerEtAfficherCommande(orderId);
      else {
        const contenu = document.getElementById("confirmation-content");
        if (contenu) contenu.innerHTML = afficherResumeCommande(data);
        nettoyerUrl(orderId);
      }
      if (typeof afficherToast === "function") {
        afficherToast(
          commandeEstPayee(data?.order?.status) ? t("confirm.toastSuccess", { number: data.order.orderNumber }) : t("confirm.pendingToast")
        );
      }
    } catch (resumeErr) {
      afficherEtat(
        "error",
        typeof traduireErreurApi === "function"
          ? traduireErreurApi(err.message, "confirm.errorLead")
          : err.message || t("confirm.errorLead")
      );
    }
  }
  return true;
}

async function traiterRetourPaypal() {
  if (await traiterRetourStripe()) return;

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
      afficherEtat(
        "error",
        typeof traduireErreurApi === "function" ? traduireErreurApi(err.message) : err.message
      );
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
    try {
      await chargerEtAfficherCommande(orderId);
      return;
    } catch (resumeErr) {
      afficherEtat(
        "error",
        typeof traduireErreurApi === "function"
          ? traduireErreurApi(err.message, "confirm.errorLead")
          : err.message || t("confirm.errorLead")
      );
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
    return;
  }

  const { type, message } = etatConfirmationCourant;
  if (type && type !== "success") {
    afficherEtat(type, message);
  }
});
