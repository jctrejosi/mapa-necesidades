# SolidaridadCO — Carpeta `db`

Orquesta la **base de datos local (PostgreSQL en Docker)** y guarda los datos y
las herramientas relacionadas. Los servicios (backend, web, admin, bot) los
levanta `setup.js` en el host; **lo único que corre en Docker aquí es la BD**.

## Contenido

| Ruta | Qué es |
|---|---|
| `docker-compose.yml` | PostgreSQL local (puerto **5435**) + perfiles del stack |
| `.env` / `.env.example` | Variables de entorno para compose (`.env` no se sube) |
| `scripts/sync-prod.sh` | Trae los datos de PRODUCCIÓN (Supabase) a la base local |
| `scripts/backup.sh` | Copia de seguridad de la base local en `db/backups/` |
| `data/bk.sql` | Dump legado (MySQL) usado como semilla (`backups/bk.sql` en la raíz es idéntico) |
| `data/danos-Manizales.csv` | Exportación de reportes de daños |
| `data/courtyard-*.webp` | Imagen sobrante de pruebas (puede borrarse) |

## Base de datos local

```bash
docker compose -f db/docker-compose.yml up -d db   # PostgreSQL local en :5435
```

> El puerto es **5435** a propósito: evita chocar con otros proyectos locales
> (p. ej. `chatbot-db` usa 5434).

## Copia de seguridad de la base local

```bash
db/scripts/backup.sh
```

Genera `db/backups/redsolidaria_<fecha>.sql.gz` (volcado comprimido con fecha/hora).
Requiere la BD local arriba. Los backups no se suben a git (ver `db/.gitignore`).

## Traer datos de producción a local

```bash
db/scripts/sync-prod.sh
```

Hace **UPSERT por id** (inserta lo nuevo, actualiza lo existente, no borra nada).
Requiere `PROD_DATABASE_URL` en `backend/.env` (con la contraseña de Supabase) y
la base local arriba. Si el backend no está compilado, lo compila primero.

## Arranque completo

Desde la raíz del repo:

```bash
node setup.js            # levanta backend + web + admin + bot en el host y la BD en Docker
node setup.js --down     # detiene los servicios locales y la BD (conserva los datos)
node setup.js --reset    # borra la BD y monta todo desde cero
```

Los logs quedan en `logs/` (backend, web, admin, bot, db).
