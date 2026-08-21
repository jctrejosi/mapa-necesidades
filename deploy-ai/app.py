"""App combinada para Render: sirve el bot Anay en "/" y el ia-service en "/ia".

Render expone UN solo puerto por servicio web, así que para correr bot e
ia-service en el mismo servidor se montan ambas apps FastAPI en una sola app
ASGI con Starlette:

  GET  /health          → estado del bot
  POST /chat            → chat del bot Anay
  GET  /ia/health       → estado del ia-service
  POST /ia/clasificar   → clasificación inteligente del tipo de reporte

El código de cada proyecto vive en su carpeta (bot/ e ia-service/); aquí solo
se importan con otro nombre de paquete para evitar el choque del módulo "app".
"""
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE / "bot_app"))
sys.path.insert(0, str(BASE / "ia_app"))

from starlette.applications import Starlette
from starlette.routing import Mount

from bot_app.main import app as bot_app
from ia_app.main import app as ia_app

app = Starlette(
    routes=[
        # El montaje más específico va primero: Mount("/") captura todo lo demás.
        Mount("/ia", app=ia_app),
        Mount("/", app=bot_app),
    ]
)
