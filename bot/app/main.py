"""API del bot Daisy de SolidaridadCO.

Endpoints:
- GET  /health  → estado del servicio
- POST /chat    → conversación (mensaje + historial + contexto) → respuesta + payload
"""
import logging
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import config, deepseek

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("bot.main")

app = FastAPI(
    title="SolidaridadCO Bot API (Daisy)",
    description="Chatbot solidario con DeepSeek function calling: realiza reportes y busca ayuda en la plataforma.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoryMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class Contexto(BaseModel):
    ciudad: str | None = None
    lat: float | None = None
    lng: float | None = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    history: list[HistoryMessage] = Field(default_factory=list)
    contexto: Contexto | None = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    payload: dict = Field(default_factory=dict)


@app.get("/health")
async def health():
    return {"status": "ok", "model": config.DEEPSEEK_MODEL}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not config.DEEPSEEK_API_KEY:
        raise HTTPException(status_code=503, detail="DEEPSEEK_API_KEY no está configurada")

    session_id = req.session_id or str(uuid.uuid4())
    history = [h.model_dump() for h in req.history]
    contexto = req.contexto.model_dump() if req.contexto else None

    try:
        result = await deepseek.chat_with_tools(
            session_id=session_id,
            user_message=req.message,
            history=history,
            contexto=contexto,
        )
    except Exception as exc:  # noqa: BLE001
        log.exception("Error procesando chat")
        raise HTTPException(status_code=502, detail=f"Error del proveedor de IA: {exc}") from exc

    return ChatResponse(
        reply=result["reply"],
        session_id=session_id,
        payload=result.get("payload") or {},
    )
