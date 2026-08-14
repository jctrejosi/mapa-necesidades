Plataforma web solidaria y comunitaria (sin cuentas de usuario) para coordinar ayuda tras el terremoto en Colombia (10/08/2026). Cualquier persona puede reportar necesidades, ofrecer ayuda, publicar mascotas perdidas, ofertas de vivienda y reportes de daños. Un administrador modera y gestiona todo desde un panel protegido por contraseña.

---

## 1. AUDIENCIAS Y ROLES

| Rol | Acceso | Capacidades |
|---|---|---|
| **Público** (cualquier persona) | Sin registro ni contraseña | Ver mapa y listados, reportar sectores y necesidades, publicar ofrecimientos/mascotas/viviendas/daños, asignarse como responsable de una necesidad, reservar ofrecimientos, marcar avistamientos, editar SUS publicaciones con un PIN de 4 dígitos |
| **Administrador** | Contraseña única (definida en `config.php`) | Todo lo del público + crear/editar/eliminar cualquier registro, publicar noticias, crear centros de acopio, gestionar reportes de daños (visitas técnicas), ver datos privados, ver/restablecer PINs, exportar CSV |

---

## 2. COMPORTAMIENTOS GLOBALES (aplican a toda la app)

1. **Multi-ciudad**: 6 ciudades soportadas — Manizales (defecto), Pereira, Cali, Quibdó, Municipios del Norte del Valle, Armenia. El selector de ciudad está en el header de todas las páginas y la elección se recuerda entre visitas (`localStorage`). Todos los datos se filtran por ciudad.
2. **Reportes de daños limitados por convenio**: solo habilitado en Manizales. Las demás ciudades no ven el flujo de reportar daño (el botón dice "Reporte de daños (Manizales)").
3. **Refresco automático**: los listados/mapas se recargan solos cada **30 segundos** (noticias y centros: cada 60s). El diseño debe soportar datos que cambian sin recargar la página.
4. **Código de edición (PIN)**: al publicar una necesidad, ofrecimiento, mascota o vivienda, se genera un **código de 4 dígitos** que se muestra en un modal ("✅ ¡Publicado! — Guarda este código... Nadie más podrá cambiarla sin él"). Es el único mecanismo para que el autor edite su publicación desde la app pública. Si se pierde, el admin puede verlo o restablecerlo.
5. **Imágenes**: foto opcional en casi todos los formularios. Se comprime automáticamente en el navegador (máx. 1000px ancho, JPEG calidad 0.72) antes de subir. Formatos permitidos: JPG, PNG, WEBP (máx. 4MB). Las fotos se abren en pestaña nueva al hacer clic.
6. **Seguridad de contenido**: todo texto que viene de la API se escapa antes de renderizar (sin inyección HTML). Los datos personales de reportes de daños (nombre, teléfono, cédula) **nunca** aparecen en el mapa público.
7. **Mensajes de error/confirmación**: `alert()` y `confirm()` nativos (no toasts). Validaciones con mensajes específicos.
8. **Idioma**: todo en español. Fechas en formato "12 ago" o "14 de agosto de 2026".
9. **Mobile-first responsive**: en pantallas ≤720px el mapa queda arriba (≈50% alto) y la lista/sidebar abajo.

---

## 3. SISTEMA DE DISEÑO

**Paleta** (inspirada en la bandera de Colombia):
- Amarillo `#FCD116` (avisos, franja superior)
- Azul `#003893` (botones primarios, chips activos, títulos)
- Rojo `#CE1126` (estados críticos: requiere ayuda, perdido, pendiente)
- Naranja `#E08E00` (estados intermedios: en proceso, visita programada, alquiler)
- Verde `#2E9E5B` (estados resueltos: atendido, encontrado, visitado, disponible)
- Gris `#9AA0AC` (sin datos, cerrado, ocupado, entregado)
- Fondos `#f4f5f7`, tarjetas blancas con borde `#e1e4e9`, texto `#1f2430`

