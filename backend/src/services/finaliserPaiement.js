const { supabase } = require("../supabase");
const { envoyerEmailsCommande, resoudreCoordonneesCliente } = require("./email");
const {
  genererNumeroCommande,
  recupererProduits,
  decrementerStock,
  chargerCommandeAvecItems,
} = require("./orderCheckout");

async function finaliserCommandePayee(orderId, userId, { locale: localeHint } = {}) {
  const { order, items } = await chargerCommandeAvecItems(orderId);

  if (order.user_id && userId && order.user_id !== userId) {
    const err = new Error("Cette commande ne vous appartient pas");
    err.status = 403;
    throw err;
  }
  // Webhook Stripe : userId null autorisé si la session Stripe a déjà validé le paiement

  if (order.status === "paid") {
    return {
      ok: true,
      alreadyPaid: true,
      orderId,
      orderNumber: genererNumeroCommande(order),
      status: "paid",
      stockUpdates: [],
    };
  }

  if (order.status !== "pending_payment") {
    const err = new Error(`Statut commande invalide pour paiement: ${order.status}`);
    err.status = 409;
    throw err;
  }

  const lignes = await recupererProduits(
    items.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
    }))
  );

  const stockUpdates = await decrementerStock(lignes);

  const { data: paidOrder, error: updateError } = await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("id", orderId)
    .select(
      "id, customer_name, customer_contact, customer_email, pickup_mode, delivery_address, total_amount, status, created_at"
    )
    .single();

  if (updateError) throw updateError;

  const expectedTotal = Number(order.total_amount) || 0;
  const customer = resoudreCoordonneesCliente(paidOrder);

  const subtotal = lignes.reduce(
    (sum, { item, produit }) => sum + Number(produit.price) * item.quantity,
    0
  );
  const deliveryFee = expectedTotal - subtotal;
  const orderNumber = genererNumeroCommande(paidOrder);

  let emailStatus = { sent: false };
  try {
    const emailResult = await envoyerEmailsCommande({
      order: paidOrder,
      orderNumber,
      customer,
      lignes,
      subtotal,
      deliveryFee,
      total: expectedTotal,
      locale: localeHint || paidOrder.customer_locale || order.customer_locale || "fr",
    });
    emailStatus = { sent: true, result: emailResult };
  } catch (emailError) {
    console.error("Erreur envoi email après paiement :", emailError);
    emailStatus = { sent: false, error: emailError.message };
  }

  return {
    ok: true,
    orderId,
    orderNumber,
    status: "paid",
    stockUpdates,
    email: emailStatus,
  };
}

module.exports = { finaliserCommandePayee };
