# ia-service — Clasificación inteligente del tipo de reportes

Servicio de IA de SolidaridadCO: clasifica el **tipo de ayuda** de un reporte
de necesidad usando la **API de DeepSeek**. Es un servicio **interno**: lo llama
el backend al momento de crear un reporte, el usuario **nunca ve** esta
clasificación.

## Cómo funciona

Cuando alguien publica un reporte:

- Si **ya seleccionó un tipo** (p. ej. "Comida y agua"), el servicio lo
  **valida**: si la descripción claramente corresponde a otra categoría, lo
  corrige; si es correcto, lo conserva.
- Si el tipo es **"Otro"** (o no hay tipo), se **clasifica automáticamente** a
  la categoría más adecuada.
- Si la descripción no encaja en ninguna categoría, se devuelve **"Otro"**
  (nunca se inventa una categoría nueva).

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio y modelo configurado |
| POST | `/clasificar` | Clasifica/valida el tipo de un reporte |

### `POST /clasificar`

```json
{
  "descripcion": "Se nos cayó el techo y necesitamos sacar los escombros de la casa",
  "tipo_actual": "Otro",
  "tipos_posibles": ["Comida y agua", "Escombros", "Transporte", "Otro"]
}
```

Respuesta:

```json
{ "tipo": "Escombros", "cambio": true }
```

- `descripcion` (obligatorio): lo que la persona cuenta que necesita.
- `tipo_actual` (opcional): el tipo que el usuario seleccionó al publicar.
- `tipos_posibles` (opcional): categorías permitidas; por defecto usa la lista
  canónica de la plataforma (coincide con `TIPOS_NECESIDAD` del frontend).
- `cambio`: `true` si el tipo resultante difiere del `tipo_actual`.

## Categorías canónicas

`Comida y agua` · `Servicios médicos` · `Atención psicosocial` · `Refugio y abrigo` ·
`Escombros` · `Maquinaria y rescate` · `Transporte` · `Voluntariado` · `Mascotas` · `Otro`

## Configuración

Copiar `.env.example` a `.env` y poner la `DEEPSEEK_API_KEY`.

| Variable | Default | Descripción |
|---|---|---|
| `DEEPSEEK_API_KEY` | — | API key de DeepSeek |
| `DEEPSEEK_MODEL` | `deepseek-chat` | Modelo a usar |
| `DEEPSEEK_API_URL` | `https://api.deepseek.com` | URL base de la API |
| `DEEPSEEK_TIMEOUT` | `30` | Timeout de la llamada (segundos) |
| `IA_SERVICE_PORT` | `8100` | Puerto del servicio |
| `CORS_ORIGIN` | `http://localhost:3000,...` | Orígenes permitidos |

## Correr en local

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
./dev.sh                     # uvicorn con reload en :8100
```

Probar:

```bash
curl -s http://localhost:8100/health
curl -s -X POST http://localhost:8100/clasificar \
  -H 'Content-Type: application/json' \
  -d '{"descripcion": "Necesito tejas y ayuda para quitar escombros", "tipo_actual": "Otro"}'
```

## Docker

```bash
docker build -t ia-service .
docker run --env-file .env -p 8100:8100 ia-service
```