**Elementos comunes**:
- **Header**: franja degradada tricolor de 3px (amarillo 0–34% | azul 34–67% | rojo 67–100%) + barra blanca con título (h1 con emoji), selector de ciudad y botones de navegación entre páginas.
- **Footer** fijo en todas las páginas: "🌎 Plataforma solidaria y apolítica · 📍 Terremoto Colombia 10/08/2026 · App hecha con ❤️ por un Manizaleño solidario · ✉️ wilmarecheverry@gmail.com · 💬 WhatsApp +57 310 381 7213"
- **Botones**: `btn-primary` (azul), `btn-outline` (borde azul), radio 8px.
- **Chips de filtro**: píldoras; el activo = fondo azul texto blanco; solo uno activo por grupo.
- **Tags de estado**: píldoras de colores con texto en mayúsculas.
- **Modales**: overlay oscuro (rgba 0,0,0,.45), tarjeta blanca radio 14px, máx. 440–460px, scrollable, botones "Cancelar" + acción primaria a la derecha.
- **Banner de selección de ubicación**: caja flotante sobre el mapa "📍 Haz clic en el mapa donde..." + botón Cancelar.
- **Avisos**: cajas amarillas (informativo) o rojas (emergencia).

---

## 4. NAVEGACIÓN (enlaces del header en todas las páginas)

🗺️ Ver mapa (`index.html`) · 🤝 Ofrecimientos · 🐾 Mascotas · 📰 Noticias · 🏠 Vivienda · 🏚️ Reporte de daños (Manizales) · 📊 Dashboard · ❓ Ayuda · Panel admin

---

## 5. ESPECIFICACIÓN POR PÁGINA

### 5.1 `index.html` — MAPA PÚBLICO PRINCIPAL ⭐

**Propósito**: vista central de la emergencia: sectores afectados en un mapa colaborativo + centros de acopio + aviso de noticias.

**Layout**: header → barra de aviso de noticias (fondo amarillo claro: "📰 {título} — leer más", enlaza a noticias) → mapa Leaflet a pantalla completa + **sidebar derecha (340px)** con filtros y lista de sectores.

**Mapa**:
- Marcadores de sectores: pins de colores según el estado agregado del sector:
  - 🔴 **Rojo — Requiere ayuda** (hay ≥1 necesidad sin responsable)
  - 🟠 **Naranja — En proceso** (todas tienen responsable o están atendidas, al menos una en proceso)
  - 🟢 **Verde — Necesidades atendidas** (todas atendidas)
  - ⚪ **Gris — Sin necesidades reportadas**
- Marcadores de centros de acopio (capa que se puede ocultar): círculos azules con emojis 📦 acopio / 🩸 sangre / 🏠 alojamiento.
- Popup de sector: tag de estado, nombre, contacto de coordinación ("📞 Coordinar con" en caja amarilla — o "Sin contacto registrado — ¡sé el primero en dejar uno!"), lista de necesidades (con icono de estado, tipo, cantidad, fecha, descripción, foto), y por necesidad:
  - Si requiere → botón **"Yo puedo ayudar con esto"**
  - Si en proceso → "🙋 Atiende: {nombre} · 📞 {teléfono}"
  - Botón **"✎ Actualizar"** siempre
  - Las atendidas van tachadas y atenuadas
- Botón principal del popup: **"+ Reportar necesidad aquí"**
- Popup de centro: tag "🟢 Abierto"/"⚪ Cerrado temporalmente", nombre, tipos, foto, "Recibe ahora:", dirección, horario, teléfono, botón **"Cómo llegar"** (Google Maps).

**Sidebar**: título "Sectores reportados" + contador · chips de filtro: **Todos | 🟥 Requieren ayuda | 🟧 En proceso | ✅ Atendidos | ⬜ Sin reportes** · toggle "📦🩸🏠 Mostrar centros de acopio, bancos de sangre y alojamiento" · tarjetas de sector (tag, nombre, resumen en rojo "Requiere: Agua, Alimentos", contacto "📞 {nombre}" o "⚠️ sin contacto — agrega uno"). Clic en tarjeta → centra mapa y abre popup.

