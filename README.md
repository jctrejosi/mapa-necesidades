# Mapa de Sectores Afectados — Sismo Manizales

App para ubicar en un mapa los sectores afectados por el sismo del 10 de agosto de 2026, con su persona clave de contacto y las necesidades reportadas de cada sector.

## Archivos

- `schema.sql` — crea las tablas en tu base de datos MySQL
- `config.php` — credenciales de conexión (edítalo antes de subir)
- `api.php` — backend (todas las acciones vía `api.php?action=...`)
- `index.html` — mapa público (Leaflet + OpenStreetMap, sin API key)
- `admin.html` — panel de administración

## Desarrollo local con Docker

Requiere solo Docker + Docker Compose (y Node ≥ 18 para el script). Desde la raíz del proyecto:

```bash
node setup.js
```

El script levanta MySQL y Apache/PHP, espera a que estén listos y verifica la conexión con la API. También puedes usar Docker Compose directamente:

```bash
docker compose up -d --build
```

- **Mapa público**: http://localhost:8080/index.html
- **Panel admin**: http://localhost:8080/admin.html (clave por defecto: `admin123`)
- **MySQL**: expuesto en `localhost:3307` (user `mapa_user`, pass `mapa_pass_local`, base `mapa_necesidades`)

Detalles:

- El contenedor `db` crea el esquema automáticamente la primera vez: `schema.sql` + migraciones 8–11 (las demás ya están incluidas en `schema.sql`), definidos en `docker/initdb/`.
- Los datos persisten en el volumen `db_data`. Para resetear la base de datos: `docker compose down -v && docker compose up -d`.
- `config.php` lee la conexión de variables de entorno (definidas en `docker-compose.yml`), así que no necesitas editarlo para correr en local. Para producción sigue editando los valores por defecto de `config.php`.
- Las imágenes subidas se guardan en `uploads/` (se crea solo) y persisten porque el proyecto está montado como volumen.
- Parar todo: `node setup.js --down` o `docker compose down` (o `down -v` para borrar también la base de datos; también hay `node setup.js --reset` que borra y arranca de cero).

## Instalación en InfinityFree

1. **Base de datos**: entra al panel de InfinityFree → MySQL Databases, crea una base de datos y anota host, nombre, usuario y contraseña.
2. Abre **phpMyAdmin**, selecciona tu base de datos y ejecuta el contenido de `schema.sql` en la pestaña "SQL".
3. Edita `config.php` con tus datos reales:
   - `DB_HOST` normalmente es algo como `sqlXXX.infinityfree.com` (revisa el panel; si usas `localhost` en tu propio servidor, usa `127.0.0.1` en vez de `localhost`).
   - `DB_NAME`, `DB_USER`, `DB_PASS` los da InfinityFree.
   - `ADMIN_PASSWORD` — cámbiala por una clave que solo tú conozcas.
4. Sube los 4 archivos (`config.php`, `api.php`, `index.html`, `admin.html`) a `htdocs/` por FTP.
5. Visita `tudominio.infinityfreeapp.com/index.html` para el mapa público, y `/admin.html` para el panel de administración.

## Cómo funciona

- **Mapa público (`index.html`)**: cualquiera puede ver los sectores marcados por color según nivel de afectación (verde=leve, naranja=moderado, rojo=severo), hacer clic en un marcador para ver el contacto clave y las necesidades, reportar un **sector nuevo** haciendo clic en el mapa, o reportar una **necesidad** sobre un sector existente.
- **Panel admin (`admin.html`)**: protegido por la contraseña de `config.php`. Permite ver todos los sectores (incluso cerrados), cambiar el estado de cada necesidad (pendiente → en proceso → atendida), eliminar contactos/necesidades/sectores, cerrar un sector cuando ya fue atendido, y exportar todo a CSV.

## Notas

- No requiere API key de Google Maps — usa Leaflet con mosaicos gratuitos de OpenStreetMap.
- El mapa se centra por defecto en Manizales (5.0689, -75.5174).
- La lista pública se refresca sola cada 30 segundos.
- Todo el texto se sanea con `escapeHtml()` antes de mostrarse para evitar inyección de HTML.
