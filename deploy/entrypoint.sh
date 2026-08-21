#!/bin/sh
# entrypoint.sh — arranca el stack completo dentro del contenedor de Render:
#   1. App combinada (bot Anay + ia-service) en un puerto interno.
#   2. Backend (NestJS) en el $PORT público (ejecuta las migraciones al arrancar).
set -e

# Puertos: el backend usa el $PORT de Render; la app combinada usa uno interno.
BACKEND_PORT="${PORT:-3000}"
BOT_PORT="${BOT_PORT:-8000}"

# ── 1) Bot + ia-service (app combinada de deploy-ai), solo local ──
BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}" \
  nohup /opt/venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port "${BOT_PORT}" \
  >> /var/log/bot-ia.log 2>&1 &

# ── 2) Backend NestJS (público) ──
cd /app/backend
PORT="${BACKEND_PORT}" \
  BOT_SERVICE_URL="http://127.0.0.1:${BOT_PORT}" \
  IA_SERVICE_URL="http://127.0.0.1:${BOT_PORT}/ia" \
  UPLOAD_DIR="/app/uploads" \
  exec node dist/src/main.js