**Flujos**:
1. **Reportar sector nuevo + necesidad**: botón "+ Reportar necesidad" → clic en el mapa → modal con: nombre del sector*, tipo de necesidad* (select: Agua potable, Alimentos, Refugio/Carpas, Medicamentos, Atención médica, Ropa/Cobijas, Maquinaria/Rescate, Mascotas, Otro), cantidad estimada, prioridad (Alta/Media/Baja), detalles, foto, persona con quien coordinar*, teléfono, rol + desplegable opcional (comuna/referencia, nivel de daño Leve/Moderado/Severo, descripción). Al guardar crea sector + necesidad y muestra el modal del PIN.
2. **Reportar necesidad en sector existente**: desde popup, mismo formulario con sector precargado.
3. **Ayudar**: "Yo puedo ayudar con esto" → nombre* y teléfono* → la necesidad pasa a "en proceso" y queda visible quién atiende (evita ayuda duplicada).
4. **Actualizar con PIN**: "✎ Actualizar" → cantidad, prioridad, detalles, foto, estado (select: "Aún se requiere ayuda" / "Ya fue resuelta / atendida"), código de 4 dígitos*. Si hay responsable: botón "Ya no puedo ayudar / liberar" con confirmación.

### 5.2 `ofrecimientos.html` — OFRECIMIENTOS DE AYUDA

Propósito: ayuda que la comunidad ofrece (sin ubicación en mapa): comida, transporte, voluntariado, etc.

**Layout**: header → main 820px: buscador ("🔍 Buscar por tipo, descripción o nombre...") → chips de categoría (**Todas | 🍲 Comida y agua | ⚕️ Servicios médicos | 🐾 Mascotas | 🚚 Transporte | 🙋 Voluntariado | 🏠 Refugio y abrigo | 🛠️ Maquinaria y rescate | 📦 Otros**) → chips de estado (**Todos | 🟢 Disponibles | 🟧 Reservados | ✅ Entregados**) → tarjetas (agrupadas por categoría cuando no hay filtros).

**Tarjeta**: tag (🟢 Disponible / 🟧 Reservado / ✅ Entregado — este último atenuado), título "tipo — cantidad", foto, descripción, "📞 Ofrece: {nombre} · {teléfono} · {fecha}", botón **"Coordinar / reservar"** (si disponible) o "🙋 Coordina: {nombre} · 📞 {tel}" (si reservado), botón **"✎ Actualizar"** siempre.

**Flujos**: publicar (tipo*, cantidad, detalles, foto, nombre*, teléfono* → muestra PIN) · reservar (nombre*, teléfono* con aviso de que queda marcado como reservado) · editar con PIN (cantidad, detalles, foto, estado Disponible/Ya se entregó, PIN*; si está reservado: "Cancelar esta reserva") · cancelar reserva.

### 5.3 `mascotas.html` — MASCOTAS PERDIDAS

Propósito: reportar mascotas perdidas con ubicación en mapa, avistamientos y reencuentros.

**Layout**: header → mapa + sidebar 360px (filtros **Todos | 🟥 Perdidos | ✅ Encontrados** + tarjetas).

**Mapa**: pins 🐾 rojo (perdido) / verde (encontrado). Popup: tag, "Perro — Firulais", foto, señas, lugar y fecha, "📞 Reporta: {nombre} · {teléfono}", "🙋 Avistado por:..." si existe, botones **"Yo la vi / la tengo yo"** (solo perdidas sin avistamiento) y **"✎ Actualizar"**.

**Flujos**: reportar (clic en mapa → tipo* Perro/Gato/Otro, nombre, señas*, foto, lugar, fecha*, nombre del reportante*, teléfono* → PIN) · avistar ("Yo la vi / la tengo yo" → nombre* y teléfono*, aviso de que quedará visible para el dueño) · quitar avistamiento (con confirmación) · editar con PIN (nombre, señas, foto, estado "Sigue perdida"/"¡Ya apareció!", PIN*).

### 5.4 `vivienda.html` — VIVIENDA Y ALOJAMIENTO

Propósito: ofertas comunitarias de alojamiento gratuito o en alquiler. **Sin mapa ni coordenadas** (solo barrio/sector de referencia, por seguridad).

**Layout**: main 820px: buscador ("🔍 Buscar por sector, descripción o precio...") → chips tipo (**Todos | 🏠 Gratis | 💰 Alquiler**) → chips estado (**Todos | 🟢 Disponibles | ⚪ Ocupados**) → tarjetas.

