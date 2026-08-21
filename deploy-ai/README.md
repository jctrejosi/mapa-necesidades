# deploy-ai — Bot Anay + ia-service en un solo servicio de Render

Despliegue combinado para Render: **un solo Web Service** sirve el bot de chat
Anay (`/`) y el servicio de IA de clasificación (`/ia`). Render expone un solo
puerto por servicio, así que ambas apps FastAPI se montan en una app ASGI
(`app.py`); el código de cada proyecto sigue viviendo en `bot/` e `ia-service/`.

## Rutas

| Ruta | App | Descripción |
|---|---|---|
| `GET /health` | bot | Estado del bot |
| `POST /chat` | bot | Chat de Anay (DeepSeek function calling) |
| `GET /ia/health` | ia-service | Estado del clasificador |
| `POST /ia/clasificar` | ia-service | Clasifica/valida el tipo de un reporte |

## Cómo crear el servicio en Render

1. **New Web Service** → conectar el repo → **Runtime: Docker**.
2. **Root Directory**: dejar vacío (la raíz del repo).
   **Dockerfile Path**: `deploy-ai/Dockerfile` (el Dockerfile copia `bot/` e
   `ia-service/`, así que el contexto de build debe ser la raíz del repo).
3. Variables de entorno:

   | Variable | Valor |
   |---|---|
   | `DEEPSEEK_API_KEY_BOT` | la API key de DeepSeek del bot |
   | `DEEPSEEK_MODEL` | `deepseek-chat` (default) |
   | `BACKEND_URL` | `https://redsolidaria.onrender.com` (sin `/api`) |
   | `CORS_ORIGIN` | orígenes de los frontends (default en código) |

4. Deploy. El servicio escucha en el `$PORT` que inyecta Render.

## Ajustes en los otros servicios

- **Backend** (NestJS): agregar en el dashboard de Render
  `IA_SERVICE_URL=https://<nombre-del-servicio>.onrender.com/ia`
  → así al crear un reporte llama a `…/ia/clasificar` para validar el tipo.
- **Frontend web**: `VITE_BOT_API_URL=https://<nombre-del-servicio>.onrender.com`
  (el widget del chat ya no pasa por nginx `/bot`, apunta directo al servicio).

## Correr igual en local (Docker)

```bash
docker build -f deploy-ai/Dockerfile -t redsolidaria-ai .
docker run --env-file bot/.env -p 8000:8000 redsolidaria-ai
# Bot:  http://localhost:8000/chat
# IA:   http://localhost:8000/ia/clasificar
```

> En local con `node setup.js --dev` el bot (8000) y el ia-service (8100) se
> levantan por separado; este contenedor combinado es solo para Render.
