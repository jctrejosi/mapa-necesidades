#!/usr/bin/env bash
# sync-prod.sh — Trae los datos de PRODUCCIÓN (Supabase) a la base LOCAL.
#
#   db/scripts/sync-prod.sh
#
# Hace UPSERT por id (inserta lo nuevo, actualiza lo existente, NO borra nada),
# igual que el script original de backend: node dist/scripts/sync-prod.js.
#
# Requiere:
#   - La base local arriba (node setup.js o: docker compose -f db/docker-compose.yml up -d db)
#   - PROD_DATABASE_URL en backend/.env (incluye la contraseña de Supabase)
#   - Backend compilado (si no, el script lo compila automáticamente)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT/backend"

if [ ! -f dist/scripts/sync-prod.js ]; then
  echo "▶ Compilando el backend (falta dist/scripts/sync-prod.js)..."
  npm run build
fi

echo "▶ Sincronizando producción → local (UPSERT por id)..."
node dist/scripts/sync-prod.js
