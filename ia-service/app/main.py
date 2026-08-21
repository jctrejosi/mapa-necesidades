"""Servicio de IA de SolidaridadCO — clasificación inteligente de reportes.

Clasifica el tipo de ayuda de un reporte de necesidad usando la API de
DeepSeek. Es un servicio INTERNO: lo llama el backend al crear un reporte
(el usuario nunca ve esta clasificación).

Endpoints:
- GET  /health     → estado del servicio
- POST /clasificar → clasifica/valida el tipo de un reporte
"""
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import config
from . import clasificador

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("ia.main")

app = FastAPI(
    title="SolidaridadCO IA Service",
    description="Clasificación inteligente del tipo de ayuda de reportes (DeepSeek).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClasificarRequest(BaseModel):
    # Descripción libre del reporte (lo que la persona cuenta que necesita).
    descripcion: str = Field(..., min_length=1, max_length=4000)
    # Tipo que el usuario seleccionó al publicar (si lo hizo). Si es "Otro"
    # (o viene vacío) el servicio clasifica automáticamente; si es un tipo
    # válido, valida que sea el correcto y lo corrige solo si es necesario.
    tipo_actual: str | None = None
    # Categorías permitidas. Por defecto usa la lista canónica de la plataforma.
    tipos_posibles: list[str] | None = None


class ClasificarResponse(BaseModel):
    tipo: str
    # True si el tipo cambió respecto al que traía el reporte.
    cambio: bool


@app.get("/health")
async def health():
    return {"status": "ok", "model": config.DEEPSEEK_MODEL}


@app.post("/clasificar", response_model=ClasificarResponse)
async def clasificar(req: ClasificarRequest):
    if not config.DEEPSEEK_API_KEY:
        raise HTTPException(status_code=503, detail="DEEPSEEK_API_KEY no está configurada")

    tipos = clasificador.normalizar_tipos(req.tipos_posibles)
    try:
        tipo = await clasificador.clasificar(
            descripcion=req.descripcion,
            tipo_actual=req.tipo_actual,
            tipos_posibles=tipos,
        )
    except Exception as exc:  # noqa: BLE001
        log.exception("Error clasificando reporte")
        raise HTTPException(status_code=502, detail=f"Error del proveedor de IA: {exc}") from exc

    return ClasificarResponse(tipo=tipo, cambio=bool(req.tipo_actual) and tipo != req.tipo_actual)
