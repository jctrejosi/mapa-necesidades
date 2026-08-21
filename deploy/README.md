# deploy — Backend + Bot + IA en un solo servicio de Render (Docker)

Un **único contenedor** corre los tres servicios del backend de SolidaridadCO:

| Componente | Cómo corre | Puerto |
|---|---|---|
| Backend NestJS (`/api`, `/uploads`, `/bot/chat`) | `node dist/src/main.js` | `$PORT` de Render (público) |
| Bot Anay + ia-service (app combinada de `deploy-ai`) | `uvicorn app:app` | `8000` (interno) |

El frontend habla con este servicio por el **mismo origen** (el chat del bot ya
va por `POST /bot/chat` → el backend lo proxya al bot interno). La clasificación
del tipo de reporte (`/ia/clasificar`) también la hace el backend contra la app
combinada por `localhost` — nada más se expone hacia afuera.

## Rutas públicas

| Ruta | Qué sirve |
|---|---|
| `/api/*` | API NestJS (incluye el proxy `POST /bot/chat` → bot) |
| `/uploads/*` | Imágenes subidas |
| `/api/stats?ciudad=manizales` | Health check recomendado (verifica DB) |

## Crear el servicio en Render

1. **New Web Service** → conectar el repo → Runtime **Docker**.
2. **Root Directory**: dejar vacío (raíz del repo). **Dockerfile Path**: `deploy/Dockerfile`.
3. **Health Check Path**: `/api/stats?ciudad=manizales` (y “Fail if health check returns non-2xx”).
4. Variables de entorno (dashboard de Render):

   | Variable | Obligatoria | Descripción |
   |---|---|---|
   | `DATABASE_URL` | ✅ | Supabase (pooler, con IPv4) |
   | `DB_SSL` | ✅ | `true` |
   | `ADMIN_PASSWORD` | ✅ | Contraseña del panel admin |
   | `ADMIN_EDIT` | | Llave de edición universal (si no, cae a ADMIN_PASSWORD) |
   | `FRONTEND_ORIGIN` | ✅ | Orígenes de los frontends (CORS), separados por coma |
   | `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | | Subida de imágenes |
   | `DEEPSEEK_API_KEY_BOT` | ✅ | API key de DeepSeek del bot Anay |
   | `DEEPSEEK_API_KEY_IA_SERVICE` | ✅ | API key de DeepSeek del clasificador de reportes |
   | `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `FRONTEND_URL` | | Confirmaciones por WhatsApp (opcional) |

   No hace falta configurar `BOT_SERVICE_URL`, `IA_SERVICE_URL` ni `BACKEND_URL`:
   el `entrypoint.sh` los arma internamente.

## Frontend

En el build del frontend (Render static site / Docker), apuntar:

```
VITE_API_URL=https://<nombre-del-servicio>.onrender.com
```

El cliente normaliza (agrega `/api` solo). El chat del bot ya funciona por
`/bot/chat` del mismo origen.

## Probar en local

```bash
docker compose -f deploy/docker-compose.yml up -d --build
# API:   http://localhost:8080/api/stats?ciudad=manizales
# Chat:  curl -X POST http://localhost:8080/bot/chat -H 'Content-Type: application/json' -d '{"message":"hola"}'
```

El compose local apunta a tu PostgreSQL local de desarrollo (puerto 5435).
