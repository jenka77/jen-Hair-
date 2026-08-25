const express = require("express");
const { supabase } = require("../supabase");
const { authObligatoire } = require("../middleware/auth");

const router = express.Router();

const SITE_URL = String(
  process.env.SITE_URL || process.env.FRONTEND_URL || "https://www.jens-flora.com"
).replace(/\/$/, "");

function resoudreUrlImageProduit(imageUrl) {
  const raw = String(imageUrl || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${SITE_URL}/${raw.replace(/^\//, "")}`;
}

function premiereImageProduit(produit) {
  if (!produit) return null;
  return [produit.image_url, produit.image_url_2, produit.image_url_3]
    .map((url) => String(url || "").trim())
    .find(Boolean) || null;
}

function genererNumeroCommande(order) {
  const date = new Date(order.created_at || Date.now());
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const shortId = String(order.id || "").slice(0, 8).toUpperCase();
  return `JF-${y}${m}${d}-${shortId}`;
}

function normaliserCommande(order) {
  const items = (order.order_items || []).map((item) => ({
    name: item.product_name,
    quantity: item.quantity,
    unitPrice: Number(item.unit_price) || 0,
    lineTotal: (Number(item.unit_price) || 0) * (Number(item.quantity) || 0),
    imageUrl: resoudreUrlImageProduit(item.image_url),
  }));

  return {
    id: order.id,
    orderNumber: genererNumeroCommande(order),
    status: order.status,
    totalAmount: Number(order.total_amount) || 0,
    pickupMode: order.pickup_mode,
    deliveryAddress: order.delivery_address || "",
    createdAt: order.created_at,
    items,
  };
}

async function enrichirCommandesAvecImages(orders) {
  const productIds = new Set();
  const productNames = new Set();

  (orders || []).forEach((order) => {
    (order.order_items || []).forEach((item) => {
      if (item.product_id) productIds.add(item.product_id);
      else if (item.product_name) productNames.add(String(item.product_name).trim());
    });
  });

  let produitsParId = {};
  let produitsParNom = {};

  if (productIds.size) {
    const { data: produits, error } = await supabase
      .from("products")
      .select("id, name, image_url, image_url_2, image_url_3")
      .in("id", [...productIds]);

    if (error) throw error;
    produitsParId = Object.fromEntries((produits || []).map((p) => [p.id, p]));
  }

  const nomsRestants = [...productNames].filter(
    (nom) =>
      !Object.values(produitsParId).some(
        (p) => String(p.name || "").trim().toLowerCase() === nom.toLowerCase()
      )
  );

  if (nomsRestants.length) {
    const { data: produits, error } = await supabase
      .from("products")
      .select("id, name, image_url, image_url_2, image_url_3")
      .in("name", nomsRestants);

    if (error) throw error;
    produitsParNom = Object.fromEntries(
      (produits || []).map((p) => [String(p.name || "").trim().toLowerCase(), p])
    );
  }

  return (orders || []).map((order) => ({
    ...order,
    order_items: (order.order_items || []).map((item) => {
      const nomNormalise = String(item.product_name || "").trim().toLowerCase();
      const produit =
        (item.product_id && produitsParId[item.product_id]) ||
        produitsParNom[nomNormalise] ||
        null;

      return {
        ...item,
        image_url: premiereImageProduit(produit),
      };
    }),
  }));
}

router.get("/me", authObligatoire, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

router.get("/me/orders", authObligatoire, async (req, res, next) => {
  try {
    const email = String(req.user.email || "").trim().toLowerCase();
    let requete = supabase
      .from("orders")
      .select(
        "id, total_amount, status, pickup_mode, delivery_address, created_at, order_items(product_name, quantity, unit_price, product_id)"
      )
      .order("created_at", { ascending: false });

    if (email) {
      requete = requete.or(`user_id.eq.${req.user.id},customer_email.eq.${email}`);
    } else {
      requete = requete.eq("user_id", req.user.id);
    }

    const { data, error } = await requete;

    if (error) throw error;

    const commandesAvecImages = await enrichirCommandesAvecImages(data || []);

    res.json({
      orders: commandesAvecImages.map(normaliserCommande),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
