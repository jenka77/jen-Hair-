/**
 * Protection admin.html sur Vercel (Basic Auth).
 * Variables d'environnement Vercel :
 *   ADMIN_PASSWORD      — même mot de passe que Render (obligatoire)
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
      "WWW-Authenticate": 'Basic realm="Admin Jen\'s & Floran", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: "/admin.html",
};
