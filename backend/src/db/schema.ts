import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

// ── Enums (mismos valores literales del esquema legado) ────────────────────

export const nivelAfectacion = pgEnum('nivel_afectacion', ['leve', 'moderado', 'severo']);
export const estadoSector = pgEnum('estado_sector', ['activo', 'cerrado']);
export const prioridad = pgEnum('prioridad', ['alta', 'media', 'baja']);
export const estadoNecesidad = pgEnum('estado_necesidad', ['requiere', 'atendida']);
export const estadoOfrecimiento = pgEnum('estado_ofrecimiento', ['disponible', 'entregado']);
export const estadoMascota = pgEnum('estado_mascota', ['perdido', 'encontrado']);
export const estadoCentro = pgEnum('estado_centro', ['abierto', 'cerrado']);
export const tipoVivienda = pgEnum('tipo_vivienda', ['gratis', 'alquiler']);
export const estadoVivienda = pgEnum('estado_vivienda', ['disponible', 'ocupado']);
export const habitado = pgEnum('habitado', ['si', 'no', 'evacuado']);
export const nivelDano = pgEnum('nivel_dano', ['leve', 'moderado', 'severo', 'colapso']);
export const estadoDano = pgEnum('estado_dano', ['pendiente', 'visita_programada', 'visitado']);

// ── Tablas ─────────────────────────────────────────────────────────────────

export const sectores = pgTable(
  'sectores',
  {
    id: serial('id').primaryKey(),
    ciudad: varchar('ciudad', { length: 50 }).notNull().default('manizales'),
    nombre: varchar('nombre', { length: 150 }).notNull(),
    barrio: varchar('barrio', { length: 150 }),
    lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
    lng: numeric('lng', { precision: 10, scale: 7 }).notNull(),
    descripcion: text('descripcion'),
    nivelAfectacion: nivelAfectacion('nivel_afectacion').notNull().default('moderado'),
    estado: estadoSector('estado').notNull().default('activo'),
    visitorId: varchar('visitor_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_sectores_ciudad').on(t.ciudad)],
);

