const SITE_URL = (process.env.SITE_URL || "https://www.jens-flora.com").replace(/\/$/, "");
const LOGO_URL = `${SITE_URL}/logo.png`;
const GOLD = "#c9a962";

function echapperHtml(texte) {
  return String(texte ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nettoyerNomProduit(nom) {
  return String(nom || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u26FF\u2700-\u27BF⭐✨]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formaterPrix(montant) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant) || 0);
}

function urlImageProduit(imageUrl) {
  const raw = String(imageUrl || "").trim();
  if (!raw) return `${SITE_URL}/1.jpg`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${SITE_URL}/${raw.replace(/^\//, "")}`;
}

function detailsProduit(produit) {
  return [produit.wig_type, produit.wig_size, produit.color, produit.lace_size]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(" · ");
}

function boutonPrincipal(href, label) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
      <tr>
        <td align="center" style="border-radius:4px;background-color:${GOLD};">
          <a href="${echapperHtml(href)}" style="display:inline-block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:4px;">
            ${echapperHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

function ligneArticle({ item, produit }) {
  const nom = nettoyerNomProduit(produit.name);
  const details = detailsProduit(produit);
  const sousTotal = Number(produit.price) * item.quantity;
  const image = urlImageProduit(produit.image_url);

  return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #eeeeee;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td width="72" valign="top" style="padding-right:14px;">
              <img src="${echapperHtml(image)}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid #ececec;" />
            </td>
            <td valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#333333;">
              <strong style="color:#1a1a1a;font-weight:600;">${echapperHtml(nom)}</strong>
              <span style="color:#666666;"> × ${item.quantity}</span>
              ${details ? `<br /><span style="font-size:13px;color:#888888;">${echapperHtml(details)}</span>` : ""}
            </td>
            <td valign="top" align="right" style="padding-left:12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;white-space:nowrap;">
              ${echapperHtml(formaterPrix(sousTotal))}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function blocArticles(lignes, titre = "Articles commandés") {
  if (!lignes.length) return "";

  const rows = lignes.map(ligneArticle).join("");

  return `
    <tr>
      <td style="padding:28px 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#1a1a1a;">
        ${echapperHtml(titre)}
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${rows}
        </table>
      </td>
    </tr>`;
}

function blocRecapitulatif({ subtotal, deliveryFee, total, pickupMode, deliveryAddress }) {
  const lignes = [
    `<tr><td style="padding:6px 0;color:#666666;">Sous-total</td><td align="right" style="padding:6px 0;color:#1a1a1a;">${echapperHtml(formaterPrix(subtotal))}</td></tr>`,
  ];

  if (deliveryFee > 0) {
    lignes.push(
      `<tr><td style="padding:6px 0;color:#666666;">Frais de livraison</td><td align="right" style="padding:6px 0;color:#1a1a1a;">${echapperHtml(formaterPrix(deliveryFee))}</td></tr>`
    );
  }

  lignes.push(
    `<tr><td style="padding:10px 0 0;color:#1a1a1a;font-weight:700;">Total</td><td align="right" style="padding:10px 0 0;color:${GOLD};font-weight:700;font-size:16px;">${echapperHtml(formaterPrix(total))}</td></tr>`
  );

  return `
    <tr>
      <td style="padding:0 32px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">
          <tr>
            <td style="padding:16px 18px;background-color:#fafafa;border:1px solid #eeeeee;border-radius:8px;">
              <p style="margin:0 0 8px;font-size:13px;color:#888888;text-transform:uppercase;letter-spacing:0.08em;">Mode de récupération</p>
              <p style="margin:0 0 14px;color:#1a1a1a;">${echapperHtml(pickupMode || "—")}</p>
              ${
                deliveryAddress && deliveryAddress !== "—"
                  ? `<p style="margin:0 0 8px;font-size:13px;color:#888888;text-transform:uppercase;letter-spacing:0.08em;">Adresse</p>
                     <p style="margin:0 0 14px;color:#1a1a1a;">${echapperHtml(deliveryAddress)}</p>`
                  : ""
              }
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #ececec;margin-top:4px;padding-top:8px;">
                ${lignes.join("")}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function enveloppeEmail({ titrePage, contenu }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${echapperHtml(titrePage)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f5f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;">
          <tr>
            <td align="center" style="padding:36px 32px 20px;">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <img src="${LOGO_URL}" width="160" alt="Jen's &amp; Floran" style="display:block;border:0;max-width:160px;height:auto;" />
              </a>
            </td>
          </tr>
          ${contenu}
          <tr>
            <td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #eeeeee;margin:0;" /></td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#888888;text-align:center;">
              <strong style="color:#1a1a1a;">Sa'a Mokolo</strong><br />
              Jen's &amp; Floran — Steinstra&#223;e 70, 35390 Gie&#223;en<br />
              <a href="mailto:jensFloaran@gmail.com" style="color:${GOLD};text-decoration:none;">jensFloaran@gmail.com</a>
              &nbsp;·&nbsp;
              <a href="https://wa.me/4915217868134" style="color:${GOLD};text-decoration:none;">+49 152 17868134</a>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
          <tr>
            <td align="center" style="padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#aaaaaa;">
              &copy; 2026 Jen's &amp; Floran. Tous droits r&#233;serv&#233;s.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function genererHtmlConfirmationCommande({
  orderNumber,
  customerName,
  lignes,
  subtotal,
  deliveryFee,
  total,
  pickupMode,
  deliveryAddress,
}) {
  const prenom = String(customerName || "").trim().split(/\s+/)[0] || "Bonjour";
  const urlCompte = `${SITE_URL}/compte.html`;
  const urlBoutique = `${SITE_URL}/maison.html`;

  const contenu = `
    <tr>
      <td align="center" style="padding:0 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#999999;">
        Commande ${echapperHtml(orderNumber)}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 16px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;color:#1a1a1a;font-weight:700;">
        Votre commande est confirm&#233;e
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#666666;">
        Bonjour ${echapperHtml(prenom)},<br />
        merci pour votre confiance. Nous avons bien re&#231;u votre commande et la pr&#233;parons avec soin.
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 12px;">
        ${boutonPrincipal(urlCompte, "Afficher votre commande")}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#666666;">
        ou <a href="${urlBoutique}" style="color:${GOLD};text-decoration:underline;">Visitez notre boutique</a>
      </td>
    </tr>
    ${blocArticles(lignes, "Articles commandés")}
    ${blocRecapitulatif({ subtotal, deliveryFee, total, pickupMode, deliveryAddress })}
    <tr>
      <td style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#888888;text-align:center;">
        Vous recevrez un e-mail lorsque votre commande sera pr&#234;te ou exp&#233;di&#233;e.
      </td>
    </tr>`;

  return enveloppeEmail({
    titrePage: `Commande confirmée — ${orderNumber}`,
    contenu,
  });
}

function genererHtmlChangementStatut({
  orderNumber,
  customerName,
  status,
  lignes = [],
  pickupMode,
}) {
  const prenom = String(customerName || "").trim().split(/\s+/)[0] || "Bonjour";
  const urlCompte = `${SITE_URL}/compte.html`;
  const urlBoutique = `${SITE_URL}/maison.html`;

  const messages = {
    preparing: {
      titre: "Votre commande est en pr&#233;paration",
      texte: "Nous pr&#233;parons actuellement les articles de votre commande avec le plus grand soin.",
      articles: "Articles en préparation",
    },
    ready: {
      titre: "Votre commande est pr&#234;te",
      texte: pickupMode?.toLowerCase().includes("retrait")
        ? "Votre commande est pr&#234;te. Vous pouvez venir la retirer chez Sa&#39;a Mokolo."
        : "Votre commande est pr&#234;te. Nous vous contacterons pour la suite.",
      articles: "Articles dans cette commande",
    },
    delivered: {
      titre: "Votre commande a &#233;t&#233; livr&#233;e",
      texte: "Votre commande a bien &#233;t&#233; livr&#233;e. Nous esp&#233;rons qu&#39;elle vous apportera enti&#232;re satisfaction.",
      articles: "Articles livrés",
    },
  };

  const msg = messages[status] || messages.preparing;

  const contenu = `
    <tr>
      <td align="center" style="padding:0 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#999999;">
        Commande ${echapperHtml(orderNumber)}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 16px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;color:#1a1a1a;font-weight:700;">
        ${msg.titre}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#666666;">
        Bonjour ${echapperHtml(prenom)},<br />
        ${msg.texte}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 12px;">
        ${boutonPrincipal(urlCompte, "Afficher votre commande")}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#666666;">
        ou <a href="${urlBoutique}" style="color:${GOLD};text-decoration:underline;">Visitez notre boutique</a>
      </td>
    </tr>
    ${lignes.length ? blocArticles(lignes, msg.articles) : ""}`;

  return enveloppeEmail({
    titrePage: `${orderNumber} — Jen's & Floran`,
    contenu,
  });
}

module.exports = {
  genererHtmlConfirmationCommande,
  genererHtmlChangementStatut,
  nettoyerNomProduit,
  formaterPrix,
};
