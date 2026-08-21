#!/usr/bin/env bash
# Levanta el servicio de IA en local (uvicorn con reload).
# Requiere: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
set -e
cd "$(dirname "$0")"

PYTHON=".venv/bin/python"
if [ ! -x "$PYTHON" ]; then
  echo "❌ No existe .venv. Créalo con:  python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

PORT="${IA_SERVICE_PORT:-8100}"
exec "$PYTHON" -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload
