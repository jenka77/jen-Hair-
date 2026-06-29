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
  const mode = new URLSearchParams(window.location.search).get("mode");
  if (mode === "register" || mode === "forgot" || mode === "recovery") return mode;
  return "login";
}

function definirModeUrl(mode) {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", mode);
  window.history.replaceState({}, "", url.toString());
}

function afficherMode(mode) {
  const loginForm = document.getElementById("form-login");
  const registerForm = document.getElementById("form-register");
  const forgotForm = document.getElementById("form-forgot");
  const recoveryForm = document.getElementById("form-recovery");
  const tabs = document.querySelector(".account-tabs");

  if (tabs) tabs.hidden = mode === "forgot" || mode === "recovery";

  document.querySelectorAll(".account-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });

  if (loginForm) loginForm.hidden = mode !== "login";
  if (registerForm) registerForm.hidden = mode !== "register";
  if (forgotForm) forgotForm.hidden = mode !== "forgot";
  if (recoveryForm) recoveryForm.hidden = mode !== "recovery";

  if (mode === "recovery" || mode === "forgot") {
    masquerRenvoiConfirmation();
    masquerCompteExistant();
  }
}

let emailEnAttenteConfirmation = "";

function afficherMessage(texte, type = "info") {
  const el = document.getElementById("account-message");
  if (!el) return;
  el.hidden = !texte;
  el.textContent = texte;
  el.className = `account-message account-message--${type}`;
}

function emailDepuisFormulaires() {
  const loginEmail = document.querySelector("#form-login input[name='email']")?.value.trim();
  const registerEmail = document.querySelector("#form-register input[name='email']")?.value.trim();
  const forgotEmail = document.querySelector("#form-forgot input[name='email']")?.value.trim();
  return emailEnAttenteConfirmation || registerEmail || forgotEmail || loginEmail || "";
}

function afficherRenvoiConfirmation(email) {
  const wrap = document.getElementById("account-resend-wrap");
  if (!wrap) return;
  emailEnAttenteConfirmation = String(email || "").trim().toLowerCase();
  wrap.hidden = !emailEnAttenteConfirmation;
}

function masquerRenvoiConfirmation() {
  emailEnAttenteConfirmation = "";
  const wrap = document.getElementById("account-resend-wrap");
  if (wrap) wrap.hidden = true;
}

function afficherCompteExistant(dejaVisible = true) {
  const wrap = document.getElementById("account-exists-wrap");
  if (wrap) wrap.hidden = !dejaVisible;
}

function masquerCompteExistant() {
  const wrap = document.getElementById("account-exists-wrap");
  if (wrap) wrap.hidden = true;
}

function basculerVersMode(mode) {
  masquerRenvoiConfirmation();
  masquerCompteExistant();
  afficherMessage("");
  afficherMode(mode);
  definirModeUrl(mode);
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
  const mode = modeDepuisUrl();
  const enRecovery =
    typeof estEnReinitialisationMotDePasse === "function" && estEnReinitialisationMotDePasse();

  if ((enRecovery || mode === "recovery") && session?.user) {
    if (guest) guest.hidden = false;
    if (user) user.hidden = true;
    afficherMode("recovery");
    return;
  }

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
  afficherMode(mode);
}

function nettoyerParamsAuthUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  ["code", "error", "error_code", "error_description", "sb"].forEach((cle) =>
    url.searchParams.delete(cle)
  );
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
  const typeHash = hashParams.get("type");
  const typeQuery = params.get("type");
  const modeRecovery =
    params.get("mode") === "recovery" ||
    typeHash === "recovery" ||
    typeQuery === "recovery";

  if (erreurUrl) {
    afficherMessage(messageErreurAuthUrl(erreurUrl), "error");
    nettoyerParamsAuthUrl();
    return;
  }

  const tokenHash = params.get("token_hash") || hashParams.get("token_hash");
  if (tokenHash) {
    const { error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: modeRecovery ? "recovery" : "signup",
    });
    if (error) {
      afficherMessage(
        traduireErreurAuth(error.message, modeRecovery ? "auth.recoveryError" : "auth.confirmError"),
        "error"
      );
    } else if (modeRecovery) {
      if (typeof activerModeReinitialisationMotDePasse === "function") {
        activerModeReinitialisationMotDePasse();
      }
      afficherMode("recovery");
      definirModeUrl("recovery");
    } else if (typeof afficherToast === "function") {
      afficherToast(t("auth.loginSuccess"));
    }
    nettoyerParamsAuthUrl();
    return;
  }

  const aUnRetourAuth =
    params.has("code") ||
    hashParams.has("access_token") ||
    hashParams.has("type") ||
    typeQuery;

  if (!aUnRetourAuth) return;

  if (params.has("code")) {
    const { error } = await client.auth.exchangeCodeForSession(params.get("code"));
    if (error) {
      afficherMessage(
        traduireErreurAuth(error.message, modeRecovery ? "auth.recoveryError" : "auth.confirmError"),
        "error"
      );
      if (modeRecovery) {
        basculerVersMode("forgot");
      }
    } else if (modeRecovery) {
      if (typeof activerModeReinitialisationMotDePasse === "function") {
        activerModeReinitialisationMotDePasse();
      }
      afficherMode("recovery");
      definirModeUrl("recovery");
    } else if (typeof afficherToast === "function") {
      afficherToast(t("auth.loginSuccess"));
    }
  } else {
    const { data, error } = await client.auth.getSession();
    if (error) {
      afficherMessage(traduireErreurAuth(error.message), "error");
    } else if (modeRecovery && data.session) {
      if (typeof activerModeReinitialisationMotDePasse === "function") {
        activerModeReinitialisationMotDePasse();
      }
      afficherMode("recovery");
      definirModeUrl("recovery");
    } else if (!modeRecovery && data.session && typeof afficherToast === "function") {
      afficherToast(t("auth.loginSuccess"));
    } else if (modeRecovery && !data.session) {
      afficherMessage(t("auth.recoveryLinkInvalid"), "error");
      basculerVersMode("forgot");
    }
  }

  nettoyerParamsAuthUrl();
}

