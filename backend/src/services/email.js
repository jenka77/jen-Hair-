const {
  genererHtmlConfirmationCommande,
  genererHtmlChangementStatut,
  formaterPrix,
  nettoyerNomProduit,
} = require("./emailTemplates");
const { supabase } = require("../supabase");

async function envoyerEmail({ to, subject, text, html, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Jen's & Floran <onboarding@resend.dev>";

  if (!apiKey || apiKey.startsWith("votre_")) {
    console.warn("RESEND_API_KEY manquante : email non envoyé.");
    return { skipped: true };
  }

  const payload = {
    from,
    to,
    subject,
    reply_to: replyTo,
  };

  if (html) {
    payload.html = html;
    if (text) payload.text = text;
  } else {
    payload.text = text;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Erreur email Resend: ${body}`);
  }

  return body ? JSON.parse(body) : { ok: true };
}

function formatLignesCommandeTexte(lignes) {
  return lignes
    .map(({ item, produit }) => {
      const sousTotal = Number(produit.price) * item.quantity;
      const nom = nettoyerNomProduit(produit.name);
      return `• ${nom} × ${item.quantity}
  - Type : ${produit.wig_type || "-"}
  - Taille : ${produit.wig_size || "-"}
  - Couleur : ${produit.color || "-"}
  - Lace : ${produit.lace_size || "-"}
  - Sous-total : ${formaterPrix(sousTotal)}`;
    })
    .join("\n\n");
}

async function chargerLignesCommandePourEmail(orderId) {
  const { data: items, error } = await supabase
    .from("order_items")
    .select("product_id, product_name, quantity, unit_price")
    .eq("order_id", orderId);

  if (error || !items?.length) return [];

  const ids = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
  let produitsParId = {};

  if (ids.length) {
    const { data: produits } = await supabase
      .from("products")
      .select("id, name, wig_type, wig_size, color, lace_size, price, image_url")
      .in("id", ids);

    produitsParId = Object.fromEntries((produits || []).map((p) => [p.id, p]));
  }

  return items.map((row) => {
    const produit = produitsParId[row.product_id] || {
      name: row.product_name,
      price: row.unit_price,
      wig_type: null,
      wig_size: null,
      color: null,
      lace_size: null,
      image_url: null,
    };

    return {
      item: { product_id: row.product_id, quantity: row.quantity },
      produit,
    };
  });
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
  const articles = formatLignesCommandeTexte(lignes);
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

  const texteClient = `Bonjour ${customer.name},

Votre commande a bien été acceptée.

${commun}

Vous recevrez un e-mail lorsque votre commande sera prête ou expédiée.

Merci pour votre confiance.
Jen's & Floran`;

  const htmlClient = genererHtmlConfirmationCommande({
    orderNumber,
    customerName: customer.name,
    lignes,
    subtotal,
    deliveryFee,
    total,
    pickupMode: order.pickup_mode,
    deliveryAddress: order.delivery_address,
  });

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
    subject: `Commande confirmée — ${orderNumber}`,
    replyTo: adminEmail,
    text: texteClient,
    html: htmlClient,
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

Merci pour votre confiance.
Jen's & Floran`,

    ready: `Bonjour ${order.customer_name},

Votre commande ${orderNumber} est prête. Vous pouvez venir la retirer chez Saá Mokolo.

Merci pour votre confiance.
Jen's & Floran`,

    delivered: `Bonjour ${order.customer_name},

Votre commande ${orderNumber} a été livrée.

Merci pour votre confiance.
Jen's & Floran`,
  };

  const lignes = await chargerLignesCommandePourEmail(order.id);
  const html = genererHtmlChangementStatut({
    orderNumber,
    customerName: order.customer_name,
    status,
    lignes,
    pickupMode: order.pickup_mode,
  });

  const result = await envoyerEmail({
    to: emailClient,
    subject: sujets[status],
    replyTo: adminEmail,
    text: corps[status],
    html,
  });

  if (result?.skipped) {
    return { skipped: true, reason: "resend_non_configure", to: emailClient };
  }

  console.log(`Email statut "${status}" envoyé à ${emailClient} (${orderNumber})`);
  return { ...result, to: emailClient };
}

module.exports = { envoyerEmailsCommande, envoyerEmailChangementStatut };
