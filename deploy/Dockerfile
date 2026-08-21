# ── Un solo contenedor para Render: backend + bot + ia-service ──
# El backend (NestJS) escucha en el $PORT público de Render y sirve /api,
# /uploads y /bot/chat (proxy). La app combinada de deploy-ai (bot Anay +
# ia-service) corre en un puerto interno (8000) y solo la alcanza el backend
# por localhost (BOT_SERVICE_URL e IA_SERVICE_URL).

# ── Etapa 1: build del backend (NestJS) ──
FROM node:24-alpine AS backend-build
WORKDIR /build
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json backend/tsconfig.build.json backend/nest-cli.json ./
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/drizzle ./drizzle
RUN npm run build && npm prune --omit=dev

# ── Etapa 2: imagen final (Node + Python + nginx-free) ──
FROM node:24-bookworm-slim
WORKDIR /app

# Python para el bot y el ia-service (app combinada) — venv propio (Debian bloquea pip del sistema)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
  && rm -rf /var/lib/apt/lists/*

# Dependencias de Python (bot + ia-service, mismas versiones)
COPY bot/requirements.txt /tmp/requirements-bot.txt
COPY ia-service/requirements.txt /tmp/requirements-ia.txt
RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements-bot.txt -r /tmp/requirements-ia.txt

# Backend compilado (drizzle incluido: las migraciones corren al arrancar)
COPY --from=backend-build /build/node_modules /app/backend/node_modules
COPY --from=backend-build /build/dist /app/backend/dist
COPY backend/package.json /app/backend/package.json
COPY backend/drizzle /app/backend/drizzle

# Bot + IA (app combinada de deploy-ai)
COPY bot/app /app/bot_app
COPY ia-service/app /app/ia_app
COPY deploy-ai/app.py /app/app.py
COPY deploy/entrypoint.sh /app/entrypoint.sh

RUN mkdir -p /app/uploads /var/log
EXPOSE 3000
CMD ["sh", "/app/entrypoint.sh"]
