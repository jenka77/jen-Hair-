const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function verifierConfigPaypal() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
  if (
    !PAYPAL_CLIENT_ID ||
    !PAYPAL_CLIENT_SECRET ||
    PAYPAL_CLIENT_ID.startsWith("votre_") ||
    PAYPAL_CLIENT_SECRET.startsWith("votre_")
  ) {
    const err = new Error(
      "PayPal n'est pas configuré. Renseignez PAYPAL_CLIENT_ID et PAYPAL_CLIENT_SECRET dans .env"
    );
    err.status = 500;
    throw err;
  }
}

async function obtenirAccessTokenPaypal() {
  verifierConfigPaypal();

  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Erreur token PayPal");
  }

  return data.access_token;
}

function normaliserReturnPath(returnPath) {
  if (!returnPath || typeof returnPath !== "string") return "/confirmation.html";

  try {
    const url = new URL(returnPath, "http://local");
    if (!url.pathname.endsWith(".html")) return "/confirmation.html";

    const params = new URLSearchParams(url.search);
    ["paypal", "order_id", "token", "PayerID"].forEach((key) => params.delete(key));
    const query = params.toString();

    return `${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return "/confirmation.html";
  }
}

function construireUrlRetour(baseUrl, returnPath, queryParams) {
  const path = normaliserReturnPath(returnPath);
  const separator = path.includes("?") ? "&" : "?";
  const query = new URLSearchParams(queryParams).toString();
  return `${baseUrl}${path}${separator}${query}`;
}

async function creerOrdrePaypal({
  orderId,
  orderNumber,
  total,
  currency = "EUR",
  frontendUrl,
  returnPath,
}) {
  const token = await obtenirAccessTokenPaypal();
  const baseUrl = frontendUrl || process.env.FRONTEND_URL || "http://localhost:8000";

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `create-${orderId}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: orderId,
          invoice_id: orderNumber,
          custom_id: orderId,
          amount: {
            currency_code: currency,
            value: Number(total).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: "Jen's & Flora",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: construireUrlRetour(baseUrl, returnPath, {
          paypal: "success",
          order_id: orderId,
        }),
        cancel_url: construireUrlRetour(baseUrl, returnPath, {
          paypal: "cancel",
          order_id: orderId,
        }),
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Impossible de créer l'ordre PayPal");
  }

  const approveUrl = data.links?.find((link) => link.rel === "approve")?.href;
  if (!approveUrl) {
    throw new Error("Lien de paiement PayPal introuvable");
  }

  return {
    paypalOrderId: data.id,
    approveUrl,
    raw: data,
  };
}

async function capturerOrdrePaypal(paypalOrderId) {
  const token = await obtenirAccessTokenPaypal();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `capture-${paypalOrderId}`,
      },
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Impossible de capturer le paiement PayPal");
  }

  return data;
}

function extraireMontantCapture(captureData) {
  const capture =
    captureData.purchase_units?.[0]?.payments?.captures?.find(
      (item) => item.status === "COMPLETED"
    ) || captureData.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    status: capture?.status,
    captureId: capture?.id,
    amount: Number(capture?.amount?.value || 0),
    currency: capture?.amount?.currency_code,
  };
}

module.exports = {
  creerOrdrePaypal,
  capturerOrdrePaypal,
  extraireMontantCapture,
  normaliserReturnPath,
  construireUrlRetour,
};
