const SITE_URL = (process.env.SITE_URL || "https://www.jens-flora.com").replace(/\/$/, "");
const LOGO_URL = `${SITE_URL}/logo.png`;
const GOLD = "#c9a962";

const EMAIL_I18N = {
  fr: {
    orderLabel: "Commande",
    confirmedTitle: "Votre commande est confirmée",
    confirmedLead:
      "merci pour votre confiance. Nous avons bien reçu votre commande et la préparons avec soin.",
    viewOrder: "Afficher votre commande",
    visitShop: "Visitez notre boutique",
    or: "ou",
    itemsOrdered: "Articles commandés",
    pickupLabel: "Mode de récupération",
    addressLabel: "Adresse",
    subtotal: "Sous-total",
    deliveryFee: "Frais de livraison",
    total: "Total",
    followUp: "Vous recevrez un e-mail lorsque votre commande sera prête ou expédiée.",
    pickupMode: "Retrait en boutique chez Sa'a Mokolo",
    deliveryMode: "Livraison à domicile",
    hello: "Bonjour",
    subjectConfirmed: "Commande confirmée — {orderNumber}",
    subjectPreparing: "Commande en préparation — {orderNumber}",
    subjectReady: "Commande prête — {orderNumber}",
    subjectDelivered: "Commande livrée — {orderNumber}",
    statusPreparingTitle: "Votre commande est en préparation",
    statusPreparingText:
      "Nous préparons actuellement les articles de votre commande avec le plus grand soin.",
    statusPreparingItems: "Articles en préparation",
    statusReadyTitle: "Votre commande est prête",
    statusReadyPickup:
      "Votre commande est prête. Vous pouvez venir la retirer chez Sa'a Mokolo.",
    statusReadyOther: "Votre commande est prête. Nous vous contacterons pour la suite.",
    statusReadyItems: "Articles dans cette commande",
    statusDeliveredTitle: "Votre commande a été livrée",
    statusDeliveredText:
      "Votre commande a bien été livrée. Nous espérons qu'elle vous apportera entière satisfaction.",
    statusDeliveredItems: "Articles livrés",
    footerCopy: "© 2026 Jen's & Floran. Tous droits réservés.",
  },
  de: {
    orderLabel: "Bestellung",
    confirmedTitle: "Ihre Bestellung ist bestätigt",
    confirmedLead:
      "vielen Dank für Ihr Vertrauen. Wir haben Ihre Bestellung erhalten und bereiten sie sorgfältig vor.",
    viewOrder: "Bestellung anzeigen",
    visitShop: "Besuchen Sie unseren Shop",
    or: "oder",
    itemsOrdered: "Bestellte Artikel",
    pickupLabel: "Abholmodus",
    addressLabel: "Adresse",
    subtotal: "Zwischensumme",
    deliveryFee: "Versandkosten",
    total: "Gesamt",
    followUp: "Sie erhalten eine E-Mail, sobald Ihre Bestellung bereit ist oder versendet wurde.",
    pickupMode: "Abholung im Geschäft bei Sa'a Mokolo",
    deliveryMode: "Lieferung nach Hause",
    hello: "Hallo",
    subjectConfirmed: "Bestellung bestätigt — {orderNumber}",
    subjectPreparing: "Bestellung in Vorbereitung — {orderNumber}",
    subjectReady: "Bestellung abholbereit — {orderNumber}",
    subjectDelivered: "Bestellung geliefert — {orderNumber}",
    statusPreparingTitle: "Ihre Bestellung wird vorbereitet",
    statusPreparingText: "Wir bereiten Ihre Artikel derzeit mit größter Sorgfalt vor.",
    statusPreparingItems: "Artikel in Vorbereitung",
    statusReadyTitle: "Ihre Bestellung ist bereit",
    statusReadyPickup:
      "Ihre Bestellung ist bereit. Sie können sie im Geschäft bei Sa'a Mokolo abholen.",
    statusReadyOther: "Ihre Bestellung ist bereit. Wir melden uns für die nächsten Schritte.",
    statusReadyItems: "Artikel in dieser Bestellung",
    statusDeliveredTitle: "Ihre Bestellung wurde geliefert",
    statusDeliveredText:
      "Ihre Bestellung wurde erfolgreich geliefert. Wir hoffen, sie bereitet Ihnen Freude.",
    statusDeliveredItems: "Gelieferte Artikel",
    footerCopy: "© 2026 Jen's & Floran. Alle Rechte vorbehalten.",
  },
  en: {
    orderLabel: "Order",
    confirmedTitle: "Your order is confirmed",
    confirmedLead:
      "thank you for your trust. We have received your order and are preparing it with care.",
    viewOrder: "View your order",
    visitShop: "Visit our shop",
    or: "or",
    itemsOrdered: "Items ordered",
    pickupLabel: "Pickup method",
    addressLabel: "Address",
    subtotal: "Subtotal",
    deliveryFee: "Delivery fee",
    total: "Total",
    followUp: "You will receive an email when your order is ready or shipped.",
    pickupMode: "Pickup at Sa'a Mokolo boutique",
    deliveryMode: "Home delivery",
    hello: "Hello",
    subjectConfirmed: "Order confirmed — {orderNumber}",
    subjectPreparing: "Order being prepared — {orderNumber}",
    subjectReady: "Order ready — {orderNumber}",
    subjectDelivered: "Order delivered — {orderNumber}",
    statusPreparingTitle: "Your order is being prepared",
    statusPreparingText: "We are currently preparing your items with the greatest care.",
    statusPreparingItems: "Items being prepared",
    statusReadyTitle: "Your order is ready",
    statusReadyPickup: "Your order is ready. You can pick it up at Sa'a Mokolo boutique.",
    statusReadyOther: "Your order is ready. We will contact you with the next steps.",
    statusReadyItems: "Items in this order",
    statusDeliveredTitle: "Your order has been delivered",
    statusDeliveredText:
      "Your order has been delivered. We hope it brings you complete satisfaction.",
    statusDeliveredItems: "Delivered items",
    footerCopy: "© 2026 Jen's & Floran. All rights reserved.",
  },
};

