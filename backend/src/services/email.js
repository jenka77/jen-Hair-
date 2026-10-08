const {
  genererHtmlConfirmationCommande,
  genererHtmlChangementStatut,
  formaterPrix,
  nettoyerNomProduit,
  sujetEmail,
  texteConfirmationCommande,
  texteChangementStatut,
  genererHtmlNouvelleCoiffeuseAdmin,
  genererHtmlCoiffeuseApprouvee,
  genererHtmlReceptionCoiffeuse,
  genererHtmlNouvelleCoiffeurAdmin,
  genererHtmlCoiffeurApprouvee,
  genererHtmlReceptionCoiffeur,
  texteNouvelleCoiffeuseAdmin,
  texteCoiffeuseApprouvee,
  texteReceptionCoiffeuse,
  texteNouvelleCoiffeurAdmin,
  texteCoiffeurApprouvee,
  texteReceptionCoiffeur,
  normaliserLocale,
  tr,
  EMAIL_LOGO_CID,
  pieceJointeLogoEmailInline,
} = require("./emailTemplates");
const { supabase } = require("../supabase");

function adresseExpediteur() {
  const nomAffiche = (process.env.EMAIL_FROM_NAME || "Jen's & Floran").trim();
  const brut = String(process.env.EMAIL_FROM || "").trim();
  const email =
    brut.match(/<([^>]+)>/)?.[1]?.trim() ||
    String(process.env.EMAIL_FROM_ADDRESS || "").trim() ||
    "contact@shop.jens-flora.com";
  return `${nomAffiche} <${email}>`;
}

function normaliserDestinataires(to) {
  const liste = Array.isArray(to) ? to : [to];
  return liste
    .map((adresse) => String(adresse || "").trim())
    .filter((adresse) => adresse.includes("@"));
}

async function envoyerEmail({ to, subject, text, html, replyTo, attachments }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = adresseExpediteur();
  const destinataires = normaliserDestinataires(to);

  if (!destinataires.length) {
    throw new Error("Destinataire email invalide ou manquant");
  }

  if (!apiKey || apiKey.startsWith("votre_")) {
    console.warn("RESEND_API_KEY manquante : email non envoyé.");
    return { skipped: true };
  }

  let piecesJointes = Array.isArray(attachments) ? [...attachments] : [];
  if (
    html &&
    html.includes(`cid:${EMAIL_LOGO_CID}`) &&
    !piecesJointes.some((a) => a.content_id === EMAIL_LOGO_CID)
  ) {
    piecesJointes.push(pieceJointeLogoEmailInline());
  }

  const payload = {
    from,
    to: destinataires,
    subject,
  };

  const reply = String(replyTo || "").trim();
  if (reply.includes("@")) {
    payload.reply_to = reply;
  }

  if (html) {
    payload.html = html;
    if (text) payload.text = text;
  } else {
    payload.text = text;
  }

  if (piecesJointes.length) {
    payload.attachments = piecesJointes;
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

function extraireEmailClient(order) {
  const direct = String(order?.customer_email || "").trim().toLowerCase();
  if (direct.includes("@")) return direct;

  const parts = String(order?.customer_contact || "")
    .split(" / ")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const candidate of parts) {
    if (candidate.includes("@")) return candidate.toLowerCase();
  }
  return null;
}

function extraireTelephoneClient(order) {
  const parts = String(order?.customer_contact || "")
    .split(" / ")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (!part.includes("@")) return part;
  }
  return "";
}

function resoudreCoordonneesCliente(order, hint = {}) {
  const email = extraireEmailClient(order) || String(hint.email || "").trim().toLowerCase();
  const phone = extraireTelephoneClient(order) || String(hint.phone || "").trim();
  const name = String(order?.customer_name || hint.name || "").trim();
  return { name, phone, email: email && email.includes("@") ? email : "" };
}

