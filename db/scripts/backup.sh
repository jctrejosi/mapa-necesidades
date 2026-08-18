#!/usr/bin/env bash
# backup.sh — Copia de seguridad de la base de datos LOCAL (PostgreSQL en Docker).
#
#   db/scripts/backup.sh
#
# Genera un volcado comprimido con fecha/hora en db/backups/:
#   db/backups/redsolidaria_YYYYMMDD_HHMMSS.sql.gz
#
# Requiere el contenedor de PostgreSQL local arriba (node setup.js o
# docker compose -f db/docker-compose.yml up -d db).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUPS_DIR="$ROOT/db/backups"
CONTAINER="${1:-redsolidaria-db}"
DB="${2:-redsolidaria}"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUPS_DIR/redsolidaria_${STAMP}.sql.gz"

mkdir -p "$BACKUPS_DIR"

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "✖ No existe el contenedor $CONTAINER. Levanta la BD local primero (node setup.js)." >&2
  exit 1
fi

echo "▶ Volcando base '$DB' del contenedor $CONTAINER → $OUT"
docker exec "$CONTAINER" pg_dump -U postgres -d "$DB" --clean --if-exists | gzip > "$OUT"

echo "✔ Copia creada: $OUT ($(du -h "$OUT" | cut -f1))"
