const rateLimit = require("express-rate-limit");

function messageLimite(texte) {
  return { error: texte };
}

const limiterGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: messageLimite("Trop de requêtes. Réessayez dans quelques minutes."),
});

const limiterAdmin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: messageLimite("Trop de tentatives admin. Réessayez dans 15 minutes."),
});

const limiterAvis = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: messageLimite("Limite d'avis atteinte. Réessayez dans une heure."),
});

const limiterPaypal = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: messageLimite("Trop de tentatives de paiement. Réessayez plus tard."),
});

const limiterNotesCoiffeuse = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: messageLimite("Limite de notes atteinte. Réessayez dans une heure."),
});

function estRouteAdminApi(req) {
  const chemin = req.path || "";

  if (chemin.includes("/admin")) return true;
  if (req.headers["x-admin-password"]) return true;

  if (req.method === "GET" && (chemin === "/orders" || /^\/orders\/[^/]+$/.test(chemin))) {
    return true;
  }

  if (req.method === "PATCH" && /^\/orders\/[^/]+\/status$/.test(chemin)) return true;

  if (["POST", "PATCH", "DELETE"].includes(req.method) && /^\/products(\/|$)/.test(chemin)) {
    return true;
  }

  return false;
}

function appliquerLimitesParRoute(req, res, next) {
  if (req.method === "POST" && req.path === "/reviews") {
    return limiterAvis(req, res, next);
  }

  if (req.method === "POST" && /^\/hairdressers\/[^/]+\/rate$/.test(req.path)) {
    return limiterNotesCoiffeuse(req, res, next);
  }

  if (
    req.method === "POST" &&
    (req.path === "/paypal/create-order" || req.path === "/paypal/capture-order")
  ) {
    return limiterPaypal(req, res, next);
  }

  if (estRouteAdminApi(req)) {
    return limiterAdmin(req, res, next);
  }

  return next();
}

module.exports = {
  limiterGlobal,
  limiterAdmin,
  limiterAvis,
  limiterPaypal,
  limiterNotesCoiffeuse,
  appliquerLimitesParRoute,
};
