"""Configuración del bot desde variables de entorno."""
import os

from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
DEEPSEEK_API_URL = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com")
DEEPSEEK_TIMEOUT = float(os.getenv("DEEPSEEK_TIMEOUT", "45"))

# Backend de SolidaridadCO (NestJS): el bot guarda/consulta a través de su API
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000").rstrip("/")
BACKEND_TIMEOUT = float(os.getenv("BACKEND_TIMEOUT", "20"))

PORT = int(os.getenv("BOT_API_PORT", "8000"))
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGIN", "http://localhost:8080,http://localhost:8081,http://localhost:8443").split(",")
    if o.strip()
]

MAX_HISTORY = int(os.getenv("BOT_MAX_HISTORY", "12"))
MAX_TOKENS = int(os.getenv("BOT_MAX_TOKENS", "2000"))
MAX_TOOL_ROUNDS = int(os.getenv("BOT_MAX_TOOL_ROUNDS", "6"))
