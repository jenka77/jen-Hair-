/* ============================================================
   Jen's & Floran — Interface admin (gestion commandes)
   ============================================================ */

const ADMIN_SESSION_KEY = "jf_admin_password";

const STATUTS = [
  { value: "pending_payment", label: "En attente de paiement" },
  { value: "paid", label: "Payée" },
  { value: "preparing", label: "En préparation" },
  { value: "ready", label: "Prête (retrait)" },
  { value: "delivered", label: "Livrée" },
  { value: "accepted", label: "Confirmée" },
  { value: "cancelled", label: "Annulée" },
];

let commandesCache = [];
let avisCache = [];
let ongletAdminActif = "orders";

function apiBase() {
  if (typeof API_BASE_URL !== "undefined") return API_BASE_URL;
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:4000`;
  }
  return "https://jen-hair-api.onrender.com";
}

function echapperHtml(texte) {
  return String(texte ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function motDePasseAdmin() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) || "";
}

function enregistrerMotDePasse(mdp) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, mdp);
}

function deconnecterAdmin() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

async function requeteAdmin(chemin, options = {}) {
  const reponse = await fetch(`${apiBase()}${chemin}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": motDePasseAdmin(),
      ...(options.headers || {}),
    },
  });

  const texte = await reponse.text();
  let data = null;
  try {
    data = texte ? JSON.parse(texte) : null;
  } catch {
    data = { error: texte };
  }

  if (!reponse.ok) {
    throw new Error(data?.error || `Erreur ${reponse.status}`);
  }
  return data;
}

function libelleStatut(status) {
  return STATUTS.find((s) => s.value === status)?.label || status;
}

function formaterDate(iso) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formaterPrixAdmin(montant) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    Number(montant) || 0
  );
}

function extraireEmail(contact) {
  const parts = String(contact || "").split(" / ");
  return (parts[1] || parts[0] || "").trim();
}

function extraireTelephone(contact) {
  const parts = String(contact || "").split(" / ");
  return (parts[0] || "").trim();
}

function optionsStatut(valeurActuelle) {
  return STATUTS.map(
    (s) =>
      `<option value="${s.value}"${s.value === valeurActuelle ? " selected" : ""}>${s.label}</option>`
  ).join("");
}

function afficherCommandes(orders) {
  const conteneur = document.getElementById("admin-orders");
  if (!conteneur) return;

  if (!orders.length) {
    conteneur.innerHTML = `<p class="account-empty">Aucune commande pour ce filtre.</p>`;
    return;
  }

  conteneur.innerHTML = orders
    .map(
      (order) => `
    <article class="admin-order-card" data-order-id="${order.id}">
      <div class="admin-order-head">
        <div>
          <p class="order-card-number">${order.orderNumber}</p>
          <p class="order-card-date">${formaterDate(order.createdAt)}</p>
        </div>
        <span class="status-badge admin-status-badge ${order.status}">${libelleStatut(order.status)}</span>
      </div>
      <ul class="admin-order-meta">
        <li><span>Cliente</span><strong>${echapperHtml(order.customerName)}</strong></li>
        <li><span>Téléphone</span><strong>${echapperHtml(extraireTelephone(order.customerContact))}</strong></li>
        <li><span>Email</span><strong>${echapperHtml(extraireEmail(order.customerContact))}</strong></li>
        <li><span>Mode</span><strong>${echapperHtml(order.pickupMode || "—")}</strong></li>
        <li><span>Adresse</span><strong>${echapperHtml(order.deliveryAddress || "—")}</strong></li>
        <li><span>Total</span><strong>${formaterPrixAdmin(order.totalAmount)}</strong></li>
      </ul>
      <div class="admin-order-actions">
        <label class="admin-status-field">
          <span>Modifier le statut</span>
          <select class="admin-status-select" data-order-id="${order.id}">
            ${optionsStatut(order.status)}
          </select>
        </label>
        <button type="button" class="auth-btn auth-btn--fill admin-save-status" data-order-id="${order.id}">
          Enregistrer
        </button>
      </div>
      <p class="admin-order-feedback" data-feedback="${order.id}" hidden></p>
    </article>`
    )
    .join("");
}

function filtrerCommandes() {
  const filtre = document.getElementById("admin-filter-status")?.value || "";
  const liste = filtre
    ? commandesCache.filter((o) => o.status === filtre)
    : commandesCache;
  afficherCommandes(liste);
}

async function chargerCommandes() {
  const conteneur = document.getElementById("admin-orders");
  if (conteneur) {
    conteneur.innerHTML = `<p class="account-loading">Chargement des commandes…</p>`;
  }

  const data = await requeteAdmin("/api/orders");
  commandesCache = data.orders || [];
  filtrerCommandes();
}