**Tarjeta**: tag (🟢 Gratis, disponible / 🟢 En alquiler, disponible en naranja / ⚪ Ocupado — atenuado), título, foto, precio destacado, "👥 {capacidad} · 🕒 {tiempo_disponible}", descripción, "📞 Ofrece:...", botón **"Estoy interesado"** o "🙋 Interesado: {nombre} · 📞 {tel}", botón **"✎ Actualizar"**.

**Flujos**: publicar (tipo*, precio —solo visible si alquiler—, sector de referencia, capacidad, tiempo disponible, detalles, foto, nombre*, teléfono*; aviso de privacidad "no se publica dirección exacta" → PIN) · mostrar interés (nombre*, teléfono* + aviso de verificar con quién se habla) · quitar interesado · editar con PIN (estado "Disponible"/"Ya se ocupó / alquiló").

### 5.5 `danos.html` — REPORTE DE DAÑOS ESTRUCTURALES

Propósito: solicitar visita técnica de ingenieros para inmuebles dañados. Solo disponible en Manizales (convenio).

**Layout**: header (selector solo con ciudades habilitadas, botones "+ Reportar daño" y "🔎 Consultar mi reporte") → banda de aviso: "⚠️ Esto NO es un canal de emergencia — si hay riesgo de colapso inminente o personas atrapadas, llama de inmediato a la línea de emergencia 123." → mapa + sidebar (filtros **Todos | 🟥 Pendientes | 🟧 Visita programada | ✅ Visitados**).

**Mapa**: pins 🏚️ rojo (pendiente) / naranja (visita programada) / verde (visitado). Popup **sin datos personales**: tag, tipo de inmueble, foto, dirección, "Nivel percibido: Leve/Moderado/Severo/⚠️ Riesgo de colapso", "🏠 Habitado / ⚠️ Evacuado / 🔒 Desocupado · fecha", "Resultado visita: ..." si existe.

**Flujos**:
1. **Reportar**: clic en mapa → tipo de inmueble* (Casa/Apartamento/Edificio/Local comercial/Otro), dirección*, ¿está habitado?* (Sí/Fue evacuado/No, estaba desocupado), nivel de daño percibido* (Leve/Moderado/Severo/Riesgo de colapso), descripción, foto, nombre*, teléfono*, cédula (opcional). Aviso: "🔒 Tus datos de contacto solo los ve el equipo que gestiona las visitas técnicas — no aparecen en el mapa público." → Al enviar se genera y muestra un **número de radicado** (formato `DA` + 6 dígitos, ej. DA482913): "✅ Reporte enviado — Guarda este número de radicado..." (NO usa PIN).
2. **Consultar estado**: botón "🔎 Consultar mi reporte" → campo radicado → muestra: estado, tipo — dirección, nivel, fecha, visita programada (fecha), resultado del ingeniero o "Aún sin resultado de visita".

### 5.6 `noticias.html` — NOTICIAS Y COMUNICADOS

Propósito: comunicados oficiales (solo los publica el admin). Solo lectura.

**Layout**: main 720px con tarjetas: tag opcional "📢 TODAS LAS CIUDADES" (amarillo), foto, título h2, meta "{fecha} · {autor}" (fecha larga: "14 de agosto de 2026"), contenido completo (respeta saltos de línea). Sin detalle expandido, sin acciones. Estado vacío: "No hay comunicados publicados todavía."

### 5.7 `dashboard.html` — AVANCE DE NECESIDADES

Propósito: estadísticas públicas de la emergencia por ciudad. Solo lectura, refresco cada 30s.

**Contenido** (centrado 1040px, si no hay necesidades: "Todavía no hay necesidades reportadas."):
1. **Donut "Progreso general"**: verde = % atendidas, naranja = % en proceso, rojo = % sin asignar; centro con % grande azul "atendido"; leyenda "Atendidas / En proceso / Sin asignar".
2. **6 tarjetas**: 📍 Sectores activos · 📋 Necesidades reportadas · 🟥 Sin asignar · 🟧 En proceso · ✅ Atendidas · 🤝 Ofrecimientos disponibles.
3. **Mini mapa de urgencia por sector** (260px): círculos cuyo radio crece con el nº de necesidades; rojo si hay sin asignar, naranja si solo en proceso, verde si atendidas; tooltip "{nombre}: X sin asignar, Y en proceso, Z atendidas".
4. **"Avance por tipo de necesidad (lo más pendiente primero)"**: por cada tipo, badge "{n} sin asignar", "{atendidas}/{total} atendidas", barra de progreso segmentada verde/naranja/rojo.
5. **"Avance por sector (lo más urgente primero)"**: igual, por sector.

