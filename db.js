/* ============================================================
   Jen's & Flora — Connexion Supabase + API backend
   ============================================================ */

const SUPABASE_CONFIG = {
  URL: "https://bapnudbxblqawqcuvycy.supabase.co",
  ANON_KEY: "sb_publishable_Q_dkU48tjqDlb9cbFG_35w_t0HPzmq-",
};
const API_BASE_URL_PROD = "https://jen-hair-api.onrender.com";
const SITE_URL_PROD = "https://www.jens-flora.com";
// En local, le backend tourne sur le port 4000 (même hôte que la page).
// Quand le backend sera en ligne, remplacez cette logique par son URL publique.
function resoudreApiBaseUrl() {
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:4000`;
  }
  return API_BASE_URL_PROD;
}

const API_BASE_URL = resoudreApiBaseUrl();
window.API_BASE_URL = API_BASE_URL;

function urlSiteCanonique() {
  const { protocol, hostname, port } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const suffix = port ? `:${port}` : "";
    return `${protocol}//${hostname}${suffix}`;
  }
  if (hostname === "jens-flora.com" || hostname === "www.jens-flora.com") {
    return SITE_URL_PROD;
  }
  if (hostname.endsWith(".vercel.app")) {
    return `${protocol}//${hostname}`;
  }
  return SITE_URL_PROD;
}

window.urlSiteCanonique = urlSiteCanonique;
window.SITE_URL_PROD = SITE_URL_PROD;

function baseConfiguree() {
  return (
    window.supabase &&
    !SUPABASE_CONFIG.URL.startsWith("VOTRE_") &&
    !SUPABASE_CONFIG.ANON_KEY.startsWith("VOTRE_")
  );
}

function urlAuthParDefaut() {
  try {
    return new URL("compte.html", window.location.href).href;
  } catch {
    return `${window.location.origin}/compte.html`;
  }
}

const clientSupabase = baseConfiguree()
  ? window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;

window.clientSupabase = clientSupabase;

function normaliserProduitBase(p) {
  const image1 = (p.image_url || "").trim();
  const image2 = (p.image_url_2 || "").trim();
  const image3 = (p.image_url_3 || "").trim();
  const images = [image1, image2, image3].filter(Boolean);

  return {
    id: p.id,
    nom: (p.name || "").trim(),
    description: (p.description || "").trim(),
    type: (p.wig_type || "").trim(),
    taille: (p.wig_size || "").trim(),
    couleur: (p.color || "").trim(),
    tailleLace: (p.lace_size || "").trim(),
    prix: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    image: images[0] || "1.jpg",
    image2,
    image3,
    video: (p.video_url || "").trim(),
    fromBase: true,
  };
}

async function chargerProduitsDepuisBase(slug) {
  const donneesBackend = await chargerProduitsDepuisBackend(slug);
  if (donneesBackend) return donneesBackend;

  if (!clientSupabase) return null;

  const { data: categorie, error: erreurCategorie } = await clientSupabase
    .from("categories")
    .select("slug, name, description, is_learning")
    .eq("slug", slug)
    .maybeSingle();

  if (erreurCategorie) throw erreurCategorie;
  if (!categorie) return null;

  const { data: produits, error: erreurProduits } = await clientSupabase
    .from("products")
    .select(
      "id, name, description, wig_type, wig_size, color, lace_size, price, stock, image_url, image_url_2, image_url_3, video_url, sort_order"
    )
    .eq("category_slug", slug)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (erreurProduits) throw erreurProduits;

  return {
    type: categorie.name,
    description: categorie.description || "",
    apprentissage: !!categorie.is_learning,
    produits: (produits || []).map(normaliserProduitBase),
  };
}

