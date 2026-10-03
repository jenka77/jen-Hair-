const Stripe = require("stripe");
const { lireSessionCheckout, eurosEnCentimes } = require("./stripePay");
const { chargerCommandeAvecItems } = require("./orderCheckout");
const { finaliserCommandePayee } = require("./finaliserPaiement");

async function traiterCheckoutSessionComplete(session) {
  const orderId = String(session.metadata?.order_id || "").trim();
  if (!orderId) {
    console.warn("[Stripe webhook] session sans order_id");
    return { skipped: true };
  }

  if (session.payment_status !== "paid") {
    return { skipped: true, reason: "not_paid" };
  }

  const { order } = await chargerCommandeAvecItems(orderId);
  const expected = eurosEnCentimes(order.total_amount);
  if (session.amount_total != null && session.amount_total !== expected) {
    throw new Error("Montant Stripe incompatible avec la commande");
  }

  const localeHint = session.metadata?.locale;
  const locale = localeHint === "de" || localeHint === "en" ? localeHint : "fr";

  return finaliserCommandePayee(orderId, null, { locale });
}

function traiterWebhookStripe(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    return res.status(503).send("Stripe non configuré");
  }

  const stripe = new Stripe(key);
  let event;

  try {
    if (secret) {
      const signature = req.headers["stripe-signature"];
      event = stripe.webhooks.constructEvent(req.body, signature, secret);
    } else {
      event = JSON.parse(req.body.toString("utf8"));
      console.warn("[Stripe webhook] STRIPE_WEBHOOK_SECRET absent — signature non vérifiée");
    }
  } catch (err) {
    console.error("[Stripe webhook] signature:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    traiterCheckoutSessionComplete(event.data.object)
      .then((result) => {
        console.log("[Stripe webhook] checkout.session.completed", result?.orderId || result);
      })
      .catch((err) => {
        console.error("[Stripe webhook] finalisation:", err.message);
      });
  }

  res.json({ received: true });
}

module.exports = { traiterWebhookStripe, traiterCheckoutSessionComplete };
