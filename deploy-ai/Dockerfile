# ── Contenedor único para Render: bot Anay + ia-service ──
# Sirve el bot en "/" y el ia-service montado en "/ia" (ver app.py).
FROM python:3.12-slim
WORKDIR /app

# Dependencias de ambos proyectos (mismas versiones en los dos requirements).
COPY bot/requirements.txt /app/requirements-bot.txt
COPY ia-service/requirements.txt /app/requirements-ia.txt
RUN pip install --no-cache-dir -r /app/requirements-bot.txt -r /app/requirements-ia.txt

# Código de ambos. Se renombran (bot_app / ia_app) para evitar el choque del
# paquete "app" (los imports relativos de cada proyecto siguen funcionando).
COPY bot/app /app/bot_app
COPY ia-service/app /app/ia_app
COPY deploy-ai/app.py /app/app.py

# Render inyecta $PORT y exige escuchar ahí.
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