export const contactos = pgTable(
  'contactos',
  {
    id: serial('id').primaryKey(),
    sectorId: integer('sector_id')
      .notNull()
      .references(() => sectores.id, { onDelete: 'cascade' }),
    nombre: varchar('nombre', { length: 150 }).notNull(),
    telefono: varchar('telefono', { length: 50 }),
    rol: varchar('rol', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_contactos_sector').on(t.sectorId)],
);

export const necesidades = pgTable(
  'necesidades',
  {
    id: serial('id').primaryKey(),
    pin: varchar('pin', { length: 10 }),
    sectorId: integer('sector_id')
      .notNull()
      .references(() => sectores.id, { onDelete: 'cascade' }),
    tipo: varchar('tipo', { length: 100 }).notNull(),
    descripcion: text('descripcion'),
    imagen: varchar('imagen', { length: 255 }),
    evidencias: jsonb('evidencias'),
    ayudaPuntoApoyoId: integer('ayuda_punto_apoyo_id').references(() => puntosApoyo.id),
    fecha: date('fecha').notNull(),
    cantidad: varchar('cantidad', { length: 100 }),
    prioridad: prioridad('prioridad').notNull().default('media'),
    estado: estadoNecesidad('estado').notNull().default('requiere'),
    responsableNombre: varchar('responsable_nombre', { length: 150 }),
    responsableTelefono: varchar('responsable_telefono', { length: 50 }),
    fechaCompromiso: date('fecha_compromiso'),
    reportadoPor: varchar('reportado_por', { length: 150 }),
    telefonoReporta: varchar('telefono_reporta', { length: 50 }),
    visitorId: varchar('visitor_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_necesidades_sector').on(t.sectorId)],
);

export const ofrecimientos = pgTable(
  'ofrecimientos',
  {
    id: serial('id').primaryKey(),
    pin: varchar('pin', { length: 10 }),
    ciudad: varchar('ciudad', { length: 50 }).notNull().default('manizales'),
    tipo: varchar('tipo', { length: 100 }).notNull(),
    descripcion: text('descripcion'),
    imagen: varchar('imagen', { length: 255 }),
    cantidad: varchar('cantidad', { length: 100 }),
    fecha: date('fecha').notNull(),
    nombreOfrece: varchar('nombre_ofrece', { length: 150 }).notNull(),
    telefonoOfrece: varchar('telefono_ofrece', { length: 50 }),
    estado: estadoOfrecimiento('estado').notNull().default('disponible'),
    reservadoPorNombre: varchar('reservado_por_nombre', { length: 150 }),
    reservadoPorTelefono: varchar('reservado_por_telefono', { length: 50 }),
    fechaReserva: date('fecha_reserva'),
    lat: numeric('lat', { precision: 10, scale: 7 }),
    lng: numeric('lng', { precision: 10, scale: 7 }),
    visitorId: varchar('visitor_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_ofrecimientos_ciudad').on(t.ciudad)],
);

export const mascotasPerdidas = pgTable(
  'mascotas_perdidas',
  {
    id: serial('id').primaryKey(),
    pin: varchar('pin', { length: 10 }),
    ciudad: varchar('ciudad', { length: 50 }).notNull().default('manizales'),
    nombreMascota: varchar('nombre_mascota', { length: 100 }),
    tipoAnimal: varchar('tipo_animal', { length: 50 }).notNull(),
    senas: text('senas'),
    imagen: varchar('imagen', { length: 255 }),
    lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
    lng: numeric('lng', { precision: 10, scale: 7 }).notNull(),
    lugarVisto: varchar('lugar_visto', { length: 150 }),
    fechaVisto: date('fecha_visto').notNull(),
    estado: estadoMascota('estado').notNull().default('perdido'),
    nombreReporta: varchar('nombre_reporta', { length: 150 }).notNull(),
    telefonoReporta: varchar('telefono_reporta', { length: 50 }).notNull(),
    avistadoPorNombre: varchar('avistado_por_nombre', { length: 150 }),
    avistadoPorTelefono: varchar('avistado_por_telefono', { length: 50 }),
    fechaAvistamiento: date('fecha_avistamiento'),
    visitorId: varchar('visitor_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_mascotas_ciudad').on(t.ciudad)],
);

export const centrosAcopio = pgTable(
  'centros_acopio',
  {
    id: serial('id').primaryKey(),
    ciudad: varchar('ciudad', { length: 50 }).notNull().default('manizales'),
    nombre: varchar('nombre', { length: 150 }).notNull(),
    organizacion: varchar('organizacion', { length: 150 }),
    esAcopio: boolean('es_acopio').notNull().default(false),
    esSangre: boolean('es_sangre').notNull().default(false),
    esAlojamiento: boolean('es_alojamiento').notNull().default(false),
    queRecibe: text('que_recibe'),
    imagen: varchar('imagen', { length: 255 }),
    direccion: varchar('direccion', { length: 200 }),
    telefono: varchar('telefono', { length: 50 }),
    horario: varchar('horario', { length: 150 }),
    lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
    lng: numeric('lng', { precision: 10, scale: 7 }).notNull(),
    estado: estadoCentro('estado').notNull().default('abierto'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_centros_ciudad').on(t.ciudad)],
);

export const noticias = pgTable(
  'noticias',
  {
    id: serial('id').primaryKey(),
    // NULL = visible en todas las ciudades
    ciudad: varchar('ciudad', { length: 50 }),
    titulo: varchar('titulo', { length: 200 }).notNull(),
    contenido: text('contenido').notNull(),
    imagen: varchar('imagen', { length: 255 }),
    autor: varchar('autor', { length: 150 }),
    fecha: date('fecha').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_noticias_ciudad').on(t.ciudad)],
);

export const viviendas = pgTable(
  'viviendas',
  {
    id: serial('id').primaryKey(),
    pin: varchar('pin', { length: 10 }),
    ciudad: varchar('ciudad', { length: 50 }).notNull().default('manizales'),
    tipo: tipoVivienda('tipo').notNull().default('gratis'),
    precio: varchar('precio', { length: 100 }),
    capacidad: varchar('capacidad', { length: 100 }),
    tiempoDisponible: varchar('tiempo_disponible', { length: 150 }),
    sectorReferencia: varchar('sector_referencia', { length: 150 }),
    descripcion: text('descripcion'),
    imagen: varchar('imagen', { length: 255 }),
    estado: estadoVivienda('estado').notNull().default('disponible'),
    nombreOfrece: varchar('nombre_ofrece', { length: 150 }).notNull(),
    telefonoOfrece: varchar('telefono_ofrece', { length: 50 }).notNull(),
    interesadoNombre: varchar('interesado_nombre', { length: 150 }),
    interesadoTelefono: varchar('interesado_telefono', { length: 50 }),
    fechaInteres: date('fecha_interes'),
    fecha: date('fecha').notNull(),
    visitorId: varchar('visitor_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_viviendas_ciudad').on(t.ciudad)],
);

export const reportesDanos = pgTable(
  'reportes_danos',
  {
    id: serial('id').primaryKey(),
    radicado: varchar('radicado', { length: 20 }).notNull(),
    ciudad: varchar('ciudad', { length: 50 }).notNull().default('manizales'),
    tipoInmueble: varchar('tipo_inmueble', { length: 50 }).notNull(),
    direccion: varchar('direccion', { length: 200 }).notNull(),
    lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
    lng: numeric('lng', { precision: 10, scale: 7 }).notNull(),
    habitado: habitado('habitado').notNull().default('si'),
    nivelPercibido: nivelDano('nivel_percibido').notNull().default('moderado'),
    descripcion: text('descripcion'),
    imagen: varchar('imagen', { length: 255 }),
    nombreReporta: varchar('nombre_reporta', { length: 150 }).notNull(),
    telefonoReporta: varchar('telefono_reporta', { length: 50 }).notNull(),
    cedulaReporta: varchar('cedula_reporta', { length: 30 }),
    estado: estadoDano('estado').notNull().default('pendiente'),
    fechaVisita: date('fecha_visita'),
    resultadoVisita: varchar('resultado_visita', { length: 150 }),
    notasAdmin: text('notas_admin'),
    fecha: date('fecha').notNull(),
    visitorId: varchar('visitor_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_reportes_danos_radicado').on(t.radicado),
    index('idx_danos_ciudad').on(t.ciudad),
  ],
);

export type Sector = typeof sectores.$inferSelect;
export type Contacto = typeof contactos.$inferSelect;
export type Necesidad = typeof necesidades.$inferSelect;
export type Ofrecimiento = typeof ofrecimientos.$inferSelect;
export type Mascota = typeof mascotasPerdidas.$inferSelect;
export type CentroAcopio = typeof centrosAcopio.$inferSelect;
export type Noticia = typeof noticias.$inferSelect;
export type Vivienda = typeof viviendas.$inferSelect;
export type ReporteDano = typeof reportesDanos.$inferSelect;

// ── Visitas al sitio (analítica anónima sin permisos) ─────────────────────

export const visitas = pgTable(
  'visitas',
  {
    id: serial('id').primaryKey(),
    visitorId: varchar('visitor_id', { length: 64 }).notNull(),
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),
    referrer: text('referrer'),
    path: varchar('path', { length: 200 }),
    ciudad: varchar('ciudad', { length: 50 }),
    lang: varchar('lang', { length: 20 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_visitas_visitor').on(t.visitorId),
    index('idx_visitas_created').on(t.createdAt),
  ],
);

export type Visita = typeof visitas.$inferSelect;

// ── Auditoría (rastro de todas las modificaciones) ───────────────────────────
// Cada create/update/delete de un reporte queda registrado aquí con los datos
// anteriores y posteriores, quién lo hizo (usuario con PIN/radicado, admin con
// su llave del .env, o el sistema) y el código usado.

export const auditoria = pgTable(
  'auditoria',
  {
    id: serial('id').primaryKey(),
    tabla: varchar('tabla', { length: 50 }).notNull(),
    registroId: integer('registro_id').notNull(),
    accion: varchar('accion', { length: 20 }).notNull(),
    datosPrevios: jsonb('datos_previos'),
    datosNuevos: jsonb('datos_nuevos'),
    autor: varchar('autor', { length: 30 }).notNull().default('usuario'),
    codigo: varchar('codigo', { length: 20 }),
    visitorId: varchar('visitor_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_auditoria_tabla_registro').on(t.tabla, t.registroId),
    index('idx_auditoria_created').on(t.createdAt),
  ],
);

export type Auditoria = typeof auditoria.$inferSelect;

// ── Puntos de apoyo (lugares físicos que ofrece la red solidaria) ──────────
// Cada punto tiene dirección, teléfono e imagen; aparece como marcador en el mapa.

export const puntosApoyo = pgTable(
  'puntos_apoyo',
  {
    id: serial('id').primaryKey(),
    pin: varchar('pin', { length: 10 }),
    ciudad: varchar('ciudad', { length: 50 }).notNull().default('manizales'),
    nombre: varchar('nombre', { length: 150 }).notNull(),
    tipo: varchar('tipo', { length: 80 }).notNull().default('Otro'),
    direccion: varchar('direccion', { length: 200 }).notNull(),
    telefono: varchar('telefono', { length: 50 }),
    imagen: varchar('imagen', { length: 255 }),
    color: varchar('color', { length: 20 }).notNull().default('#003893'),
    lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
    lng: numeric('lng', { precision: 10, scale: 7 }).notNull(),
    visitorId: varchar('visitor_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_puntos_apoyo_ciudad').on(t.ciudad)],
);

export type PuntoApoyo = typeof puntosApoyo.$inferSelect;

// ── Eventos (actividades temporales asociadas a un punto de apoyo) ─────────
// Para crearlos se exige el PIN del punto de apoyo al que se asocian.
// El marcador en el mapa se muestra solo mientras el evento esté vigente
// (activo + dentro del período fecha_inicio → fecha_fin).

export const eventos = pgTable(
  'eventos',
  {
    id: serial('id').primaryKey(),
    pin: varchar('pin', { length: 10 }),
    puntoApoyoId: integer('punto_apoyo_id')
      .notNull()
      .references(() => puntosApoyo.id, { onDelete: 'cascade' }),
    titulo: varchar('titulo', { length: 150 }).notNull(),
    descripcion: text('descripcion'),
    lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
    lng: numeric('lng', { precision: 10, scale: 7 }).notNull(),
    direccion: varchar('direccion', { length: 200 }),
    imagenes: text('imagenes').array(),
    evidencias: jsonb('evidencias'),
    activo: boolean('activo').notNull().default(true),
    fechaInicio: timestamp('fecha_inicio', { withTimezone: true }).notNull(),
    fechaFin: timestamp('fecha_fin', { withTimezone: true }),
    visitorId: varchar('visitor_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_eventos_punto').on(t.puntoApoyoId),
    index('idx_eventos_activo').on(t.activo),
  ],
);

export type Evento = typeof eventos.$inferSelect;

// ── Voluntarios (registro de quién va a ayudar a cada reporte) ─────────────
// Cada registro queda asociado a un reporte (tabla + id) y el backend
// actualiza el estado del reporte (responsable / reserva / avistamiento / etc.).

export const voluntarios = pgTable(
  'voluntarios',
  {
    id: serial('id').primaryKey(),
    tabla: varchar('tabla', { length: 30 }).notNull(),
    registroId: integer('registro_id').notNull(),
    nombre: varchar('nombre', { length: 150 }).notNull(),
    telefono: varchar('telefono', { length: 50 }).notNull(),
    mensaje: text('mensaje'),
    visitorId: varchar('visitor_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_voluntarios_tabla_registro').on(t.tabla, t.registroId)],
);

export type Voluntario = typeof voluntarios.$inferSelect;
