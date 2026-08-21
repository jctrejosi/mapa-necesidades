"""Configuración del servicio de IA desde variables de entorno."""
import os

from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY_IA_SERVICE", "")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
DEEPSEEK_API_URL = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com").rstrip("/")
DEEPSEEK_TIMEOUT = float(os.getenv("DEEPSEEK_TIMEOUT", "30"))

PORT = int(os.getenv("IA_SERVICE_PORT", "8100"))
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGIN", "http://localhost:3000,http://localhost:8080,http://localhost:8081").split(",")
    if o.strip()
]
