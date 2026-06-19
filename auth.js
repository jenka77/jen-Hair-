/* ============================================================
   Jen's & Flora — Comptes clientes (Supabase Auth)
   Les mots de passe sont stockés de façon sécurisée par Supabase.
   ============================================================ */

let sessionCourante = null;

function clientAuth() {
  return typeof window.clientSupabase !== "undefined" ? window.clientSupabase : null;
}

async function obtenirSession() {
  const client = clientAuth();
  if (!client) return null;

  const { data, error } = await client.auth.getSession();
  if (error) {
    console.warn("Session auth :", error.message);
    return null;
  }
  sessionCourante = data.session;
  return data.session;
}

async function obtenirTokenAuth() {
  const session = sessionCourante || (await obtenirSession());
  return session?.access_token || null;
}

async function obtenirUtilisateur() {
  const session = sessionCourante || (await obtenirSession());
  return session?.user || null;
}

async function inscrireClient(email, password) {
  const client = clientAuth();
  if (!client) throw new Error("Authentification indisponible");

  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw error;
  sessionCourante = data.session;
  return data;
}

async function connecterClient(email, password) {
  const client = clientAuth();
  if (!client) throw new Error("Authentification indisponible");

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw error;
  sessionCourante = data.session;
  return data;
}

async function deconnecterClient() {
  const client = clientAuth();
  if (!client) return;
  await client.auth.signOut();
  sessionCourante = null;
}

async function exigerConnexionPourCommande() {
  const user = await obtenirUtilisateur();
  if (user) return user;

  const page = window.location.pathname.split("/").pop() || "index.html";
  const retour = encodeURIComponent(page + window.location.search);
  if (typeof afficherToast === "function" && typeof t === "function") {
    afficherToast(t("order.loginRequired"));
  }
  window.location.href = `compte.html?mode=login&return=${retour}`;
  return null;
}

function preparerFormulaireCommande(user) {
  const emailInput = document.getElementById("email");
  if (!emailInput) return;
  if (user?.email) {
    emailInput.value = user.email;
    emailInput.readOnly = true;
  } else {
    emailInput.readOnly = false;
  }
}

function mettreAJourNavbarAuth() {
  const connecte = !!sessionCourante?.user;
  const email = sessionCourante?.user?.email || "";

  document.querySelectorAll("[data-auth-guest]").forEach((el) => {
    el.hidden = connecte;
  });
  document.querySelectorAll("[data-auth-user]").forEach((el) => {
    el.hidden = !connecte;
    if (el.dataset.authEmail && email) {
      el.title = email;
    }
  });
}

async function initialiserAuth() {
  const client = clientAuth();
  if (!client) return;

  await obtenirSession();
  mettreAJourNavbarAuth();

  client.auth.onAuthStateChange((_event, session) => {
    sessionCourante = session;
    mettreAJourNavbarAuth();
    document.dispatchEvent(new CustomEvent("authchange", { detail: { session } }));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initialiserAuth();
});

window.obtenirSession = obtenirSession;
window.obtenirTokenAuth = obtenirTokenAuth;
window.obtenirUtilisateur = obtenirUtilisateur;
window.inscrireClient = inscrireClient;
window.connecterClient = connecterClient;
window.deconnecterClient = deconnecterClient;
window.mettreAJourNavbarAuth = mettreAJourNavbarAuth;
window.exigerConnexionPourCommande = exigerConnexionPourCommande;
window.preparerFormulaireCommande = preparerFormulaireCommande;
