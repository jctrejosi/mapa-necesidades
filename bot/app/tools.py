"""Herramientas del bot (function calling) contra el backend de SolidaridadCO.

El bot NO toca la base de datos directamente: usa la API REST del backend
NestJS, que ya valida, guarda en PostgreSQL/Supabase, genera los PIN y emite
los eventos en tiempo real. Así el esquema y las reglas quedan en un solo
lugar.

Dos funciones:
  1. realizar_reporte — crea un sector (si hace falta) + una necesidad y
     devuelve el PIN para que el usuario edite/confirme su reporte.
  2. buscar_ayuda      — busca ofrecimientos de ayuda y centros de acopio
     que coincidan con lo que necesita el usuario.
"""
import logging
from typing import Any, Optional

import httpx

from . import config

log = logging.getLogger("bot.tools")

# Centros por ciudad (usados cuando el usuario no indica un sector específico)
CITY_CENTERS: dict[str, tuple[float, float]] = {
    "manizales": (5.0703, -75.5138),
    "pereira": (4.8133, -75.6961),
    "cali": (3.4516, -76.5320),
    "quibdo": (5.6942, -76.6583),
    "norte_valle": (3.9000, -76.0000),
    "armenia": (4.5339, -75.6811),
}


async def _backend(method: str, path: str, **kwargs) -> httpx.Response:
    """Llamada HTTP al backend de SolidaridadCO."""
    async with httpx.AsyncClient(timeout=config.BACKEND_TIMEOUT) as client:
        return await client.request(method, f"{config.BACKEND_URL}/api{path}", **kwargs)


async def _get_or_create_sector(
    ciudad: str,
    ubicacion: str,
    lat: Optional[float],
    lng: Optional[float],
) -> dict:
    """Busca un sector por nombre; si no existe (o no hay ubicación) lo crea
    en el centro de la ciudad o en las coordenadas dadas."""
    ciudad = (ciudad or "manizales").strip().lower()

    if ubicacion:
        r = await _backend("GET", f"/sectores?ciudad={ciudad}")
        if r.status_code == 200:
            for s in r.json():
                nombre = (s.get("nombre") or "").lower()
                barrio = (s.get("barrio") or "").lower()
                if ubicacion.lower() in nombre or ubicacion.lower() in barrio:
                    return s

    center = CITY_CENTERS.get(ciudad, CITY_CENTERS["manizales"])
    payload: dict[str, Any] = {
        "ciudad": ciudad,
        "nombre": ubicacion.strip() or "Reporte desde el chat",
        "barrio": "",
        "lat": lat if lat is not None else center[0],
        "lng": lng if lng is not None else center[1],
        "descripcion": "Reporte creado desde el chat (bot Anay)",
        "nivel_afectacion": "leve",
        "estado": "activo",
    }
    r = await _backend("POST", "/sectores", json=payload)
    r.raise_for_status()
    return r.json()


# ── Herramientas ──────────────────────────────────────────────────────


async def realizar_reporte(args: dict, ctx: dict) -> dict:
    """Guarda un reporte de necesidad en la base de datos (vía backend)."""
    descripcion = str(args.get("descripcion") or "").strip()
    telefono = str(args.get("telefono") or "").strip()
    if not descripcion:
        return {"ok": False, "mensaje": "Falta la descripción de lo que se necesita."}
    if not telefono:
        return {"ok": False, "mensaje": "Falta el teléfono de quien reporta."}

    ciudad = str(args.get("ciudad") or ctx.get("ciudad") or "manizales").strip().lower()
    ubicacion = str(args.get("ubicacion") or "").strip()

    # Coordenadas del contexto (si el frontend las envía)
    ctx_lat = ctx.get("lat")
    ctx_lng = ctx.get("lng")
    lat = float(ctx_lat) if ctx_lat not in (None, "") else None
    lng = float(ctx_lng) if ctx_lng not in (None, "") else None

    sector = await _get_or_create_sector(ciudad, ubicacion, lat, lng)

    payload = {
        "sector_id": sector["id"],
        "tipo": "Otro",
        "descripcion": descripcion,
        "cantidad": "",
        "prioridad": "alta",
        "estado": "requiere",
        "reportado_por": "Reporte vía bot",
        "telefono_reporta": telefono,
    }
    r = await _backend("POST", "/necesidades", json=payload)
    r.raise_for_status()
    need = r.json()

    ctx.setdefault("payload", {})["reporte"] = {
        "pin": need.get("pin"),
        "sector": sector.get("nombre"),
        "ciudad": ciudad,
    }
    return {
        "ok": True,
        "mensaje": "Reporte guardado correctamente.",
        "pin": need.get("pin"),
        "sector": sector.get("nombre"),
    }