async function envoyerEmailsCommande({
  order,
  orderNumber,
  customer,
  lignes,
  subtotal,
  deliveryFee,
  total,
  locale = "fr",
}) {
  const lang = normaliserLocale(locale || order.customer_locale);
  const adminEmail = String(process.env.EMAIL_ADMIN || "").trim();
  const coords = resoudreCoordonneesCliente(order, customer);
  const emailClient = coords.email;

  if (!emailClient) {
    throw new Error("Email cliente introuvable pour la confirmation de commande");
  }

  const articles = formatLignesCommandeTexte(lignes);
  const fraisLivraisonTexte =
    deliveryFee > 0
      ? `\nFrais de livraison : ${formaterPrix(deliveryFee, lang)}
Les frais de livraison de ${formaterPrix(deliveryFee, lang)} sont inclus dans le total.`
      : "\nFrais de livraison : 0,00 €";

  const communAdmin = `Commande : ${orderNumber}

Cliente : ${coords.name}
Téléphone : ${coords.phone}
Email : ${emailClient}
Mode de récupération : ${order.pickup_mode}
Adresse : ${order.delivery_address}

Articles :
${articles}
${fraisLivraisonTexte}

Sous-total : ${formaterPrix(subtotal, lang)}
Total : ${formaterPrix(total, lang)}`;

  const recapClient = `Commande : ${orderNumber}
Mode de récupération : ${order.pickup_mode}
Adresse : ${order.delivery_address}

Articles :
${articles}
${fraisLivraisonTexte}

Sous-total : ${formaterPrix(subtotal, lang)}
Total : ${formaterPrix(total, lang)}`;

  const texteClient = texteConfirmationCommande({
    customerName: coords.name,
    orderNumber,
    articles,
    commun: recapClient,
    locale: lang,
  });

  const htmlClient = genererHtmlConfirmationCommande({
    orderNumber,
    customerName: coords.name,
    lignes,
    subtotal,
    deliveryFee,
    total,
    pickupMode: order.pickup_mode,
    deliveryAddress: order.delivery_address,
    locale: lang,
  });

  const resultats = {};

  if (adminEmail) {
    resultats.admin = await envoyerEmail({
      to: adminEmail,
      subject: `Nouvelle commande ${orderNumber}`,
      replyTo: emailClient,
      text: `Nouvelle commande reçue.\n\n${communAdmin}`,
    });
  }

  resultats.client = await envoyerEmail({
    to: emailClient,
    subject: sujetEmail("confirmed", orderNumber, lang),
    replyTo: adminEmail,
    text: texteClient,
    html: htmlClient,
  });

  console.log(
    `Emails commande ${orderNumber} : admin → ${adminEmail || "(non configuré)"}, cliente → ${emailClient}`
  );

  return resultats;
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
  const lang = normaliserLocale(order.customer_locale);
  const sujets = {
    preparing: sujetEmail("preparing", orderNumber, lang),
    ready: sujetEmail("ready", orderNumber, lang),
    delivered: sujetEmail("delivered", orderNumber, lang),
  };

  const lignes = await chargerLignesCommandePourEmail(order.id);
  const html = genererHtmlChangementStatut({
    orderNumber,
    customerName: order.customer_name,
    status,
    lignes,
    pickupMode: order.pickup_mode,
    locale: lang,
  });

  const corps = {
    preparing: texteChangementStatut({ customerName: order.customer_name, orderNumber, status: "preparing", locale: lang }),
    ready: texteChangementStatut({ customerName: order.customer_name, orderNumber, status: "ready", locale: lang }),
    delivered: texteChangementStatut({ customerName: order.customer_name, orderNumber, status: "delivered", locale: lang }),
  };

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

function urlAdminCoiffeuses() {
  const base = (process.env.SITE_URL || "https://www.jens-flora.com").replace(/\/$/, "");
  return `${base}/admin.html`;
}

function urlAnnuaireCoiffeuses(stateSlug) {
  const base = (process.env.SITE_URL || "https://www.jens-flora.com").replace(/\/$/, "");
  const params = new URLSearchParams({ type: "coiffeuses" });
  if (stateSlug) params.set("land", stateSlug);
  return `${base}/type.html?${params.toString()}`;
}

async function envoyerEmailNouvelleInscriptionCoiffeuse(coiffeuse, locale = "fr") {
  const adminEmail = process.env.EMAIL_ADMIN;
  if (!adminEmail) {
    console.warn("EMAIL_ADMIN manquant : notification coiffeuse non envoyée.");
    return { skipped: true, reason: "admin_email_manquant" };
  }

  const lang = normaliserLocale(locale);
  const adminUrl = urlAdminCoiffeuses();
  const subject = tr(lang, "coiffeuseAdminSubject", { name: coiffeuse.name || "Coiffeuse" });

  const result = await envoyerEmail({
    to: adminEmail,
    subject,
    replyTo: coiffeuse.contactEmail || undefined,
    text: texteNouvelleCoiffeuseAdmin({ coiffeuse, adminUrl, locale: lang }),
    html: genererHtmlNouvelleCoiffeuseAdmin({ coiffeuse, adminUrl, locale: lang }),
  });

  if (!result?.skipped) {
    console.log(`Notification nouvelle coiffeuse envoyée à ${adminEmail} (${coiffeuse.name})`);
  }

  return result;
}

async function envoyerEmailReceptionCoiffeuse(coiffeuse, locale = "fr") {
  const email = String(coiffeuse.contactEmail || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { skipped: true, reason: "email_introuvable" };
  }

  const lang = normaliserLocale(locale);
  const directoryUrl = urlAnnuaireCoiffeuses(coiffeuse.stateSlug);
  const subject = tr(lang, "coiffeuseReceivedSubject");

  const result = await envoyerEmail({
    to: email,
    subject,
    text: texteReceptionCoiffeuse({ coiffeuse, directoryUrl, locale: lang }),
    html: genererHtmlReceptionCoiffeuse({ coiffeuse, directoryUrl, locale: lang }),
  });

  if (!result?.skipped) {
    console.log(`Accusé réception coiffeuse envoyé à ${email} (${coiffeuse.name})`);
  }

  return { ...result, to: email };
}

async function envoyerEmailCoiffeuseApprouvee(coiffeuse, locale = "fr") {
  const email = String(coiffeuse.contactEmail || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.warn(`Email approbation coiffeuse non envoyé : adresse introuvable (${coiffeuse.name})`);
    return { skipped: true, reason: "email_introuvable" };
  }

  const lang = normaliserLocale(locale);
  const directoryUrl = urlAnnuaireCoiffeuses(coiffeuse.stateSlug);
  const adminEmail = process.env.EMAIL_ADMIN;
  const subject = tr(lang, "coiffeuseApprovedSubject");

  const result = await envoyerEmail({
    to: email,
    subject,
    replyTo: adminEmail || undefined,
    text: texteCoiffeuseApprouvee({ coiffeuse, directoryUrl, locale: lang }),
    html: genererHtmlCoiffeuseApprouvee({ coiffeuse, directoryUrl, locale: lang }),
  });

  if (!result?.skipped) {
    console.log(`Email approbation coiffeuse envoyé à ${email} (${coiffeuse.name})`);
  }

  return { ...result, to: email };
}

function urlAnnuaireCoiffeurs(stateSlug) {
  const base = (process.env.SITE_URL || "https://www.jens-flora.com").replace(/\/$/, "");
  const params = new URLSearchParams({ type: "coiffeurs" });
  if (stateSlug) params.set("land", stateSlug);
  return `${base}/type.html?${params.toString()}`;
}

async function envoyerEmailNouvelleInscriptionCoiffeur(coiffeur, locale = "fr") {
  const adminEmail = process.env.EMAIL_ADMIN;
  if (!adminEmail) {
    console.warn("EMAIL_ADMIN manquant : notification coiffeur non envoyée.");
    return { skipped: true, reason: "admin_email_manquant" };
  }

  const lang = normaliserLocale(locale);
  const adminUrl = urlAdminCoiffeuses();
  const subject = tr(lang, "coiffeurAdminSubject", { name: coiffeur.name || "Coiffeur" });

  const result = await envoyerEmail({
    to: adminEmail,
    subject,
    replyTo: coiffeur.contactEmail || undefined,
    text: texteNouvelleCoiffeurAdmin({ coiffeur, adminUrl, locale: lang }),
    html: genererHtmlNouvelleCoiffeurAdmin({ coiffeur, adminUrl, locale: lang }),
  });

  if (!result?.skipped) {
    console.log(`Notification nouveau coiffeur envoyée à ${adminEmail} (${coiffeur.name})`);
  }

  return result;
}

async function envoyerEmailReceptionCoiffeur(coiffeur, locale = "fr") {
  const email = String(coiffeur.contactEmail || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { skipped: true, reason: "email_introuvable" };
  }

  const lang = normaliserLocale(locale);
  const directoryUrl = urlAnnuaireCoiffeurs(coiffeur.stateSlug);
  const subject = tr(lang, "coiffeurReceivedSubject");

  const result = await envoyerEmail({
    to: email,
    subject,
    text: texteReceptionCoiffeur({ coiffeur, directoryUrl, locale: lang }),
    html: genererHtmlReceptionCoiffeur({ coiffeur, directoryUrl, locale: lang }),
  });

  if (!result?.skipped) {
    console.log(`Accusé réception coiffeur envoyé à ${email} (${coiffeur.name})`);
  }

  return { ...result, to: email };
}

async function envoyerEmailCoiffeurApprouvee(coiffeur, locale = "fr") {
  const email = String(coiffeur.contactEmail || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.warn(`Email approbation coiffeur non envoyé : adresse introuvable (${coiffeur.name})`);
    return { skipped: true, reason: "email_introuvable" };
  }

  const lang = normaliserLocale(locale);
  const directoryUrl = urlAnnuaireCoiffeurs(coiffeur.stateSlug);
  const adminEmail = process.env.EMAIL_ADMIN;
  const subject = tr(lang, "coiffeurApprovedSubject");

  const result = await envoyerEmail({
    to: email,
    subject,
    replyTo: adminEmail || undefined,
    text: texteCoiffeurApprouvee({ coiffeur, directoryUrl, locale: lang }),
    html: genererHtmlCoiffeurApprouvee({ coiffeur, directoryUrl, locale: lang }),
  });

  if (!result?.skipped) {
    console.log(`Email approbation coiffeur envoyé à ${email} (${coiffeur.name})`);
  }

  return { ...result, to: email };
}

module.exports = {
  envoyerEmailsCommande,
  envoyerEmailChangementStatut,
  envoyerEmailNouvelleInscriptionCoiffeuse,
  envoyerEmailReceptionCoiffeuse,
  envoyerEmailCoiffeuseApprouvee,
  envoyerEmailNouvelleInscriptionCoiffeur,
  envoyerEmailReceptionCoiffeur,
  envoyerEmailCoiffeurApprouvee,
  resoudreCoordonneesCliente,
  extraireEmailClient,
};