function normaliserLocale(locale) {
  return ["fr", "de", "en"].includes(locale) ? locale : "fr";
}

function tr(locale, key, vars = {}) {
  const lang = normaliserLocale(locale);
  let texte = EMAIL_I18N[lang][key] || EMAIL_I18N.fr[key] || key;
  Object.keys(vars).forEach((k) => {
    texte = texte.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
  });
  return texte;
}

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

function formaterPrix(montant, locale = "fr") {
  const loc = normaliserLocale(locale) === "de" ? "de-DE" : normaliserLocale(locale) === "en" ? "en-GB" : "fr-FR";
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant) || 0);
}

function modeRecuperationLibelle(mode, locale) {
  const m = String(mode || "").toLowerCase();
  if (m === "pickup" || m.includes("retrait") || m.includes("boutique")) {
    return tr(locale, "pickupMode");
  }
  if (m === "delivery" || m.includes("livraison") || m.includes("domicile")) {
    return tr(locale, "deliveryMode");
  }
  return mode || "—";
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

function ligneArticle({ item, produit, locale }) {
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
              ${echapperHtml(formaterPrix(sousTotal, locale))}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function blocArticles(lignes, titre, locale) {
  if (!lignes.length) return "";
  const rows = lignes.map((ligne) => ligneArticle({ ...ligne, locale })).join("");
  return `
    <tr>
      <td style="padding:28px 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#1a1a1a;">
        ${echapperHtml(titre)}
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table>
      </td>
    </tr>`;
}

function blocRecapitulatif({ subtotal, deliveryFee, total, pickupMode, deliveryAddress, locale }) {
  const pickupLabel = modeRecuperationLibelle(pickupMode, locale);
  const lignes = [
    `<tr><td style="padding:6px 0;color:#666666;">${echapperHtml(tr(locale, "subtotal"))}</td><td align="right" style="padding:6px 0;color:#1a1a1a;">${echapperHtml(formaterPrix(subtotal, locale))}</td></tr>`,
  ];
  if (deliveryFee > 0) {
    lignes.push(
      `<tr><td style="padding:6px 0;color:#666666;">${echapperHtml(tr(locale, "deliveryFee"))}</td><td align="right" style="padding:6px 0;color:#1a1a1a;">${echapperHtml(formaterPrix(deliveryFee, locale))}</td></tr>`
    );
  }
  lignes.push(
    `<tr><td style="padding:10px 0 0;color:#1a1a1a;font-weight:700;">${echapperHtml(tr(locale, "total"))}</td><td align="right" style="padding:10px 0 0;color:${GOLD};font-weight:700;font-size:16px;">${echapperHtml(formaterPrix(total, locale))}</td></tr>`
  );

  return `
    <tr>
      <td style="padding:0 32px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">
          <tr>
            <td style="padding:16px 18px;background-color:#fafafa;border:1px solid #eeeeee;border-radius:8px;">
              <p style="margin:0 0 8px;font-size:13px;color:#888888;text-transform:uppercase;letter-spacing:0.08em;">${echapperHtml(tr(locale, "pickupLabel"))}</p>
              <p style="margin:0 0 14px;color:#1a1a1a;">${echapperHtml(pickupLabel)}</p>
              ${
                deliveryAddress && deliveryAddress !== "—"
                  ? `<p style="margin:0 0 8px;font-size:13px;color:#888888;text-transform:uppercase;letter-spacing:0.08em;">${echapperHtml(tr(locale, "addressLabel"))}</p>
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

function enveloppeEmail({ titrePage, contenu, locale }) {
  const lang = normaliserLocale(locale);
  return `<!DOCTYPE html>
<html lang="${lang}">
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
              <a href="mailto:jensfloran@gmail.com" style="color:${GOLD};text-decoration:none;">jensfloran@gmail.com</a>
              &nbsp;·&nbsp;
              <a href="https://wa.me/4915217868134" style="color:${GOLD};text-decoration:none;">+49 152 17868134</a>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
          <tr>
            <td align="center" style="padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#aaaaaa;">
              ${echapperHtml(tr(locale, "footerCopy"))}
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
  locale = "fr",
}) {
  const prenom = String(customerName || "").trim().split(/\s+/)[0] || tr(locale, "hello");
  const urlCompte = `${SITE_URL}/compte.html`;
  const urlBoutique = `${SITE_URL}/maison.html`;

  const contenu = `
    <tr>
      <td align="center" style="padding:0 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#999999;">
        ${echapperHtml(tr(locale, "orderLabel"))} ${echapperHtml(orderNumber)}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 16px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;color:#1a1a1a;font-weight:700;">
        ${echapperHtml(tr(locale, "confirmedTitle"))}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#666666;">
        ${echapperHtml(tr(locale, "hello"))} ${echapperHtml(prenom)},<br />
        ${echapperHtml(tr(locale, "confirmedLead"))}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 12px;">
        ${boutonPrincipal(urlCompte, tr(locale, "viewOrder"))}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#666666;">
        ${echapperHtml(tr(locale, "or"))} <a href="${urlBoutique}" style="color:${GOLD};text-decoration:underline;">${echapperHtml(tr(locale, "visitShop"))}</a>
      </td>
    </tr>
    ${blocArticles(lignes, tr(locale, "itemsOrdered"), locale)}
    ${blocRecapitulatif({ subtotal, deliveryFee, total, pickupMode, deliveryAddress, locale })}
    <tr>
      <td style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#888888;text-align:center;">
        ${echapperHtml(tr(locale, "followUp"))}
      </td>
    </tr>`;

  return enveloppeEmail({
    titrePage: tr(locale, "subjectConfirmed", { orderNumber }),
    contenu,
    locale,
  });
}

function genererHtmlChangementStatut({
  orderNumber,
  customerName,
  status,
  lignes = [],
  pickupMode,
  locale = "fr",
}) {
  const prenom = String(customerName || "").trim().split(/\s+/)[0] || tr(locale, "hello");
  const urlCompte = `${SITE_URL}/compte.html`;
  const urlBoutique = `${SITE_URL}/maison.html`;
  const isPickup =
    String(pickupMode || "").toLowerCase() === "pickup" ||
    String(pickupMode || "").toLowerCase().includes("retrait");

  const messages = {
    preparing: {
      titre: tr(locale, "statusPreparingTitle"),
      texte: tr(locale, "statusPreparingText"),
      articles: tr(locale, "statusPreparingItems"),
    },
    ready: {
      titre: tr(locale, "statusReadyTitle"),
      texte: isPickup ? tr(locale, "statusReadyPickup") : tr(locale, "statusReadyOther"),
      articles: tr(locale, "statusReadyItems"),
    },
    delivered: {
      titre: tr(locale, "statusDeliveredTitle"),
      texte: tr(locale, "statusDeliveredText"),
      articles: tr(locale, "statusDeliveredItems"),
    },
  };

  const msg = messages[status] || messages.preparing;

  const contenu = `
    <tr>
      <td align="center" style="padding:0 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#999999;">
        ${echapperHtml(tr(locale, "orderLabel"))} ${echapperHtml(orderNumber)}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 16px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.35;color:#1a1a1a;font-weight:700;">
        ${echapperHtml(msg.titre)}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#666666;">
        ${echapperHtml(tr(locale, "hello"))} ${echapperHtml(prenom)},<br />
        ${echapperHtml(msg.texte)}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 12px;">
        ${boutonPrincipal(urlCompte, tr(locale, "viewOrder"))}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#666666;">
        ${echapperHtml(tr(locale, "or"))} <a href="${urlBoutique}" style="color:${GOLD};text-decoration:underline;">${echapperHtml(tr(locale, "visitShop"))}</a>
      </td>
    </tr>
    ${lignes.length ? blocArticles(lignes, msg.articles, locale) : ""}`;

  return enveloppeEmail({
    titrePage: `${orderNumber} — Jen's & Floran`,
    contenu,
    locale,
  });
}

function sujetEmail(type, orderNumber, locale = "fr") {
  const keys = {
    confirmed: "subjectConfirmed",
    preparing: "subjectPreparing",
    ready: "subjectReady",
    delivered: "subjectDelivered",
  };
  return tr(locale, keys[type] || keys.confirmed, { orderNumber });
}

function texteConfirmationCommande({
  customerName,
  orderNumber,
  articles,
  commun,
  locale = "fr",
}) {
  const prenom = String(customerName || "").trim().split(/\s+/)[0] || tr(locale, "hello");
  return `${tr(locale, "hello")} ${prenom},

${tr(locale, "confirmedTitle")}

${commun}

${tr(locale, "followUp")}

Jen's & Floran`;
}

function texteChangementStatut({ customerName, orderNumber, status, locale = "fr" }) {
  const prenom = String(customerName || "").trim().split(/\s+/)[0] || tr(locale, "hello");
  const keys = {
    preparing: "statusPreparingText",
    ready: "statusReadyPickup",
    delivered: "statusDeliveredText",
  };
  return `${tr(locale, "hello")} ${prenom},

${tr(locale, keys[status] || keys.preparing)}

${tr(locale, "orderLabel")} ${orderNumber}

Jen's & Floran`;
}

module.exports = {
  genererHtmlConfirmationCommande,
  genererHtmlChangementStatut,
  nettoyerNomProduit,
  formaterPrix,
  sujetEmail,
  texteConfirmationCommande,
  texteChangementStatut,
  tr,
  normaliserLocale,
};
