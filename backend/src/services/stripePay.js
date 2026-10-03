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

function siteUrlPublique() {
  const raw =
    process.env.STRIPE_BRAND_SITE_URL ||
    process.env.SITE_URL ||
    process.env.FRONTEND_URL ||
    "https://www.jens-flora.com";
  return String(raw).replace(/\/$/, "");
}

/** Stripe exige des URLs HTTPS pour logo et images produit. */
function urlHttpsPublique(raw) {
  const val = String(raw || "").trim();
  if (!val) return null;
  if (/^https:\/\//i.test(val)) return val;
  if (/^http:\/\//i.test(val)) return val.replace(/^http:\/\//i, "https://");
  const base = siteUrlPublique();
  if (!base.startsWith("https://")) return null;
  return `${base}/${val.replace(/^\//, "")}`;
}

function imageProduitCheckout(produit) {
  const champs = [produit.image_url, produit.image_url_2, produit.image_url_3];
  for (const champ of champs) {
    const url = urlHttpsPublique(champ);
    if (url) return url;
  }
  return urlHttpsPublique("1.jpg");
}

function descriptionProduitCheckout(produit) {
  const parties = [produit.wig_type, produit.wig_size, produit.color, produit.lace_size]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return parties.length ? parties.join(" · ") : undefined;
}

function parametresBrandingCheckout() {
  const site = siteUrlPublique();
  const logoUrl = urlHttpsPublique(process.env.STRIPE_CHECKOUT_LOGO_URL || "logo.png");
  const iconUrl = urlHttpsPublique(process.env.STRIPE_CHECKOUT_ICON_URL || "favicon-512.png");

  const branding = {
    display_name: process.env.STRIPE_CHECKOUT_DISPLAY_NAME || "Jen's & Floran",
    background_color: process.env.STRIPE_CHECKOUT_BG || "#0d0d0d",
    button_color: process.env.STRIPE_CHECKOUT_BUTTON || "#c9a962",
    border_style: "rounded",
    font_family: "default",
  };

  if (logoUrl) {
    branding.logo = { type: "url", url: logoUrl };
  }
  if (iconUrl) {
    branding.icon = { type: "url", url: iconUrl };
  }

  return branding;
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

  const lineItems = lignes.map(({ item, produit }) => {
    const imageUrl = imageProduitCheckout(produit);
    const description = descriptionProduitCheckout(produit);
    const productData = {
      name: String(produit.name || "Produit").slice(0, 120),
    };
    if (description) productData.description = description.slice(0, 500);
    if (imageUrl) productData.images = [imageUrl];

    return {
      price_data: {
        currency: "eur",
        unit_amount: eurosEnCentimes(produit.price),
        product_data: productData,
      },
      quantity: item.quantity,
    };
  });

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

  const payloadSession = {
    mode: "payment",
    customer_email: customerEmail,
    locale: stripeLocale,
    line_items: lineItems,
    branding_settings: parametresBrandingCheckout(),
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
      locale: locale === "de" || locale === "en" ? locale : "fr",
    },
    success_url: `${base}${path}?stripe=success&order_id=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}${path}?stripe=cancel&order_id=${encodeURIComponent(orderId)}`,
  };

  let session;
  try {
    session = await stripe.checkout.sessions.create(payloadSession);
  } catch (err) {
    const message = String(err?.message || "");
    if (message.includes("branding_settings") || err?.code === "parameter_unknown") {
      console.warn("[Stripe] branding_settings refusé par l'API, nouvel essai sans personnalisation:", message);
      const { branding_settings: _ignore, ...sansBranding } = payloadSession;
      session = await stripe.checkout.sessions.create(sansBranding);
    } else {
      throw err;
    }
  }

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
