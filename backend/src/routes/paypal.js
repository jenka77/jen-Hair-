const express = require("express");
const { z } = require("zod");
const { resoudreOrigineFrontend } = require("../config/origins");
const { authObligatoire } = require("../middleware/auth");
const {
  createCheckoutOrderSchema,
  regrouperItems,
  adresseCompleteAllemande,
  creerCommandeEnAttente,
  genererNumeroCommande,
  chargerCommandeAvecItems,
} = require("../services/orderCheckout");
const { finaliserCommandePayee } = require("../services/finaliserPaiement");
const {
  creerOrdrePaypal,
  lireOrdrePaypal,
  verifierLiaisonPaypal,
  capturerOrdrePaypal,
  extraireMontantCapture,
} = require("../services/paypal");

const router = express.Router();

const capturePaypalOrderSchema = z.object({
  orderId: z.string().uuid(),
  paypalOrderId: z.string().min(5),
});

router.post("/paypal/create-order", authObligatoire, async (req, res, next) => {
  try {
    const validation = createCheckoutOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Commande PayPal invalide",
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

    const { order, subtotal, deliveryFee, total, orderNumber } = await creerCommandeEnAttente({
      customer,
      items,
      locale,
      userId: req.user?.id || null,
    });

    const frontendUrl = resoudreOrigineFrontend(req.headers.origin);
    const paypal = await creerOrdrePaypal({
      orderId: order.id,
      orderNumber,
      total,
      frontendUrl,
      returnPath: validation.data.returnPath,
    });

    res.status(201).json({
      orderId: order.id,
      orderNumber,
      paypalOrderId: paypal.paypalOrderId,
      approveUrl: paypal.approveUrl,
      subtotal,
      deliveryFee,
      total,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/paypal/capture-order", authObligatoire, async (req, res, next) => {
  try {
    const validation = capturePaypalOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Capture PayPal invalide",
        details: validation.error.flatten(),
      });
    }

    const { orderId, paypalOrderId } = validation.data;
    const { order } = await chargerCommandeAvecItems(orderId);

    if (order.user_id && order.user_id !== req.user.id) {
      return res.status(403).json({ error: "Cette commande ne vous appartient pas" });
    }

    const paypalOrder = await lireOrdrePaypal(paypalOrderId);
    verifierLiaisonPaypal(paypalOrder, orderId);

    if (order.status === "paid") {
      return res.json({
        ok: true,
        alreadyPaid: true,
        orderId,
        orderNumber: genererNumeroCommande(order),
        status: "paid",
        stockUpdates: [],
      });
    }

    if (order.status !== "pending_payment") {
      const err = new Error(`Statut commande invalide pour capture: ${order.status}`);
      err.status = 409;
      throw err;
    }

    const captureData = await capturerOrdrePaypal(paypalOrderId);
    const capture = extraireMontantCapture(captureData);
    const expectedTotal = Number(order.total_amount) || 0;

    if (capture.status !== "COMPLETED") {
      const err = new Error("Paiement PayPal non complété");
      err.status = 402;
      throw err;
    }

    if (capture.currency !== "EUR" || Math.abs(capture.amount - expectedTotal) > 0.01) {
      const err = new Error("Montant PayPal différent du total commande");
      err.status = 409;
      throw err;
    }

    const resultat = await finaliserCommandePayee(orderId, req.user?.id);
    res.json({
      ...resultat,
      paypalOrderId,
      captureId: capture.captureId,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
