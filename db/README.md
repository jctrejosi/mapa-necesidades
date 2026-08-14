# SolidaridadCO — Despliegue con Docker

Este directorio orquesta el stack: **backend (NestJS/Drizzle) + cliente + admin**. La **base de datos vive en Supabase** (PostgreSQL en la nube); aquí ya no corre un PostgreSQL local.

## Arranque

```bash
cd db
cp .env.example .env       # opcional: cambia ADMIN_PASSWORD / credenciales
docker compose up -d --build
```

Quedará corriendo:

| Servicio | URL |
|---|---|
| Frontend (cliente / mapa público) | http://localhost:8080 |
| Panel admin (interfaz separada) | http://localhost:8081 (clave `admin123` por defecto) |
| API | http://localhost:3000/api |
| PostgreSQL | Supabase (nube) — el backend corre las migraciones al arrancar |

## Base de datos (Supabase)

- Cada proyecto de Supabase tiene una instancia de PostgreSQL con la base por defecto `postgres` (a la que apunta `DATABASE_URL`). No hay que "crear una db aparte": las tablas se crean en esa base con las migraciones de Drizzle.
- **URL**: `postgresql://postgres:…@db.idiypzqlbjeqgphjlabz.supabase.co:5432/postgres`
  - Si la contraseña tiene caracteres especiales (ej. `@`) debe ir URL-encoded (`@` → `%40`).
  - Supabase exige SSL: el backend la conecta con `DB_SSL=true`.
- Las migraciones se aplican automáticamente cuando arranca el backend (`npm run db:migrate` también funciona desde `backend/`).

## Migrar los datos de producción (una sola vez)

1. El dump MySQL de producción ya está en `../backups/mapanece_mapa-necesidades.sql` (montado en el contenedor backend en `/app/legacy-backups`).
2. Con el stack arriba, ejecuta:

```bash
docker compose exec backend npm run db:import-legacy
```

El script trunca e importa las 9 tablas conservando los ids y fija las secuencias. Al final valida los conteos esperados (sectores=22, contactos=21, necesidades=20, ofrecimientos=19, mascotas=1, centros=6, noticias=1, viviendas=0, danos=14).

3. **Imágenes**: copia los archivos de `uploads/` del servidor de producción al volumen del backend:

```bash
docker compose cp <ruta_local_uploads>/. backend:/app/uploads/
```

## Tareas útiles

```bash
docker compose logs -f backend     # logs de la API
docker compose down                # detiene los contenedores (la DB sigue en Supabase)
```

## Desarrollo (sin Docker)

- **Frontend (cliente)**: `cd "../interfaz web" && pnpm install && pnpm dev` (Vite proxya `/api` y `/uploads` a `localhost:3000`).
- **Frontend (admin)**: `cd "../interfaz web admin" && npm install && npm run dev` (puerto 8444).
- **Backend**: `cd ../backend && npm install && npm run start:dev` (usa `backend/.env` → Supabase).
- Migraciones: `npm run db:generate` (tras tocar `src/db/schema.ts`) y `npm run db:migrate`.