### 5.8 `ayuda.html` — AYUDA / CÓMO USAR LA APP

Propósito: página estática (sin API) con guía de uso y FAQ. 12 bloques con pasos numerados (círculos azules 26px):
1. 🔑 Tu código de edición (qué es el PIN, guardarlo)
2. 🗺️ El mapa de necesidades (elegir ciudad, leyenda de colores, tocar sector)
3. ➕ Reportar una necesidad (3 pasos)
4. 🙋 Ayudar con una necesidad (2 pasos + aviso importante de marcar "Ya fue resuelta")
5. 🤝 Ofrecimientos de ayuda (3 pasos)
6. 📊 Dashboard de avance
7. 📸 Fotos en necesidades y ofrecimientos
8. 🐾 Mascotas perdidas (3 pasos)
9. 🏠 Vivienda y alojamiento (3 pasos + advertencia de verificación)
10. 🏚️ Reporte de daños estructurales (aviso de emergencia 123 + 3 pasos)
11. 📦🩸 Centros de acopio y bancos de sangre (solo admin los publica, verificados)
12. 🛠️ Panel de administración

Termina con botones de acceso rápido: 🗺️ Ir al mapa · 🤝 Ver ofrecimientos · 🐾 Ver mascotas · 🏚️ Reportar daño · 📊 Ver dashboard.

### 5.9 `admin.html` — PANEL DE ADMINISTRACIÓN

**Login**: tarjeta "Acceso administrador", campo contraseña, botón "Ingresar". Sesión en `sessionStorage` (auto-login al recargar). Error: "Contraseña incorrecta".

**Estructura**: una sola página con scroll, secciones apiladas (máx. 980px), cada una con toolbar (contador + acciones):

| Sección | Acciones admin |
|---|---|
| **Sectores** (tarjetas con tag LEVE/MODERADO/SEVERO y CERRADO, sub-tablas de Contactos y Necesidades) | Editar, Cerrar/Reactivar, Eliminar · contactos: +Agregar/✎/✕ · necesidades: +Agregar/✎/🔑PIN/✕, checkbox "Atendida" instantáneo, "Liberar" responsable · **⬇ Exportar CSV** |
| **Ofrecimientos** (tabla: estado/foto/tipo/ofrece/reservado por/fecha) | Liberar reserva, 🔑PIN, ✕ |
| **Mascotas** (tabla: estado/foto/animal/señas/reporta/avistado por/fecha) | 🔑PIN, ✕ |
| **Centros de acopio** (tabla: estado/foto/nombre/tipos 📦🩸🏠/qué recibe/dirección) | **+ Agregar centro**, ✎, ✕ (formulario con mini-mapa para ubicar, checkboxes de tipos, qué recibe, horario, estado Abierto/Cerrado) |
| **Noticias** (tabla: foto/título/visible en/autor/fecha) | **+ Publicar noticia**, ✎, ✕ (formulario con "📢 Todas las ciudades" o ciudad específica) |
| **Viviendas** (tabla: estado/foto/tipo/sector/ofrece/interesado) | 🔑PIN, ✕ |
| **Reportes de daños** (tabla: estado/radicado/foto/inmueble/nivel/reporta —con cédula visible—/fecha) | ✎ Gestionar (estado Pendiente/Visita programada/Visitado, fecha de visita, resultado, notas internas), ✕, **⬇ Exportar CSV para la entidad** |

**Modal 🔑 Código de edición (PIN)**: consulta y muestra el PIN ("···" mientras carga), nota "Restablecer genera un código nuevo — el anterior deja de funcionar", botón "🔄 Restablecer código". Si no hay PIN: "Sin código (publicación antigua)".

**Confirmaciones** antes de eliminar cualquier registro y al restablecer PIN.

---

## 6. MODELO DE DATOS (entidades y estados)

