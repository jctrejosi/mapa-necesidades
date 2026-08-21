"""Clasificador del tipo de reporte usando la API de DeepSeek.

Reglas:
- Si el reporte ya trae un tipo válido (no "Otro"), se valida: solo se corrige
  si la descripción claramente pertenece a otra categoría.
- Si el tipo es "Otro" o viene vacío, se clasifica automáticamente.
- La respuesta del modelo se normaliza contra la lista de tipos permitidos;
  si nada coincide, se devuelve "Otro" (nunca se inventa una categoría).
"""
import json
import logging
import re

import httpx

from . import config

log = logging.getLogger("ia.clasificador")

# Lista canónica de tipos de necesidad de la plataforma (coincide con
# TIPOS_NECESIDAD del frontend). "Otro" siempre queda como respaldo.
TIPOS_NECESIDAD_CANONICOS = [
    "Comida y agua",
    "Servicios médicos",
    "Atención psicosocial",
    "Refugio y abrigo",
    "Escombros",
    "Maquinaria y rescate",
    "Transporte",
    "Voluntariado",
    "Mascotas",
    "Otro",
]

SYSTEM_PROMPT = """Eres el clasificador de reportes de una plataforma solidaria de emergencias (sismo en Colombia).

Tu única tarea: dado un reporte de necesidad, clasificarlo en EXACTAMENTE una de las categorías permitidas.

REGLAS:
1. Responde SOLO con el nombre exacto de la categoría. Nada de explicaciones, puntos, comillas ni texto adicional.
2. Si ya hay un "tipo actual" y es una categoría válida (no "Otro"): consérvalo SI la descripción efectivamente corresponde a esa categoría. Si la descripción claramente pertenece a otra categoría, responde la correcta.
3. Si el "tipo actual" es "Otro" o no existe: elige la categoría que mejor describa lo que la persona necesita.
4. Si la descripción no encaja en ninguna categoría concreta, responde "Otro".
5. La descripción puede tener errores de ortografía o ser informal: entiende la intención.

Categorías permitidas:
{categorias}"""


def normalizar_tipos(tipos_posibles: list[str] | None) -> list[str]:
    """Devuelve la lista de tipos permitidos, siempre con 'Otro' al final.
    Deduplica sin distinguir mayúsculas y canónica 'otro' → 'Otro'."""
    if not tipos_posibles:
        return list(TIPOS_NECESIDAD_CANONICOS)
    vistos: list[str] = []
    vistos_lower: set[str] = set()
    for t in tipos_posibles:
        s = str(t).strip()
        if not s or s.lower() in vistos_lower:
            continue
        s = "Otro" if s.lower() == "otro" else s
        vistos.append(s)
        vistos_lower.add(s.lower())
    if "otro" not in vistos_lower:
        vistos.append("Otro")
    return vistos


def _match_tipo(respuesta: str, tipos_posibles: list[str]) -> str:
    """Normaliza la respuesta del modelo contra la lista permitida."""
    texto = respuesta.strip().strip('"\'`.').strip().lower()
    # 1) coincidencia exacta (sin distinguir mayúsculas)
    for t in tipos_posibles:
        if t.lower() == texto:
            return t
    # 2) el modelo agregó puntuación o palabras sueltas: ¿algún tipo está dentro del texto?
    for t in tipos_posibles:
        if t.lower() in texto:
            return t
    # 3) el texto del modelo está dentro de un tipo (p. ej. devolvió "comida")
    for t in tipos_posibles:
        if texto in t.lower():
            return t
    return "Otro"


async def clasificar(
    descripcion: str,
    tipo_actual: str | None,
    tipos_posibles: list[str],
) -> str:
    """Clasifica la descripción y devuelve un tipo de la lista permitida."""
    tipo_actual_limpio = (tipo_actual or "").strip()
    if tipo_actual_limpio.lower() == "otro":
        tipo_actual_limpio = ""

    categorias = "\n".join(f"- {t}" for t in tipos_posibles)
    system = SYSTEM_PROMPT.format(categorias=categorias)
    user = f"Reporte: {descripcion}\nTipo actual: {tipo_actual_limpio or '(ninguno)'}"

    body: dict = {
        "model": config.DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.1,
        "max_tokens": 60,
        "stream": False,
    }

    async with httpx.AsyncClient(
        headers={
            "Authorization": f"Bearer {config.DEEPSEEK_API_KEY}",
            "Content-Type": "application/json",
        },
        timeout=config.DEEPSEEK_TIMEOUT,
    ) as client:
        resp = await client.post(f"{config.DEEPSEEK_API_URL}/chat/completions", json=body)
        resp.raise_for_status()
        data = resp.json()

    contenido = ((data.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
    return _match_tipo(contenido, tipos_posibles)
