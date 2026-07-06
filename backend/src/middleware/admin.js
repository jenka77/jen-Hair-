const crypto = require("crypto");

function verifierAdmin(req, res) {
  const motDePasse = req.headers["x-admin-password"];

  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: "ADMIN_PASSWORD n'est pas configuré côté serveur" });
    return false;
  }

  if (!motDePasse || typeof motDePasse !== "string") {
    res.status(401).json({ error: "Accès admin refusé" });
    return false;
  }

  const attendu = Buffer.from(process.env.ADMIN_PASSWORD, "utf8");
  const recu = Buffer.from(motDePasse, "utf8");

  if (attendu.length !== recu.length || !crypto.timingSafeEqual(attendu, recu)) {
    res.status(401).json({ error: "Accès admin refusé" });
    return false;
  }

  return true;
}

module.exports = { verifierAdmin };
