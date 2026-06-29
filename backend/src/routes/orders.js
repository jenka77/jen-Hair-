const express = require("express");
const { z } = require("zod");
const { supabase } = require("../supabase");
const {
  envoyerEmailChangementStatut,
} = require("../services/email");

const router = express.Router();

function verifierAdmin(req, res) {
  const motDePasse = req.headers["x-admin-password"];
  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: "ADMIN_PASSWORD n'est pas configuré côté serveur" });
    return false;
  }
  if (motDePasse !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Accès admin refusé" });
    return false;
  }
  return true;
}

function normaliserCommande(order) {
  return {
    id: order.id,
    orderNumber: genererNumeroCommande(order),
    customerName: order.customer_name,
    customerContact: order.customer_contact,
    pickupMode: order.pickup_mode,
    deliveryAddress: order.delivery_address,
    totalAmount: Number(order.total_amount) || 0,
    status: order.status,
    createdAt: order.created_at,
  };
}

function genererNumeroCommande(order) {
  const date = new Date(order.created_at || Date.now());
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const shortId = String(order.id || "").slice(0, 8).toUpperCase();
  return `JF-${y}${m}${d}-${shortId}`;
}

router.post("/orders", (_req, res) => {
  res.status(410).json({
    error:
      "Cette route est désactivée. Utilisez le paiement PayPal (/api/paypal/create-order puis capture après paiement).",
  });
});

const STATUTS_ADMIN = ["preparing", "ready", "delivered", "cancelled"];

function transitionStatutAutorisee(ancien, nouveau) {
  if (nouveau === "cancelled") {
    return ["pending_payment", "paid", "preparing", "ready"].includes(ancien);
  }
  const workflow = {
    paid: ["preparing"],
    preparing: ["ready", "delivered"],
    ready: ["delivered"],
  };
  return workflow[ancien]?.includes(nouveau) ?? false;
}

router.get("/orders", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_contact, pickup_mode, delivery_address, total_amount, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ orders: (data || []).map(normaliserCommande) });
  } catch (error) {
    next(error);
  }
});

router.get("/orders/:id/summary", async (req, res, next) => {
  try {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_name, pickup_mode, delivery_address, total_amount, status, created_at")
      .eq("id", req.params.id)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return res.status(404).json({ error: "Commande introuvable" });

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("product_name, quantity, unit_price")
      .eq("order_id", req.params.id)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;

    res.json({
      order: normaliserCommande(order),
      items: (items || []).map((item) => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price) || 0,
        lineTotal: (Number(item.unit_price) || 0) * item.quantity,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/orders/:id", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_name, customer_contact, pickup_mode, delivery_address, total_amount, status, created_at")
      .eq("id", req.params.id)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return res.status(404).json({ error: "Commande introuvable" });

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_id, product_name, quantity, unit_price, created_at")
      .eq("order_id", req.params.id)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;

    res.json({
      order: normaliserCommande(order),
      items: items || [],
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/orders/:id/status", async (req, res, next) => {
  if (!verifierAdmin(req, res)) return;

  try {
    const schema = z.object({
      status: z.enum(STATUTS_ADMIN),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Statut invalide",
        details: validation.error.flatten(),
      });
    }

    const { data: existing, error: existingError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", req.params.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return res.status(404).json({ error: "Commande introuvable" });

    const nouveauStatut = validation.data.status;
    if (!transitionStatutAutorisee(existing.status, nouveauStatut)) {
      return res.status(409).json({
        error: `Transition interdite : ${existing.status} → ${nouveauStatut}. Seul PayPal peut valider un paiement.`,
      });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status: validation.data.status })
      .eq("id", req.params.id)
      .select(
        "id, customer_name, customer_contact, customer_email, pickup_mode, delivery_address, total_amount, status, created_at"
      )
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Commande introuvable" });

    let emailStatus = { sent: false };
    try {
      const result = await envoyerEmailChangementStatut({
        order: data,
        orderNumber: genererNumeroCommande(data),
        status: validation.data.status,
        previousStatus: existing.status,
      });
      emailStatus = result?.skipped ? { sent: false, ...result } : { sent: true, result };
    } catch (emailError) {
      console.error("Erreur email changement statut :", emailError);
      emailStatus = { sent: false, error: emailError.message };
    }

    res.json({ order: normaliserCommande(data), email: emailStatus });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