async def buscar_ayuda(args: dict, ctx: dict) -> dict:
    """Busca ofrecimientos y centros de acopio que coincidan con la necesidad."""
    que = str(args.get("que_necesitas") or "").strip().lower()
    ciudad = str(args.get("ciudad") or ctx.get("ciudad") or "manizales").strip().lower()

    r = await _backend("GET", f"/ofrecimientos?ciudad={ciudad}")
    ofrecimientos: list[dict] = []
    if r.status_code == 200:
        ofrecimientos = [o for o in r.json() if o.get("estado") == "disponible"]

    r2 = await _backend("GET", f"/centros?ciudad={ciudad}")
    centros: list[dict] = []
    if r2.status_code == 200:
        centros = r2.json()

    def _score(item: dict) -> int:
        texto = f"{item.get('tipo') or ''} {item.get('descripcion') or ''}".lower()
        tokens = [t for t in que.replace(",", " ").split() if len(t) > 2]
        if not tokens:
            return 1
        return sum(1 for t in tokens if t in texto)

    matches = sorted(
        [o for o in ofrecimientos if _score(o) > 0],
        key=_score,
        reverse=True,
    )[:6]

    centros_utiles = centros[:4]

    ctx.setdefault("payload", {})["ayuda"] = {
        "ofrecimientos": [
            {
                "tipo": o.get("tipo"),
                "descripcion": o.get("descripcion"),
                "nombre_ofrece": o.get("nombre_ofrece"),
                "telefono_ofrece": o.get("telefono_ofrece"),
            }
            for o in matches
        ],
        "centros": [
            {
                "nombre": c.get("nombre"),
                "direccion": c.get("direccion"),
                "telefono": c.get("telefono"),
            }
            for c in centros_utiles
        ],
    }

    if not matches and not centros_utiles:
        return {
            "ok": True,
            "mensaje": f"No encontré ayudas registradas para '{que}' en {ciudad}. "
                       "Sugiere buscar en otra ciudad o revisar el mapa.",
            "total": 0,
        }

    return {
        "ok": True,
        "mensaje": f"Encontré {len(matches)} ofrecimiento(s) y {len(centros_utiles)} centro(s) de acopio.",
        "ofrecimientos": matches,
        "centros": centros_utiles,
    }


FUNCTION_MAP = {
    "realizar_reporte": realizar_reporte,
    "buscar_ayuda": buscar_ayuda,
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "realizar_reporte",
            "description": (
                "Crea un reporte de necesidad en la plataforma y lo GUARDA en la base de datos. "
                "Úsala cuando el usuario pida reportar algo que necesita (agua, alimentos, refugio, "
                "medicamentos, ropa, escombros, etc.). Debes tener la DESCRIPCIÓN de lo que necesita "
                "y su TELÉFONO; si el usuario no los ha dado, pídeselos antes de llamar la función. "
                "El campo 'ubicacion' es opcional (barrio/sector que mencione el usuario)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "descripcion": {
                        "type": "string",
                        "description": "Descripción de lo que necesita el usuario (ej: 'se nos acabó el agua potable').",
                    },
                    "telefono": {
                        "type": "string",
                        "description": "Teléfono de contacto del usuario (10 dígitos, ej: 3103817213).",
                    },
                    "ciudad": {
                        "type": "string",
                        "description": "Ciudad del reporte (por defecto la del contexto del chat).",
                    },
                    "ubicacion": {
                        "type": "string",
                        "description": "Barrio o sector que mencione el usuario (opcional).",
                    },
                },
                "required": ["descripcion", "telefono"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_ayuda",
            "description": (
                "Busca en la plataforma quién puede ayudar al usuario: ofrecimientos de ayuda "
                "(comida, transporte, alojamiento, etc.) y centros de acopio. Úsala cuando el "
                "usuario pregunte por alguien que lo ayude o dónde puede recibir/entregar ayuda. "
                "Si no sabes qué busca exactamente, pregúntaselo primero."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "que_necesitas": {
                        "type": "string",
                        "description": "Qué tipo de ayuda busca el usuario (ej: 'alimentos', 'alojamiento').",
                    },
                    "ciudad": {
                        "type": "string",
                        "description": "Ciudad de la búsqueda (por defecto la del contexto del chat).",
                    },
                },
                "required": ["que_necesitas"],
            },
        },
    },
]
