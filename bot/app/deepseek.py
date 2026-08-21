"""Cliente DeepSeek con loop de function calling (2 herramientas)."""
import json
import logging

import httpx

from . import config, tools

log = logging.getLogger("bot.deepseek")

SYSTEM_PROMPT = """Eres "Anay", la asistente solidaria de SolidaridadCO, el mapa de sectores afectados por el sismo.

Ayudas a las personas con DOS cosas:
1. REALIZAR UN REPORTE de lo que necesitan (usando la función realizar_reporte).
2. BUSCAR QUIÉN LES AYUDE: ofrecimientos de ayuda y centros de acopio (usando la función buscar_ayuda).

REGLAS DE ORO:
1. SOLO actúas a través de las funciones disponibles. NUNCA digas que guardaste un reporte si no ejecutaste realizar_reporte.
2. NUNCA inventes personas, teléfonos, ofrecimientos ni centros. Todo lo que muestres debe venir de los resultados de las funciones (datos reales).
3. Para realizar_reporte necesitas la DESCRIPCIÓN de lo que necesita y su TELÉFONO. Si el usuario no los ha dado, pídeselos con una pregunta corta (una sola vez) antes de llamar la función.
4. Cuando el reporte quede guardado, SIEMPRE dile al usuario su CÓDIGO PIN (viene en el resultado) y explícale que con ese código puede editar o confirmar su reporte en la página.
5. Para buscar_ayuda, si el usuario no dice qué busca, pregúntale qué tipo de ayuda necesita (alimentos, alojamiento, transporte...).
6. El contexto del chat te da la ciudad del usuario; úsala por defecto en las funciones.
7. ALCANCE (MUY IMPORTANTE): tus ÚNICAS capacidades son las DOS funciones (realizar_reporte y buscar_ayuda). Si el usuario pregunta o pide CUALQUIER otra cosa — clima, política, deportes, noticias generales, opiniones, chistes, matemáticas, cultura, viajes, temas personales u otros sitios — NO respondas la pregunta: NIEGATE amablemente y ofrece solo tus dos acciones. Ejemplos de respuesta correcta: "Solo puedo ayudarte a reportar una necesidad o a buscar quién te ayude 😊 ¿Cuál de las dos prefieres?" o "Eso no está en mi alcance: solo registro reportes de necesidades y busco ayuda para ti."

ESTILO:
- Preséntate como "Anay" al saludar: "¡Hola! Soy Anay, tu asistente solidaria 😊".
- Responde SIEMPRE en español, cálido y cercano, con emojis ocasionales.
- Sé breve: máximo 3-4 oraciones por mensaje, salvo cuando listes ofrecimientos/centros.
- Al listar ofrecimientos, menciona tipo, contacto y teléfono (máx. 5) y pregunta si quiere que lo contacte o busque otra cosa.
- Nunca respondas preguntas fuera de tus dos funciones: ofrece únicamente reportar una necesidad o buscar quién ayude.
- Nunca menciones "función", "tool", "base de datos" ni términos técnicos."""


async def _call_chat(messages: list[dict]) -> dict:
    if not config.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY_BOT no está configurada")

    body: dict = {
        "model": config.DEEPSEEK_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": config.MAX_TOKENS,
        "tools": tools.TOOLS,
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
        return resp.json()


async def chat_with_tools(
    session_id: str,
    user_message: str,
    history: list[dict] | None = None,
    contexto: dict | None = None,
) -> dict:
    """Procesa un mensaje con el loop de function calling."""
    ctx: dict = {
        "session_id": session_id,
        "ciudad": (contexto or {}).get("ciudad") or "manizales",
        "lat": (contexto or {}).get("lat"),
        "lng": (contexto or {}).get("lng"),
        "payload": {},
    }

    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    if history:
        for h in history[-config.MAX_HISTORY:]:
            role = h.get("role")
            content = h.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})

    for _round in range(config.MAX_TOOL_ROUNDS):
        data = await _call_chat(messages)
        msg = data["choices"][0]["message"]

        tool_calls = msg.get("tool_calls") or []
        if not tool_calls:
            reply = (msg.get("content") or "").strip()
            if not reply:
                reply = "¿En qué más te puedo ayudar? 😊"
            return {"reply": reply, "payload": ctx.get("payload") or {}}

        messages.append(
            {
                "role": "assistant",
                "content": msg.get("content") or "",
                "tool_calls": tool_calls,
            }
        )
        for tc in tool_calls:
            fn = tc.get("function") or {}
            name = fn.get("name") or ""
            try:
                args = json.loads(fn.get("arguments") or "{}")
            except json.JSONDecodeError:
                args = {}
            handler = tools.FUNCTION_MAP.get(name)
            if handler is None:
                result = {"ok": False, "mensaje": f"La acción '{name}' no está disponible."}
            else:
                try:
                    result = await handler(args, ctx)
                except Exception as exc:  # noqa: BLE001
                    log.exception("Error en herramienta %s", name)
                    result = {"ok": False, "mensaje": f"Ocurrió un error al ejecutar la acción: {exc}"}
            log.info("tool %s args=%s -> %s", name, args, str(result)[:160])
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.get("id") or "",
                    "content": json.dumps(result, ensure_ascii=False),
                }
            )

    log.warning("Loop de herramientas agotado para %s", session_id)
    return {
        "reply": "Lo siento, no pude completar la solicitud. Inténtalo de nuevo por favor.",
        "payload": ctx.get("payload") or {},
    }
