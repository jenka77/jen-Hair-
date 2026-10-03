const { z } = require("zod");
const { supabase } = require("../supabase");

const DELIVERY_FEE = 7.5;

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
});

const createCheckoutOrderSchema = z.object({
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
  returnPath: z.string().max(500).optional(),
  locale: z.enum(["fr", "de", "en"]).optional().default("fr"),
});

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
  const d = customer.addressDetails;
  if (!d) return false;
  return (
    d.rue.trim().length >= 2 &&
    d.numero.trim().length >= 1 &&
    /^[0-9]{5}$/.test(d.cp.trim()) &&
    d.ville.trim().length >= 2 &&
    d.pays.trim().length >= 2
  );
}

function formaterAdresse(customer) {
  if (customer.pickupMode !== "delivery") return "—";
  const d = customer.addressDetails;
  return `${d.rue.trim()} ${d.numero.trim()}, ${d.cp.trim()} ${d.ville.trim()}, ${d.pays.trim()}`;
}

async function recupererProduits(items) {
  const ids = items.map((item) => item.productId);
  const { data, error } = await supabase
    .from("products")
    .select("id, name, wig_type, wig_size, color, lace_size, price, stock, image_url, is_active")
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
  const stockUpdates = [];

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

    stockUpdates.push({
      productId: data.id,
      stock: Number(data.stock) || 0,
    });
  }

  return stockUpdates;
}

async function chargerCommandeAvecItems(orderId) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, user_id, customer_name, customer_contact, customer_email, customer_locale, pickup_mode, delivery_address, total_amount, status, created_at"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) {
    const err = new Error("Commande introuvable");
    err.status = 404;
    throw err;
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, product_name, quantity, unit_price")
    .eq("order_id", orderId);

  if (itemsError) throw itemsError;
  return { order, items: items || [] };
}

async function creerCommandeEnAttente({ customer, items, locale, userId }) {
  const lignes = await recupererProduits(items);
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
      customer_email: customer.email.trim().toLowerCase(),
      customer_locale: locale,
      user_id: userId || null,
      pickup_mode: customer.pickupMode === "delivery" ? "delivery" : "pickup",
      delivery_address: formaterAdresse(customer),
      total_amount: total,
      status: "pending_payment",
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

  return {
    order,
    lignes,
    subtotal,
    deliveryFee,
    total,
    orderNumber: genererNumeroCommande(order),
  };
}

module.exports = {
  DELIVERY_FEE,
  createCheckoutOrderSchema,
  genererNumeroCommande,
  regrouperItems,
  adresseCompleteAllemande,
  formaterAdresse,
  recupererProduits,
  decrementerStock,
  chargerCommandeAvecItems,
  creerCommandeEnAttente,
};
