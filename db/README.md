# SolidaridadCO — Despliegue con Docker

Este directorio orquesta el stack completo: **PostgreSQL + backend (NestJS/Drizzle) + frontend (Vite/nginx)**.

## Arranque

```bash
cd db
cp .env.example .env       # opcional: cambia ADMIN_PASSWORD
docker compose up -d --build
```

Quedará corriendo:

| Servicio | URL |
|---|---|
| Frontend (mapa público) | http://localhost:8080/index.html |
| Panel admin | http://localhost:8080 (pestaña Administración, clave `admin123` por defecto) |
| API | http://localhost:3000/api |
| PostgreSQL | localhost:55432 (mapa_user / mapa_pass_local / mapa_necesidades) |

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
docker compose down                # detiene (conserva los datos)
docker compose down -v             # detiene y borra la base de datos
```

## Desarrollo (sin Docker)

- **Backend**: `cd ../backend && npm install && npm run start:dev` (requiere PostgreSQL en `localhost:55432`, o ajusta `DATABASE_URL`).
- **Frontend**: `cd "../interfaz web" && pnpm install && pnpm dev` (Vite proxya `/api` y `/uploads` a `localhost:3000`).
- Migraciones: `npm run db:generate` (tras tocar `src/db/schema.ts`) y `npm run db:migrate`.
