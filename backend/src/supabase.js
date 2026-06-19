const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL est manquant dans le fichier .env");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY est manquant dans le fichier .env");
}

if (SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_publishable_")) {
  console.warn(
    "Attention: SUPABASE_SERVICE_ROLE_KEY contient une clé publishable. " +
      "Pour le backend, utilisez la Secret key Supabase (sb_secret_...)."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: WebSocket,
  },
});

module.exports = { supabase };
