/* ============================================================
   Jen's & Flora — Interface admin (gestion commandes)
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

async function tenterConnexion(motDePasse) {
  enregistrerMotDePasse(motDePasse);
  try {
    await chargerCommandes();
    afficherApp(true);
    return true;
  } catch (err) {
    deconnecterAdmin();
    throw err;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("admin-login-form");
  const loginError = document.getElementById("admin-login-error");

  const loginSubmit = loginForm?.querySelector('button[type="submit"]');

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginError) {
      loginError.hidden = true;
      loginError.textContent = "";
      loginError.className = "account-message account-message--error";
    }

    const mdp = document.getElementById("admin-password")?.value || "";
    if (!mdp.trim()) return;

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
            "Mot de passe incorrect. Vérifiez ADMIN_PASSWORD sur Render (doit être identique à backend/.env).";
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
  });

  document.getElementById("admin-logout")?.addEventListener("click", () => {
    deconnecterAdmin();
    afficherApp(false);
    document.getElementById("admin-password").value = "";
  });

  document.getElementById("admin-refresh")?.addEventListener("click", () => {
    chargerCommandes().catch((err) => alert(err.message));
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

  if (motDePasseAdmin()) {
    tenterConnexion(motDePasseAdmin()).catch(() => afficherApp(false));
  } else {
    afficherApp(false);
  }
});