async function mettreAJourStatut(orderId, status) {
  const feedback = document.querySelector(`[data-feedback="${orderId}"]`);
  if (feedback) {
    feedback.hidden = false;
    feedback.textContent = "Mise à jour…";
    feedback.className = "admin-order-feedback";
  }

  try {
    const data = await requeteAdmin(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    commandesCache = commandesCache.map((o) =>
      o.id === orderId ? { ...o, ...data.order } : o
    );
    filtrerCommandes();

    if (feedback) {
      let message = `Statut mis à jour : ${libelleStatut(status)}.`;
      if (data.email?.sent) {
        message += " E-mail envoyé à la cliente.";
      } else if (data.email?.reason === "statut_sans_email") {
        message += " Aucun e-mail prévu pour ce statut.";
      } else if (data.email?.reason === "statut_inchange") {
        message += " Statut identique — aucun nouvel e-mail.";
      } else if (data.email?.error) {
        message += ` E-mail non envoyé : ${data.email.error}`;
        feedback.classList.add("admin-order-feedback--error");
      } else if (data.email?.reason === "email_introuvable") {
        message += " E-mail cliente introuvable en base.";
        feedback.classList.add("admin-order-feedback--error");
      }
      feedback.textContent = message;
      if (!feedback.classList.contains("admin-order-feedback--error")) {
        feedback.classList.add("admin-order-feedback--ok");
      }
    }
  } catch (err) {
    if (feedback) {
      feedback.textContent = err.message;
      feedback.classList.add("admin-order-feedback--error");
    }
  }
}

function afficherApp(connecte) {
  const login = document.getElementById("admin-login");
  const app = document.getElementById("admin-app");
  if (login) login.toggleAttribute("hidden", connecte);
  if (app) app.toggleAttribute("hidden", !connecte);
}

function etoilesAdmin(note) {
  return "★".repeat(Math.min(5, Math.max(0, Number(note) || 0))) +
    "☆".repeat(5 - Math.min(5, Math.max(0, Number(note) || 0)));
}

function afficherAvisAdmin(reviews) {
  const conteneur = document.getElementById("admin-reviews");
  if (!conteneur) return;

  if (!reviews.length) {
    conteneur.innerHTML = `<p class="account-empty">Aucun avis pour le moment.</p>`;
    return;
  }

  conteneur.innerHTML = reviews
    .map(
      (avis) => `
    <article class="admin-review-card" data-review-id="${avis.id}">
      <div class="admin-order-head">
        <div>
          <p class="order-card-number">${echapperHtml(avis.authorName)} · ${etoilesAdmin(avis.rating)}</p>
          <p class="order-card-date">${formaterDate(avis.createdAt)}${avis.authorEmail ? ` · ${echapperHtml(avis.authorEmail)}` : ""}</p>
        </div>
        <span class="status-badge admin-status-badge ${avis.isPublished ? "paid" : "cancelled"}">${avis.isPublished ? "Publié" : "Masqué"}</span>
      </div>
      <blockquote class="admin-review-quote">${echapperHtml(avis.comment)}</blockquote>
      <label class="field admin-reply-field">
        <span>Votre réponse (Jen's &amp; Floran)</span>
        <textarea class="admin-reply-input" data-review-id="${avis.id}" rows="4" maxlength="2000" placeholder="Merci pour votre retour…">${echapperHtml(avis.adminReply || "")}</textarea>
      </label>
      <div class="admin-order-actions">
        <label class="admin-status-field admin-reply-visible">
          <input type="checkbox" class="admin-reply-visible-input" data-review-id="${avis.id}"${avis.replyVisible !== false ? " checked" : ""} />
          <span>Afficher la réponse sur le site</span>
        </label>
        <button type="button" class="auth-btn auth-btn--fill admin-save-reply" data-review-id="${avis.id}">Enregistrer la réponse</button>
      </div>
      <p class="admin-order-feedback" data-review-feedback="${avis.id}" hidden></p>
    </article>`
    )
    .join("");
}

async function chargerAvisAdmin() {
  const conteneur = document.getElementById("admin-reviews");
  if (conteneur) {
    conteneur.innerHTML = `<p class="account-loading">Chargement des avis…</p>`;
  }

  const data = await requeteAdmin("/api/admin/reviews");
  avisCache = data.reviews || [];
  afficherAvisAdmin(avisCache);
}

async function enregistrerReponseAvis(reviewId) {
  const feedback = document.querySelector(`[data-review-feedback="${reviewId}"]`);
  const textarea = document.querySelector(`.admin-reply-input[data-review-id="${reviewId}"]`);
  const visibleInput = document.querySelector(`.admin-reply-visible-input[data-review-id="${reviewId}"]`);

  if (feedback) {
    feedback.hidden = false;
    feedback.textContent = "Enregistrement…";
    feedback.className = "admin-order-feedback";
  }

  try {
    const data = await requeteAdmin(`/api/admin/reviews/${reviewId}`, {
      method: "PATCH",
      body: JSON.stringify({
        adminReply: textarea?.value.trim() || null,
        replyVisible: visibleInput?.checked !== false,
      }),
    });

    avisCache = avisCache.map((a) => (a.id === reviewId ? { ...a, ...data.review } : a));
    afficherAvisAdmin(avisCache);

    if (feedback) {
      feedback.textContent = "Réponse enregistrée.";
      feedback.classList.add("admin-order-feedback--ok");
    }
  } catch (err) {
    if (feedback) {
      feedback.textContent = err.message;
      feedback.classList.add("admin-order-feedback--error");
    }
  }
}

function basculerOngletAdmin(onglet) {
  ongletAdminActif = onglet;

  document.querySelectorAll(".admin-tab").forEach((btn) => {
    const actif = btn.dataset.adminTab === onglet;
    btn.classList.toggle("active", actif);
    btn.setAttribute("aria-selected", actif ? "true" : "false");
  });

  document.getElementById("admin-panel-orders")?.toggleAttribute("hidden", onglet !== "orders");
  document.getElementById("admin-panel-reviews")?.toggleAttribute("hidden", onglet !== "reviews");

  const titre = document.getElementById("admin-page-title");
  if (titre) titre.textContent = onglet === "reviews" ? "Avis clients" : "Commandes";
}

async function actualiserOngletAdmin() {
  if (ongletAdminActif === "reviews") {
    await chargerAvisAdmin();
  } else {
    await chargerCommandes();
  }
}

async function tenterConnexion(motDePasse) {
  enregistrerMotDePasse(motDePasse);
  try {
    await chargerCommandes();
    basculerOngletAdmin("orders");
    afficherApp(true);
    return true;
  } catch (err) {
    deconnecterAdmin();
    throw err;
  }
}

async function connecterAdmin() {
  const loginError = document.getElementById("admin-login-error");
  const loginSubmit = document.getElementById("admin-login-btn");
  const mdp = document.getElementById("admin-password")?.value || "";

  if (!mdp.trim()) {
    if (loginError) {
      loginError.hidden = false;
      loginError.className = "account-message account-message--error";
      loginError.textContent = "Veuillez saisir le mot de passe admin.";
    }
    return;
  }

  if (loginError) {
    loginError.hidden = true;
    loginError.textContent = "";
    loginError.className = "account-message account-message--error";
  }

  if (loginSubmit) {
    loginSubmit.disabled = true;
    loginSubmit.textContent = "Connexion…";
  }

  const slowTimer = setTimeout(() => {
    if (!loginError) return;
    loginError.hidden = false;
    loginError.className = "account-message account-message--success";
    loginError.textContent =
      "Le serveur démarre (première connexion). Patientez jusqu'à 60 secondes…";
  }, 8000);

  try {
    await tenterConnexion(mdp);
  } catch (err) {
    if (loginError) {
      loginError.hidden = false;
      loginError.className = "account-message account-message--error";
      if (err.message === "Accès admin refusé") {
        loginError.textContent =
          "Mot de passe incorrect. Vérifiez ADMIN_PASSWORD sur Render (identique à backend/.env).";
      } else if (err.message.includes("Failed to fetch") || err.name === "TypeError") {
        loginError.textContent =
          "Impossible de joindre le serveur. Attendez 1 minute et réessayez (Render redémarre).";
      } else {
        loginError.textContent = err.message;
      }
    }
  } finally {
    clearTimeout(slowTimer);
    if (loginSubmit) {
      loginSubmit.disabled = false;
      loginSubmit.textContent = "Se connecter";
    }
  }
}

function initAdmin() {
  const loginForm = document.getElementById("admin-login-form");
  const loginBtn = document.getElementById("admin-login-btn");

  loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    connecterAdmin();
  });

  loginBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    connecterAdmin();
  });

  document.getElementById("admin-logout")?.addEventListener("click", () => {
    deconnecterAdmin();
    afficherApp(false);
    const pwd = document.getElementById("admin-password");
    if (pwd) pwd.value = "";
  });

  document.getElementById("admin-refresh")?.addEventListener("click", () => {
    actualiserOngletAdmin().catch((err) => alert(err.message));
  });

  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const onglet = tab.dataset.adminTab;
      if (!onglet || onglet === ongletAdminActif) return;
      basculerOngletAdmin(onglet);
      if (onglet === "reviews" && !avisCache.length) {
        chargerAvisAdmin().catch((err) => alert(err.message));
      }
    });
  });

  document.getElementById("admin-filter-status")?.addEventListener("change", filtrerCommandes);

  document.getElementById("admin-orders")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".admin-save-status");
    if (!btn) return;
    const orderId = btn.dataset.orderId;
    const select = document.querySelector(`.admin-status-select[data-order-id="${orderId}"]`);
    if (!select) return;
    mettreAJourStatut(orderId, select.value);
  });

  document.getElementById("admin-reviews")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".admin-save-reply");
    if (!btn) return;
    enregistrerReponseAvis(btn.dataset.reviewId);
  });

  if (motDePasseAdmin()) {
    tenterConnexion(motDePasseAdmin()).catch(() => afficherApp(false));
  } else {
    afficherApp(false);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdmin);
} else {
  initAdmin();
}