async function chargerProduitsDepuisBackend(slug) {
  try {
    const reponse = await fetch(
      `${API_BASE_URL}/api/products?category=${encodeURIComponent(slug)}&_=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!reponse.ok) throw new Error(`Backend indisponible (${reponse.status})`);

    const data = await reponse.json();
    if (!data.category) return null;

    return {
      type: data.category.name,
      description: data.category.description || "",
      apprentissage: !!data.category.is_learning,
      produits: (data.produits || []).map((p) => ({
        ...p,
        nom: (p.nom || "").trim(),
        description: (p.description || "").trim(),
        type: (p.type || "").trim(),
        taille: (p.taille || "").trim(),
        couleur: (p.couleur || "").trim(),
        tailleLace: (p.tailleLace || "").trim(),
        image: (p.image || "1.jpg").trim(),
        image2: (p.image2 || "").trim(),
        image3: (p.image3 || "").trim(),
        video: (p.video || "").trim(),
        fromBase: true,
      })),
    };
  } catch (err) {
    console.warn("Backend indisponible, fallback Supabase :", err);
    return null;
  }
}

function construireReturnPath() {
  return "/confirmation.html";
}

async function enregistrerCommandeBase(params, lignes) {
  const lignesBase = lignes.filter((ligne) => ligne.fromBase);
  if (lignesBase.length === 0) return { ok: true, skipped: true };

  const token = typeof obtenirTokenAuth === "function" ? await obtenirTokenAuth() : null;
  if (!token) {
    throw new Error(
      typeof t === "function" ? t("order.loginRequired") : "Connexion requise pour commander"
    );
  }

  let reponse;
  try {
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    reponse = await fetch(`${API_BASE_URL}/api/paypal/create-order`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: {
          name: params.nom_client,
          phone: params.telephone_client,
          email: params.email_client,
          pickupMode: Number(params.frais_livraison_num) > 0 ? "delivery" : "pickup",
          address: Number(params.frais_livraison_num) > 0 ? params.adresse : "",
          addressDetails: params.adresse_details || null,
        },
        items: lignesBase.map((ligne) => ({
          productId: extraireProductIdBase(ligne.uid),
          quantity: ligne.quantite,
        })),
        returnPath: construireReturnPath(),
      }),
    });
  } catch (err) {
    throw new Error(
      `Connexion au backend impossible (${API_BASE_URL}). Vérifiez que "npm run dev" tourne dans le dossier backend.`
    );
  }

  if (!reponse.ok) {
    let message = "Impossible d'enregistrer la commande";
    try {
      const erreur = await reponse.json();
      message = erreur.error || message;
    } catch (e) {
      message = await reponse.text();
    }
    throw new Error(message);
  }

  return reponse.json();
}

async function capturerCommandePaypal(orderId, paypalOrderId) {
  const reponse = await fetch(`${API_BASE_URL}/api/paypal/capture-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ orderId, paypalOrderId }),
  });

  if (!reponse.ok) {
    let message = "Impossible de confirmer le paiement PayPal";
    try {
      const erreur = await reponse.json();
      message = erreur.error || message;
    } catch (e) {
      message = await reponse.text();
    }
    throw new Error(message);
  }

  return reponse.json();
}

async function chargerResumeCommande(orderId) {
  const reponse = await fetch(`${API_BASE_URL}/api/orders/${orderId}/summary`, {
    cache: "no-store",
  });

  if (!reponse.ok) {
    let message = "Commande introuvable";
    try {
      const erreur = await reponse.json();
      message = erreur.error || message;
    } catch (e) {
      /* ignore */
    }
    throw new Error(message);
  }

  return reponse.json();
}

async function chargerMesCommandes() {
  const token = typeof obtenirTokenAuth === "function" ? await obtenirTokenAuth() : null;
  if (!token) throw new Error("Connexion requise");

  const reponse = await fetch(`${API_BASE_URL}/api/me/orders`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!reponse.ok) {
    let message = "Impossible de charger vos commandes";
    try {
      const erreur = await reponse.json();
      message = erreur.error || message;
    } catch (e) {
      /* ignore */
    }
    throw new Error(message);
  }

  return reponse.json();
}

function extraireProductIdBase(uid) {
  // Les produits chargés depuis Supabase reçoivent un uid "slug:uuid".
  const parts = String(uid).split(":");
  return parts.length > 1 ? parts.slice(1).join(":") : uid;
}
