const Stripe = require("stripe");

function stripeDisponible() {
  return Boolean(String(process.env.STRIPE_SECRET_KEY || "").trim());
}

function clientStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const err = new Error("Stripe n'est pas configuré (STRIPE_SECRET_KEY manquante)");
    err.status = 503;
    throw err;
  }
  return new Stripe(key);
}

function eurosEnCentimes(montant) {
  return Math.round(Number(montant) * 100);
}

function normaliserCheminRetour(returnPath) {
  const brut = String(returnPath || "/confirmation.html").trim();
  if (!brut.startsWith("/")) return `/${brut}`;
  return brut;
}

async function creerSessionCheckout({
  orderId,
  orderNumber,
  lignes,
  deliveryFee,
  total,
  customerEmail,
  locale,
  frontendUrl,
  returnPath,
}) {
  const stripe = clientStripe();
  const base = String(frontendUrl || "").replace(/\/$/, "");
  const path = normaliserCheminRetour(returnPath);

  const lineItems = lignes.map(({ item, produit }) => ({
    price_data: {
      currency: "eur",
      unit_amount: eurosEnCentimes(produit.price),
      product_data: {
        name: String(produit.name || "Produit").slice(0, 120),
      },
    },
    quantity: item.quantity,
  }));

  if (Number(deliveryFee) > 0) {
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: eurosEnCentimes(deliveryFee),
        product_data: { name: "Frais de livraison" },
      },
      quantity: 1,
    });
  }

  const stripeLocale = locale === "de" ? "de" : locale === "en" ? "en" : "fr";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    locale: stripeLocale,
    line_items: lineItems,
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
      locale: locale === "de" || locale === "en" ? locale : "fr",
    },
    success_url: `${base}${path}?stripe=success&order_id=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}${path}?stripe=cancel&order_id=${encodeURIComponent(orderId)}`,
  });

  if (!session.url) {
    throw new Error("URL de paiement Stripe introuvable");
  }

  const expected = eurosEnCentimes(total);
  if (session.amount_total != null && session.amount_total !== expected) {
    console.warn("[Stripe] Montant session différent du total commande", session.amount_total, expected);
  }

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
  };
}

async function lireSessionCheckout(sessionId) {
  const stripe = clientStripe();
  return stripe.checkout.sessions.retrieve(sessionId);
}

module.exports = {
  stripeDisponible,
  creerSessionCheckout,
  lireSessionCheckout,
  eurosEnCentimes,
};
