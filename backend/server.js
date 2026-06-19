const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env"),
  override: true,
});

const express = require("express");
const cors = require("cors");
const { FRONTEND_URL, origineAutorisee } = require("./src/config/origins");
const productsRouter = require("./src/routes/products");
const ordersRouter = require("./src/routes/orders");
const paypalRouter = require("./src/routes/paypal");
const accountRouter = require("./src/routes/account");

const app = express();
const PORT = Number(process.env.PORT) || 4000;

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

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Jen's & Flora backend",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    paypalEnv: process.env.PAYPAL_ENV === "live" ? "live" : "sandbox",
  });
});

app.use("/api", productsRouter);
app.use("/api", ordersRouter);
app.use("/api", paypalRouter);
app.use("/api", accountRouter);

app.use((req, res) => {
  res.status(404).json({
    error: "Route introuvable",
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    error: error.message || "Erreur serveur",
  });
});

app.listen(PORT, () => {
  const paypalEnv = process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
  console.log(`Backend Jen's & Flora lancé sur http://localhost:${PORT}`);
  console.log(`Frontend autorisé: ${FRONTEND_URL} (+ localhost / 127.0.0.1 en dev)`);
  if (paypalEnv === "live") {
    console.log("⚠️  PayPal LIVE actif — les paiements utilisent de VRAI argent.");
  } else {
    console.log("ℹ️  PayPal SANDBOX — aucun vrai paiement (comptes test uniquement).");
  }
});

module.exports = app;
