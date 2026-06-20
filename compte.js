function redirigerApresConnexion() {
  const params = new URLSearchParams(window.location.search);
  const retour = params.get("return");
  if (!retour) return false;
  const cible = retour.startsWith("http") ? null : retour.split("/").pop() || retour;
  if (!cible) return false;
  window.location.href = cible;
  return true;
}

function modeDepuisUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") === "register" ? "register" : "login";
}

function afficherMode(mode) {
  const loginForm = document.getElementById("form-login");
  const registerForm = document.getElementById("form-register");
  const tabs = document.querySelectorAll(".account-tab");

  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });

  if (loginForm) loginForm.hidden = mode !== "login";
  if (registerForm) registerForm.hidden = mode !== "register";
}

function afficherMessage(texte, type = "info") {
  const el = document.getElementById("account-message");
  if (!el) return;
  el.hidden = !texte;
  el.textContent = texte;
  el.className = `account-message account-message--${type}`;
}

function traduireStatut(status) {
  const key = `auth.status.${status}`;
  const traduit = t(key);
  return traduit !== key ? traduit : status;
}

function formaterDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(
      langueActuelle === "de" ? "de-DE" : langueActuelle === "en" ? "en-GB" : "fr-FR",
      { day: "numeric", month: "long", year: "numeric" }
    );
  } catch {
    return iso;
  }
}

function afficherCommandes(orders) {
  const conteneur = document.getElementById("orders-list");
  if (!conteneur) return;

  if (!orders.length) {
    conteneur.innerHTML = `<p class="account-empty">${t("auth.ordersEmpty")}</p>`;
    return;
  }

  conteneur.innerHTML = orders
    .map((order) => {
      const lignes = (order.items || [])
        .map(
          (item) =>
            `<li><span>${item.name} × ${item.quantity}</span><strong>${formaterPrix(item.lineTotal)}</strong></li>`
        )
        .join("");

      return `
        <article class="order-card">
          <div class="order-card-head">
            <div>
              <p class="order-card-number">${order.orderNumber}</p>
              <p class="order-card-date">${formaterDate(order.createdAt)}</p>
            </div>
            <span class="status-badge ${order.status === "paid" ? "paid" : ""}">${traduireStatut(order.status)}</span>
          </div>
          <ul class="order-card-items">${lignes}</ul>
          <p class="order-card-total"><span>${t("auth.orderTotal")}</span> <strong>${formaterPrix(order.totalAmount)}</strong></p>
        </article>`;
    })
    .join("");
}

async function basculerVueConnecte() {
  const guest = document.getElementById("account-guest");
  const user = document.getElementById("account-user");
  const session = await obtenirSession();

  if (session?.user) {
    if (guest) guest.hidden = true;
    if (user) user.hidden = false;
    const emailEl = document.getElementById("account-email");
    if (emailEl) emailEl.textContent = session.user.email || "";

    try {
      const data = await chargerMesCommandes();
      afficherCommandes(data.orders || []);
    } catch (err) {
      const conteneur = document.getElementById("orders-list");
      if (conteneur) {
        conteneur.innerHTML = `<p class="account-empty">${err.message}</p>`;
      }
    }
    return;
  }

  if (guest) guest.hidden = false;
  if (user) user.hidden = true;
  afficherMode(modeDepuisUrl());
}

function nettoyerParamsAuthUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  [
    "code",
    "error",
    "error_code",
    "error_description",
    "sb",
  ].forEach((cle) => url.searchParams.delete(cle));
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

function lireErreurAuthUrl() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const error = params.get("error") || hashParams.get("error");
  if (!error) return null;

  return {
    error,
    code: params.get("error_code") || hashParams.get("error_code") || "",
    description:
      params.get("error_description") || hashParams.get("error_description") || "",
  };
}

function messageErreurAuthUrl(details) {
  if (!details) return "";
  const code = String(details.code || "").toLowerCase();
  if (code === "otp_expired" || code === "flow_state_expired") {
    return t("auth.linkExpired");
  }
  const desc = decodeURIComponent(String(details.description || "").replace(/\+/g, " "));
  return traduireErreurAuth(desc || details.error, "auth.confirmError");
}

async function finaliserRetourAuthEmail() {
  const client = typeof clientAuth === "function" ? clientAuth() : null;
  if (!client) return;

  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const erreurUrl = lireErreurAuthUrl();

  if (erreurUrl) {
    afficherMessage(messageErreurAuthUrl(erreurUrl), "error");
    nettoyerParamsAuthUrl();
    return;
  }

  if (params.has("code")) {
    const { error } = await client.auth.exchangeCodeForSession(params.get("code"));
    if (error) {
      afficherMessage(traduireErreurAuth(error.message, "auth.confirmError"), "error");
    } else if (typeof afficherToast === "function") {
      afficherToast(t("auth.loginSuccess"));
    }
  } else if (hashParams.has("access_token") || hashParams.has("type")) {
    await client.auth.getSession();
  } else {
    return;
  }

  nettoyerParamsAuthUrl();
}

function traduireErreurAuth(message, fallbackKey = "auth.registerError") {
  const msg = String(message || "").toLowerCase();
  if (msg.includes("rate limit") || msg.includes("over_email_send")) {
    return t("auth.rateLimit");
  }
  if (msg.includes("otp_expired") || msg.includes("flow_state_expired") || msg.includes("invalid or has expired")) {
    return t("auth.linkExpired");
  }
  return message || t(fallbackKey);
}

document.addEventListener("DOMContentLoaded", () => {
  finaliserRetourAuthEmail().finally(async () => {
  document.querySelectorAll(".account-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.mode;
      afficherMode(mode);
      const url = new URL(window.location.href);
      url.searchParams.set("mode", mode);
      window.history.replaceState({}, "", url.toString());
    });
  });

  document.getElementById("form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    afficherMessage("");
    const fd = new FormData(e.target);
    try {
      await connecterClient(fd.get("email"), fd.get("password"));
      if (typeof afficherToast === "function") afficherToast(t("auth.loginSuccess"));
      if (redirigerApresConnexion()) return;
      await basculerVueConnecte();
    } catch (err) {
      afficherMessage(traduireErreurAuth(err.message, "auth.loginError"), "error");
    }
  });

  document.getElementById("form-register")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    afficherMessage("");
    const fd = new FormData(e.target);
    const password = fd.get("password");
    const confirm = fd.get("passwordConfirm");
    if (password !== confirm) {
      afficherMessage(t("auth.passwordMismatch"), "error");
      return;
    }
    try {
      const data = await inscrireClient(fd.get("email"), password);
      if (data.session) {
        if (typeof afficherToast === "function") afficherToast(t("auth.registerSuccess"));
        if (redirigerApresConnexion()) return;
        await basculerVueConnecte();
      } else {
        afficherMessage(t("auth.confirmEmail"), "success");
      }
    } catch (err) {
      afficherMessage(traduireErreurAuth(err.message), "error");
    }
  });

  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    await deconnecterClient();
    if (typeof afficherToast === "function") afficherToast(t("auth.logoutSuccess"));
    await basculerVueConnecte();
  });

  if (typeof obtenirSession === "function") await obtenirSession();
  await basculerVueConnecte();
  });
});

document.addEventListener("authchange", () => {
  basculerVueConnecte();
});

document.addEventListener("langchange", () => {
  basculerVueConnecte();
});
