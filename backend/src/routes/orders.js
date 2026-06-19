const express = require("express");
const { z } = require("zod");
const { supabase } = require("../supabase");
const {
  envoyerEmailsCommande,
  envoyerEmailChangementStatut,
} = require("../services/email");

const router = express.Router();
const DELIVERY_FEE = 7.5;

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
});

const orderSchema = z.object({
  customer: z.object({
    name: z.string().min(2),
    phone: z.string().min(8),
    email: z.string().email(),
    pickupMode: z.enum(["pickup", "delivery"]),
    address: z.string().optional().nullable(),
    addressDetails: z
      .object({
        rue: z.string().min(2),
        numero: z.string().min(1),
        cp: z.string().regex(/^[0-9]{5}$/),
        ville: z.string().min(2),
        pays: z.string().min(2),
      })
      .optional()
      .nullable(),
  }),
  items: z.array(orderItemSchema).min(1),
});

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

function regrouperItems(items) {
  const map = new Map();
  items.forEach((item) => {
    const actuel = map.get(item.productId) || { ...item, quantity: 0 };
    actuel.quantity += item.quantity;
    map.set(item.productId, actuel);
  });
  return Array.from(map.values());
}

function adresseCompleteAllemande(customer) {
  if (customer.pickupMode !== "delivery") return true;

  const details = customer.addressDetails;
  if (!details) return false;

  return (
    details.rue.trim().length >= 2 &&
    details.numero.trim().length >= 1 &&
    /^[0-9]{5}$/.test(details.cp.trim()) &&
    details.ville.trim().length >= 2 &&
    details.pays.trim().length >= 2
  );
}

function formaterAdresse(customer) {
  if (customer.pickupMode !== "delivery") return "Retrait en boutique chez Saá Mokolo";
  const d = customer.addressDetails;
  return `${d.rue.trim()} ${d.numero.trim()}, ${d.cp.trim()} ${d.ville.trim()}, ${d.pays.trim()}`;
}

async function recupererProduitsPourCommande(items) {
  const ids = items.map((item) => item.productId);
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, wig_type, wig_size, color, lace_size, price, stock, is_active"
    )
    .in("id", ids);

  if (error) throw error;

  const produitsParId = Object.fromEntries((data || []).map((p) => [p.id, p]));
  return items.map((item) => {
    const produit = produitsParId[item.productId];
    if (!produit) {
      const err = new Error(`Produit introuvable: ${item.productId}`);
      err.status = 404;
      throw err;
    }
    if (!produit.is_active) {
      const err = new Error(`Produit inactif: ${produit.name}`);
      err.status = 400;
      throw err;
    }
    if (Number(produit.stock) < item.quantity) {
      const err = new Error(`Stock insuffisant pour ${produit.name}`);
      err.status = 409;
      throw err;
    }
    return { item, produit };
  });
}

async function decrementerStock(lignes) {
  for (const { item, produit } of lignes) {
    const nouveauStock = Number(produit.stock) - item.quantity;
    const { data, error } = await supabase
      .from("products")
      .update({ stock: nouveauStock })
      .eq("id", item.productId)
      .gte("stock", item.quantity)
      .select("id, stock")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      const err = new Error(`Stock insuffisant pour ${produit.name}`);
      err.status = 409;
      throw err;
    }
  }
}

router.post("/orders", async (req, res, next) => {
  try {
    const validation = orderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Commande invalide",
        details: validation.error.flatten(),
      });
    }

    const { customer } = validation.data;
    const items = regrouperItems(validation.data.items);
    if (!adresseCompleteAllemande(customer)) {
      return res.status(400).json({
        error:
          "Adresse de livraison complète requise : rue, numéro, code postal allemand à 5 chiffres, ville et pays",
      });
    }

    const lignes = await recupererProduitsPourCommande(items);
    const subtotal = lignes.reduce(
      (sum, { item, produit }) => sum + Number(produit.price) * item.quantity,
      0
    );
    const deliveryFee = customer.pickupMode === "delivery" ? DELIVERY_FEE : 0;
    const total = subtotal + deliveryFee;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: customer.name.trim(),
        customer_contact: `${customer.phone.trim()} / ${customer.email.trim()}`,
        pickup_mode:
          customer.pickupMode === "delivery"
            ? "Livraison à domicile"
            : "Retrait en boutique chez Saá Mokolo",
        delivery_address: formaterAdresse(customer),
        total_amount: total,
        status: "accepted",
      })
      .select("id, customer_name, customer_contact, pickup_mode, delivery_address, total_amount, status, created_at")
      .single();

    if (orderError) throw orderError;

    const orderItems = lignes.map(({ item, produit }) => ({
      order_id: order.id,
      product_id: produit.id,
      product_name: produit.name,
      quantity: item.quantity,
      unit_price: Number(produit.price) || 0,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) throw itemsError;

    await decrementerStock(lignes);

    const orderNumber = genererNumeroCommande(order);
    let emailStatus = { sent: false };
    try {
      const emailResult = await envoyerEmailsCommande({
        order,
        orderNumber,
        customer,
        lignes,
        subtotal,
        deliveryFee,
        total,
      });
      emailStatus = { sent: true, result: emailResult };
    } catch (emailError) {
      console.error("Erreur envoi email commande :", emailError);
      emailStatus = { sent: false, error: emailError.message };
    }

    res.status(201).json({
      order: normaliserCommande(order),
      orderNumber,
      subtotal,
      deliveryFee,
      total,
      items: orderItems,
      email: emailStatus,
    });
  } catch (error) {
    next(error);
  }
});

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
      status: z.enum([
        "accepted",
        "pending_payment",
        "paid",
        "preparing",
        "ready",
        "delivered",
        "cancelled",
      ]),
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