function traduireErreurAuth(message, fallbackKey = "auth.registerError") {
  const brut = String(message || "");
  const msg = brut.toLowerCase();
  if (brut === "EMAIL_ALREADY_REGISTERED") {
    return t("auth.emailAlreadyRegistered");
  }
  if (brut === "AUTH_SESSION_MISSING") {
    return t("auth.recoveryLinkInvalid");
  }
  if (msg.includes("pkce code verifier") || msg.includes("auth session missing")) {
    return t("auth.recoveryLinkInvalid");
  }
  if (msg.includes("rate limit") || msg.includes("over_email_send")) {
    return t("auth.rateLimit");
  }
  if (msg.includes("otp_expired") || msg.includes("flow_state_expired") || msg.includes("invalid or has expired")) {
    return t("auth.linkExpired");
  }
  if (msg.includes("email not confirmed")) {
    return t("auth.emailNotConfirmed");
  }
  return message || t(fallbackKey);
}

function erreurEmailNonConfirme(message) {
  return String(message || "").toLowerCase().includes("email not confirmed");
}

function erreurEmailDejaUtilise(message) {
  return String(message || "") === "EMAIL_ALREADY_REGISTERED";
}

function preremplirEmailOublie(email) {
  const input = document.querySelector("#form-forgot input[name='email']");
  if (input && email) input.value = email;
}