| Entidad | Campos clave | Estados/enums |
|---|---|---|
| **Sector** | ciudad, nombre, barrio/comuna, lat, lng, descripción, nivel_afectacion, estado | nivel: `leve·moderado·severo` · estado: `activo·cerrado` |
| **Contacto** | sector_id, nombre, teléfono, rol | — |
| **Necesidad** | sector_id, tipo, descripción, imagen, fecha, cantidad, prioridad, estado, responsable (nombre/tel/fecha compromiso), reportado_por, telefono_reporta, pin | prioridad: `alta·media·baja` · estado: `requiere·atendida` (el estado visual "en proceso" se deriva de tener responsable) |
| **Ofrecimiento** | ciudad, tipo, descripción, imagen, cantidad, fecha, nombre_ofrece, telefono_ofrece, estado, reservado_por (nombre/tel/fecha), pin | estado: `disponible·entregado` (+ "reservado" derivado de reservado_por) |
| **Mascota perdida** | ciudad, nombre, tipo_animal, señas, imagen, lat, lng, lugar_visto, fecha_visto, estado, nombre_reporta, telefono_reporta, avistado_por (nombre/tel/fecha), pin | estado: `perdido·encontrado` |
| **Centro de acopio** | ciudad, nombre, organización, es_acopio/es_sangre/es_alojamiento (3 checkboxes), que_recibe, imagen, dirección, teléfono, horario, lat, lng, estado | estado: `abierto·cerrado` |
| **Noticia** | ciudad (null = todas), título, contenido, imagen, autor, fecha | — |
| **Vivienda** | ciudad, tipo, precio, capacidad, tiempo_disponible, sector_referencia (sin coordenadas), descripción, imagen, estado, nombre_ofrece, telefono_ofrece, interesado (nombre/tel/fecha), pin | tipo: `gratis·alquiler` · estado: `disponible·ocupado` |
| **Reporte de daño** | radicado (DA######), ciudad, tipo_inmueble, dirección, lat, lng, habitado, nivel_percibido, descripción, imagen, reportante (nombre/tel/cédula — privados), estado, fecha_visita, resultado_visita, notas_admin | habitado: `si·no·evacuado` · nivel: `leve·moderado·severo·colapso` · estado: `pendiente·visita_programada·visitado` |

---

## 7. REGLAS DE NEGOCIO CLAVE (para no perder en el rediseño)

1. **Patrón PIN**: necesidad/ofrecimiento/mascota/vivienda = autoservicio con PIN. Centros, noticias y daños = solo admin (daños usa radicado para consulta pública, no edición).
2. **Privacidad**: daños = contacto privado (solo admin). Mascotas/viviendas/ofrecimientos/necesidades = contacto público (coordinación directa).
3. **Semáforo de sectores** en el mapa: rojo/naranja/verde/gris según necesidades sin asignar / en proceso / atendidas / sin datos.
4. **"En proceso" nunca se elige**: surge automáticamente al asignarse un responsable.
5. **Evitar ayuda duplicada**: cuando alguien se asigna, reserva o muestra interés, su nombre y teléfono quedan visibles públicamente.
6. **Centros de acopio** = institucionales, verificados, solo admin (a diferencia de Vivienda que es abierta a la comunidad).
7. **Exportar CSV** (admin): sectores+necesidades y reportes de daños (para entregar a la entidad de visitas técnicas), por ciudad.
8. **Eliminar sector** borra en cascada sus contactos y necesidades.
9. **Botón "Reporte de daños"** siempre dice "(Manizales)" porque el convenio solo está activo ahí.
10. **Todo listado público ordena**: primero los estados activos, después los resueltos (requiere→atendida, perdido→encontrado, disponible→ocupado, pendiente→visitado).

---

## 8. INVENTARIO DE COMPONENTES UI

Header tricolor + selector de ciudad · Footer solidario · Mapa Leaflet con pins de colores + popups · Sidebar con filtros (chips) y tarjetas clicables · Toggle de capas · Banner de selección de ubicación · Modales de formulario (10+ variantes) · Modal de PIN/radicado · Buscador en vivo · Chips de categoría/estado · Tarjetas con tags y estados atenuados · Tablas admin con miniaturas y acciones inline · Mini-mapa de selección (modal centro) · Donut de progreso · Barras de progreso segmentadas · Tarjetas de métricas · Login · Avisos amarillos/rojos.