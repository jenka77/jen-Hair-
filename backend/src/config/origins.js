const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8000";

const ORIGINES_AUTORISEES = new Set(
  [
    FRONTEND_URL,
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
  ].filter(Boolean)
);

function origineAutorisee(origin) {
  if (!origin) return false;
  if (ORIGINES_AUTORISEES.has(origin)) return true;

  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function resoudreOrigineFrontend(origin) {
  if (origineAutorisee(origin)) return origin;
  return FRONTEND_URL;
}

module.exports = {
  FRONTEND_URL,
  origineAutorisee,
  resoudreOrigineFrontend,
};