document.addEventListener("DOMContentLoaded", () => {
  finaliserRetourAuthEmail().finally(async () => {
    document.querySelectorAll(".account-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        basculerVersMode(tab.dataset.mode);
      });
    });

    document.getElementById("btn-show-forgot")?.addEventListener("click", () => {
      const email = document.querySelector("#form-login input[name='email']")?.value.trim();
      basculerVersMode("forgot");
      preremplirEmailOublie(email);
    });

    document.querySelectorAll(".account-back-login, #btn-go-login").forEach((btn) => {
      btn.addEventListener("click", () => basculerVersMode("login"));
    });

    document.getElementById("btn-go-forgot")?.addEventListener("click", () => {
      const email = document.querySelector("#form-register input[name='email']")?.value.trim();
      basculerVersMode("forgot");
      preremplirEmailOublie(email);
    });

    document.getElementById("form-login")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      afficherMessage("");
      masquerRenvoiConfirmation();
      masquerCompteExistant();
      const fd = new FormData(e.target);
      try {
        await connecterClient(fd.get("email"), fd.get("password"));
        if (typeof terminerReinitialisationMotDePasse === "function") {
          terminerReinitialisationMotDePasse();
        }
        if (typeof afficherToast === "function") afficherToast(t("auth.loginSuccess"));
        if (redirigerApresConnexion()) return;
        await basculerVueConnecte();
      } catch (err) {
        afficherMessage(traduireErreurAuth(err.message, "auth.loginError"), "error");
        if (erreurEmailNonConfirme(err.message)) {
          afficherRenvoiConfirmation(fd.get("email"));
        }
      }
    });

    document.getElementById("form-forgot")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      afficherMessage("");
      masquerCompteExistant();
      const fd = new FormData(e.target);
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = t("auth.forgotSending");
      }
      try {
        await demanderReinitialisationMotDePasse(fd.get("email"));
        afficherMessage(t("auth.forgotSuccess"), "success");
      } catch (err) {
        afficherMessage(traduireErreurAuth(err.message, "auth.forgotError"), "error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = t("auth.forgotSubmit");
        }
      }
    });

    document.getElementById("form-recovery")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      afficherMessage("");
      const fd = new FormData(e.target);
      const password = fd.get("password");
      const confirm = fd.get("passwordConfirm");
      if (password !== confirm) {
        afficherMessage(t("auth.passwordMismatch"), "error");
        return;
      }
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = t("auth.recoverySaving");
      }
      try {
        await mettreAJourMotDePasse(password);
        if (typeof terminerReinitialisationMotDePasse === "function") {
          terminerReinitialisationMotDePasse();
        }
        if (typeof afficherToast === "function") afficherToast(t("auth.recoverySuccess"));
        definirModeUrl("login");
        if (redirigerApresConnexion()) return;
        await basculerVueConnecte();
      } catch (err) {
        afficherMessage(traduireErreurAuth(err.message, "auth.recoveryError"), "error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = t("auth.recoverySubmit");
        }
      }
    });

    document.getElementById("form-register")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      afficherMessage("");
      masquerRenvoiConfirmation();
      masquerCompteExistant();
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
          afficherRenvoiConfirmation(fd.get("email"));
          afficherMessage(t("auth.confirmEmail"), "success");
        }
      } catch (err) {
        afficherMessage(traduireErreurAuth(err.message), "error");
        if (erreurEmailDejaUtilise(err.message)) {
          afficherCompteExistant(true);
        }
      }
    });

    document.getElementById("btn-resend-confirm")?.addEventListener("click", async () => {
      const email = emailDepuisFormulaires();
      const btn = document.getElementById("btn-resend-confirm");
      if (!email) {
        afficherMessage(t("auth.emailRequired"), "error");
        return;
      }
      if (btn) {
        btn.disabled = true;
        btn.textContent = t("auth.resendConfirmSending");
      }
      try {
        await renvoyerEmailConfirmation(email);
        afficherMessage(t("auth.resendConfirmSuccess"), "success");
      } catch (err) {
        afficherMessage(traduireErreurAuth(err.message, "auth.resendConfirmError"), "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = t("auth.resendConfirm");
        }
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

document.addEventListener("authchange", (e) => {
  if (e.detail?.event === "PASSWORD_RECOVERY") {
    afficherMode("recovery");
    definirModeUrl("recovery");
  }
  basculerVueConnecte();
});

document.addEventListener("langchange", () => {
  basculerVueConnecte();
});
