#!/usr/bin/env bash
# Démarre le site en local (frontend :8000 + rappel backend :4000)
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT_FRONT="${PORT_FRONT:-8000}"
PORT_API="${PORT:-4000}"

if ! curl -sf "http://127.0.0.1:${PORT_API}/api/health" >/dev/null 2>&1; then
  echo "⚠️  Le backend ne répond pas sur http://127.0.0.1:${PORT_API}"
  echo "   Dans un autre terminal :"
  echo "   cd \"$ROOT/backend\" && npm run dev"
  echo ""
  echo "   (Laissez ce terminal ouvert tant que vous travaillez sur le site.)"
  echo ""
fi

echo "Site local : http://127.0.0.1:${PORT_FRONT}/maison.html"
echo "Ctrl+C pour arrêter le serveur web."
cd "$ROOT"
exec python3 -m http.server "$PORT_FRONT" --bind 127.0.0.1
