const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env"),
  override: true,
});

const express = require("express");
const cors = require("cors");
const { FRONTEND_URL, origineAutorisee } = require("./src/config/origins");
const { limiterGlobal, appliquerLimitesParRoute } = require("./src/middleware/rateLimit");
const productsRouter = require("./src/routes/products");
const ordersRouter = require("./src/routes/orders");
const paypalRouter = require("./src/routes/paypal");
const accountRouter = require("./src/routes/account");
const reviewsRouter = require("./src/routes/reviews");
const hairdressersRouter = require("./src/routes/hairdressers");
const barbersRouter = require("./src/routes/barbers");

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const PRODUCTION = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origineAutorisee(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origine non autorisée : ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use("/api", limiterGlobal);
app.use("/api", appliquerLimitesParRoute);

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Jen's & Floran backend",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/db", async (req, res) => {
  try {
    const { supabase } = require("./src/supabase");
    const { error } = await supabase.from("categories").select("slug").limit(1);
    if (error) {
      return res.status(503).json({ ok: false, error: error.message });
    }
    res.json({ ok: true, supabase: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message || "Connexion Supabase impossible" });
  }
});

app.use("/api", productsRouter);
app.use("/api", ordersRouter);
app.use("/api", paypalRouter);
app.use("/api", accountRouter);
app.use("/api", reviewsRouter);
app.use("/api", hairdressersRouter);
app.use("/api", barbersRouter);

app.use((req, res) => {
  res.status(404).json({
    error: "Route introuvable",
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (error?.status === 429) {
    return res.status(429).json({
      error: error.message || "Trop de requêtes. Réessayez plus tard.",
    });
  }

  res.status(error.status || 500).json({
    error: PRODUCTION ? "Erreur serveur" : error.message || "Erreur serveur",
  });
});

const server = app.listen(PORT, () => {
  const paypalEnv = process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
  console.log(`Backend Jen's & Floran lancé sur http://localhost:${PORT}`);
  console.log(`Frontend autorisé: ${FRONTEND_URL} (+ localhost / 127.0.0.1 en dev)`);
  console.log("Laissez ce terminal ouvert. Ouvrez le site via http://127.0.0.1:8000 (autre terminal : python3 -m http.server 8000 --bind 127.0.0.1).");
  if (paypalEnv === "live") {
    console.log("⚠️  PayPal LIVE actif — les paiements utilisent de VRAI argent.");
  } else {
    console.log("ℹ️  PayPal SANDBOX — aucun vrai paiement (comptes test uniquement).");
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n❌ Le port ${PORT} est déjà utilisé. Un backend tourne peut-être déjà.\n` +
        `   Test : curl http://127.0.0.1:${PORT}/api/health\n` +
        `   Sinon : fuser -k ${PORT}/tcp  puis relancez npm run dev\n`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});

module.exports = app;
