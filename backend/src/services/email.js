async function envoyerEmail({ to, subject, text, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Jen's & Floran <onboarding@resend.dev>";

  if (!apiKey || apiKey.startsWith("votre_")) {
    console.warn("RESEND_API_KEY manquante : email non envoyé.");
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      reply_to: replyTo,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Erreur email Resend: ${body}`);
  }

  return body ? JSON.parse(body) : { ok: true };
}

function formaterPrix(montant) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant) || 0);
}

function formatLignesCommande(lignes) {
  return lignes
    .map(({ item, produit }) => {
      const sousTotal = Number(produit.price) * item.quantity;
      return `• ${produit.name} × ${item.quantity}
  - Type : ${produit.wig_type || "-"}
  - Taille : ${produit.wig_size || "-"}
  - Couleur : ${produit.color || "-"}
  - Lace : ${produit.lace_size || "-"}
  - Sous-total : ${formaterPrix(sousTotal)}`;
    })
    .join("\n\n");
}

async function envoyerEmailsCommande({
  order,
  orderNumber,
  customer,
  lignes,
  subtotal,
  deliveryFee,
  total,
}) {
  const adminEmail = process.env.EMAIL_ADMIN;
  const articles = formatLignesCommande(lignes);
  const fraisLivraisonTexte =
    deliveryFee > 0
      ? `\nFrais de livraison : ${formaterPrix(deliveryFee)}
Les frais de livraison de ${formaterPrix(deliveryFee)} sont inclus dans le total.`
      : "\nFrais de livraison : 0,00 €";

  const commun = `Commande : ${orderNumber}

Cliente : ${customer.name}
Téléphone : ${customer.phone}
Email : ${customer.email}
Mode de récupération : ${order.pickup_mode}
Adresse : ${order.delivery_address}

Articles :
${articles}
${fraisLivraisonTexte}

Sous-total : ${formaterPrix(subtotal)}
Total : ${formaterPrix(total)}`;

  const resultats = {};

  if (adminEmail) {
    resultats.admin = await envoyerEmail({
      to: adminEmail,
      subject: `Nouvelle commande ${orderNumber}`,
      replyTo: customer.email,
      text: `Nouvelle commande reçue.\n\n${commun}`,
    });
  }

  resultats.client = await envoyerEmail({
    to: customer.email,
    subject: `Commande acceptée — ${orderNumber}`,
    replyTo: adminEmail,
    text: `Bonjour ${customer.name},

Votre commande a bien été acceptée.

${commun}

Vous recevrez un email supplémentaire dès que votre commande sera livrée ou disponible en boutique chez Saá Mokolo.

Sie erhalten außerdem eine E-Mail, sobald Ihre Bestellung geliefert wurde oder zur Abholung im Geschäft bei Saá Mokolo bereit ist.

You will also receive an email once your order has been delivered or is ready for pickup at Saá Mokolo boutique.

Merci pour votre confiance.
Jen's & Floran`,
  });

  return resultats;
}

function extraireEmailClient(order) {
  const direct = String(order.customer_email || "").trim();
  if (direct.includes("@")) return direct.toLowerCase();

  const parts = String(order.customer_contact || "").split(" / ");
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const candidate = parts[i].trim();
    if (candidate.includes("@")) return candidate.toLowerCase();
  }
  return null;
}

const STATUTS_AVEC_EMAIL = new Set(["preparing", "ready", "delivered"]);

async function envoyerEmailChangementStatut({
  order,
  orderNumber,
  status,
  previousStatus,
}) {
  if (previousStatus && previousStatus === status) {
    return { skipped: true, reason: "statut_inchange" };
  }

  if (!STATUTS_AVEC_EMAIL.has(status)) {
    return { skipped: true, reason: "statut_sans_email" };
  }

  const emailClient = extraireEmailClient(order);
  if (!emailClient) {
    console.warn(
      `Email statut ${status} non envoyé : adresse introuvable pour commande ${orderNumber}`
    );
    return { skipped: true, reason: "email_introuvable" };
  }

  const adminEmail = process.env.EMAIL_ADMIN;
  const sujets = {
    preparing: `Commande en préparation — ${orderNumber}`,
    ready: `Commande prête — ${orderNumber}`,
    delivered: `Commande livrée — ${orderNumber}`,
  };

  const corps = {
    preparing: `Bonjour ${order.customer_name},

Votre commande ${orderNumber} est en cours de préparation.

Ihre Bestellung ${orderNumber} wird gerade vorbereitet.

Your order ${orderNumber} is being prepared.

Merci pour votre confiance.
Jen's & Floran`,

    ready: `Bonjour ${order.customer_name},

Votre commande ${orderNumber} est prête. Vous pouvez venir la retirer chez Saá Mokolo.

Ihre Bestellung ${orderNumber} ist abholbereit im Geschäft bei Saá Mokolo.

Your order ${orderNumber} is ready for pickup at Saá Mokolo boutique.

Merci pour votre confiance.
Jen's & Floran`,

    delivered: `Bonjour ${order.customer_name},

Votre commande ${orderNumber} a été livrée.

Ihre Bestellung ${orderNumber} wurde geliefert.

Your order ${orderNumber} has been delivered.

Merci pour votre confiance.
Jen's & Floran`,
  };

  const result = await envoyerEmail({
    to: emailClient,
    subject: sujets[status],
    replyTo: adminEmail,
    text: corps[status],
  });

  if (result?.skipped) {
    return { skipped: true, reason: "resend_non_configure", to: emailClient };
  }

  console.log(`Email statut "${status}" envoyé à ${emailClient} (${orderNumber})`);
  return { ...result, to: emailClient };
}

module.exports = { envoyerEmailsCommande, envoyerEmailChangementStatut };
