const express = require("express");
const { z } = require("zod");
const { resoudreOrigineFrontend } = require("../config/origins");
const { authObligatoire } = require("../middleware/auth");
const {
  createCheckoutOrderSchema,
  regrouperItems,
  adresseCompleteAllemande,
  creerCommandeEnAttente,
} = require("../services/orderCheckout");
const { creerSessionCheckout, lireSessionCheckout, eurosEnCentimes } = require("../services/stripePay");
const { finaliserCommandePayee } = require("../services/finaliserPaiement");

const router = express.Router();

const confirmSessionSchema = z.object({
  orderId: z.string().uuid(),
  sessionId: z.string().min(8),
});

router.post("/stripe/create-checkout-session", authObligatoire, async (req, res, next) => {
  try {
    const validation = createCheckoutOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Commande invalide",
        details: validation.error.flatten(),
      });
    }

    const { customer } = validation.data;
    const locale = validation.data.locale || "fr";
    const items = regrouperItems(validation.data.items);

    if (!adresseCompleteAllemande(customer)) {
      return res.status(400).json({
        error:
          "Adresse de livraison complète requise : rue, numéro, code postal allemand à 5 chiffres, ville et pays",
      });
    }

    const { order, lignes, subtotal, deliveryFee, total, orderNumber } = await creerCommandeEnAttente({
      customer,
      items,
      locale,
      userId: req.user?.id || null,
    });

    const frontendUrl = resoudreOrigineFrontend(req.headers.origin);
    const stripe = await creerSessionCheckout({
      orderId: order.id,
      orderNumber,
      lignes,
      deliveryFee,
      total,
      customerEmail: customer.email.trim(),
      locale,
      frontendUrl,
      returnPath: validation.data.returnPath,
    });

    res.status(201).json({
      orderId: order.id,
      orderNumber,
      sessionId: stripe.sessionId,
      checkoutUrl: stripe.checkoutUrl,
      subtotal,
      deliveryFee,
      total,
    });
  } catch (error) {
    if (error?.type === "StripeAuthenticationError" || error?.statusCode === 401) {
      error.status = 503;
      error.message =
        "Clé Stripe invalide sur le serveur. Utilisez STRIPE_SECRET_KEY (sk_test_…) dans Render.";
    }
    next(error);
  }
});

router.post("/stripe/confirm-session", authObligatoire, async (req, res, next) => {
  try {
    const validation = confirmSessionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Confirmation Stripe invalide",
        details: validation.error.flatten(),
      });
    }

    const { orderId, sessionId } = validation.data;
    const session = await lireSessionCheckout(sessionId);

    if (String(session.metadata?.order_id || "") !== orderId) {
      return res.status(409).json({ error: "Session Stripe incompatible avec cette commande" });
    }

    if (session.payment_status !== "paid") {
      return res.status(402).json({ error: "Paiement Stripe non finalisé" });
    }

    const { chargerCommandeAvecItems } = require("../services/orderCheckout");
    const { order } = await chargerCommandeAvecItems(orderId);
    const expected = eurosEnCentimes(order.total_amount);
    if (session.amount_total != null && session.amount_total !== expected) {
      return res.status(409).json({ error: "Montant Stripe différent du total commande" });
    }

    const localeHint = session.metadata?.locale;
    const resultat = await finaliserCommandePayee(orderId, req.user?.id, {
      locale: localeHint === "de" || localeHint === "en" ? localeHint : "fr",
    });
    res.json({ ...resultat, sessionId });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
