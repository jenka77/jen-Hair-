/**
 * Protection optionnelle de admin.html sur Vercel (Basic Auth navigateur).
 *
 * Désactivée par défaut : la popup Basic Auth est peu fiable sur iPhone /
 * Android (page blanche ou erreur 401 avant le formulaire).
 *
 * La page admin reste protégée par le mot de passe applicatif
 * (gestion-commandes.js → header x-admin-password sur l'API).
 *
 * Pour réactiver la double authentification navigateur (desktop) :
 *   ADMIN_BASIC_AUTH=true sur Vercel
 *
 * Variables si Basic Auth activée :
 *   ADMIN_PASSWORD      — mot de passe (identique à Render)
 *   ADMIN_BASIC_USER    — identifiant (défaut : admin)
 */

function comparerTexteSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function lireBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith("Basic ")) return null;
  try {
    const decoded = atob(authHeader.slice(6));
    const sep = decoded.indexOf(":");
    if (sep < 0) return null;
    return {
      user: decoded.slice(0, sep),
      pass: decoded.slice(sep + 1),
    };
  } catch {
    return null;
  }
}

export default function middleware(request) {
  const { pathname } = new URL(request.url);

  if (pathname !== "/admin.html") {
    return;
  }

  if (process.env.ADMIN_BASIC_AUTH !== "true") {
    return;
  }

  const expectedPassword = process.env.ADMIN_PASSWORD;
  const expectedUser = process.env.ADMIN_BASIC_USER || "admin";

  if (!expectedPassword) {
    return new Response("Protection admin non configurée (ADMIN_PASSWORD manquant sur Vercel).", {
      status: 503,
    });
  }

  const credentials = lireBasicAuth(request.headers.get("authorization"));
  if (
    credentials &&
    comparerTexteSecret(credentials.user, expectedUser) &&
    comparerTexteSecret(credentials.pass, expectedPassword)
  ) {
    return;
  }

  return new Response("Authentification requise pour accéder à l'administration.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin Jens Floran", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: "/admin.html",
};
