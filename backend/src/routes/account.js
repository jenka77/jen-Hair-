const express = require("express");
const { supabase } = require("../supabase");
const { authObligatoire } = require("../middleware/auth");

const router = express.Router();

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
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, total_amount, status, pickup_mode, delivery_address, created_at, order_items(product_name, quantity, unit_price)"
      )
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      orders: (data || []).map(normaliserCommande),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
