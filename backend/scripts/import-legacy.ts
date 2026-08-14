/**
 * import-legacy.ts — Migra los datos del dump MySQL/MariaDB de producción
 * (backups/mapanece_mapa-necesidades.sql) a la nueva base PostgreSQL.
 *
 * Uso (desde backend/, tras `npm run build`):
 *   node dist/scripts/import-legacy.js [ruta/del/dump.sql]
 *
 * Idempotente: trunca las 9 tablas y reimporta, conservando ids y
 * fijando las secuencias al final. Los archivos de imagen referenciados
 * (uploads/img_*.jpg de producción) deben copiarse aparte a UPLOAD_DIR.
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import {
  centrosAcopio,
  contactos,
  mascotasPerdidas,
  necesidades,
  noticias,
  ofrecimientos,
  reportesDanos,
  sectores,
  viviendas,
} from '../src/db/schema';

const TABLES = [
  'sectores',
  'contactos',
  'necesidades',
  'ofrecimientos',
  'mascotas_perdidas',
  'centros_acopio',
  'noticias',
  'viviendas',
  'reportes_danos',
] as const;

// Conteos esperados del dump (para validar la migración)
const EXPECTED: Record<string, number> = {
  sectores: 22,
  contactos: 21,
  necesidades: 20,
  ofrecimientos: 19,
  mascotas_perdidas: 1,
  centros_acopio: 6,
  noticias: 1,
  viviendas: 0,
  reportes_danos: 14,
};

type Cell = string | number | boolean | null;
type Row = Record<string, Cell>;

/** Desescapa una cadena de un dump phpMyAdmin. */
function unescapeSql(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < s.length) {
      const next = s[++i];
      if (next === 'n') out += '\n';
      else if (next === 'r') out += '\r';
      else if (next === 't') out += '\t';
      else if (next === '0') out += '\0';
      else out += next; // \\ \' \"
    } else if (ch === "'" && s[i + 1] === "'") {
      out += "'";
      i++;
    } else {
      out += ch;
    }
  }
  return out;
}

function parseValue(v: string): Cell {
  const t = v.trim();
  if (t === 'NULL') return null;
  if (t.startsWith("'")) return unescapeSql(t.slice(1, -1));
  const n = Number(t);
  return Number.isFinite(n) ? n : t;
}

/** Divide por un separador ignorando comas/parens dentro de strings SQL. */
function splitTop(s: string, sep: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      cur += ch;
      if (ch === '\\' && i + 1 < s.length) {
        cur += s[++i];
      } else if (ch === "'") {
        if (s[i + 1] === "'") {
          cur += "'";
          i++;
        } else {
          inStr = false;
        }
      }
    } else if (ch === "'") {
      inStr = true;
      cur += ch;
    } else if (ch === sep) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts;
}

/** Extrae todas las filas de los INSERT de una tabla en el dump. */
function extractRows(sqlText: string, table: string): { cols: string[]; rows: Row[] } {
  const re = new RegExp('INSERT INTO `' + table + '` \\(([^)]*)\\) VALUES\\s*(.+?);', 'gs');
  const cols: string[] = [];
  const rows: Row[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sqlText)) !== null) {
    const colsNow = m[1]
      .split(',')
      .map((c) => c.replace(/`/g, '').trim());
    if (!cols.length) cols.push(...colsNow);

    // El cuerpo contiene filas "(...),(...)" separadas por "),("
    const body = m[2].replace(/,\s*$/, '');
    const rawRows = body
      .split(/\),\s*\(/)
      .map((r) => r.replace(/^\(/, '').replace(/\)$/, '').trim());
    for (const raw of rawRows) {
      const values = splitTop(raw, ',').map(parseValue);
      const row: Row = {};
      colsNow.forEach((c, i) => (row[c] = values[i] ?? null));
      rows.push(row);
    }
  }
  return { cols, rows };
}

const str = (v: Cell): string | null => (typeof v === 'string' && v.length ? v : null);
const num = (v: Cell): string => String(v ?? 0);
const int = (v: Cell): number => Number(v ?? 0);
const bool = (v: Cell): boolean => Number(v ?? 0) === 1;
const ts = (v: Cell): Date | undefined =>
  typeof v === 'string' && v ? new Date(v.replace(' ', 'T') + 'Z') : undefined;

/** Convierte una fila del dump a la forma que espera Drizzle. */
function mapRow(table: string, r: Row): Record<string, unknown> {
  const base = { id: int(r['id']) };
  switch (table) {
    case 'sectores':
      return {
        ...base,
        ciudad: str(r['ciudad']) ?? 'manizales',
        nombre: str(r['nombre']) ?? '',
        barrio: str(r['barrio']),
        lat: num(r['lat']),
        lng: num(r['lng']),
        descripcion: str(r['descripcion']),
        nivelAfectacion: str(r['nivel_afectacion']) ?? 'moderado',
        estado: str(r['estado']) ?? 'activo',
        createdAt: ts(r['created_at']),
      };
    case 'contactos':
      return {
        ...base,
        sectorId: int(r['sector_id']),
        nombre: str(r['nombre']) ?? '',
        telefono: str(r['telefono']),
        rol: str(r['rol']),
        createdAt: ts(r['created_at']),
      };
    case 'necesidades':
      return {
        ...base,
        pin: str(r['pin']),
        sectorId: int(r['sector_id']),
        tipo: str(r['tipo']) ?? '',
        descripcion: str(r['descripcion']),
        imagen: str(r['imagen']),
        fecha: str(r['fecha']) ?? '2026-08-10',
        cantidad: str(r['cantidad']),
        prioridad: str(r['prioridad']) ?? 'media',
        estado: str(r['estado']) ?? 'requiere',
        responsableNombre: str(r['responsable_nombre']),
        responsableTelefono: str(r['responsable_telefono']),
        fechaCompromiso: str(r['fecha_compromiso']),
        reportadoPor: str(r['reportado_por']),
        telefonoReporta: str(r['telefono_reporta']),
        createdAt: ts(r['created_at']),
      };
    case 'ofrecimientos':
      return {
        ...base,
        pin: str(r['pin']),
        ciudad: str(r['ciudad']) ?? 'manizales',
        tipo: str(r['tipo']) ?? '',
        descripcion: str(r['descripcion']),
        imagen: str(r['imagen']),
        cantidad: str(r['cantidad']),
        fecha: str(r['fecha']) ?? '2026-08-10',
        nombreOfrece: str(r['nombre_ofrece']) ?? '',
        telefonoOfrece: str(r['telefono_ofrece']),
        estado: str(r['estado']) ?? 'disponible',
        reservadoPorNombre: str(r['reservado_por_nombre']),
        reservadoPorTelefono: str(r['reservado_por_telefono']),
        fechaReserva: str(r['fecha_reserva']),
        createdAt: ts(r['created_at']),
      };
    case 'mascotas_perdidas':
      return {
        ...base,
        pin: str(r['pin']),
        ciudad: str(r['ciudad']) ?? 'manizales',
        nombreMascota: str(r['nombre_mascota']),
        tipoAnimal: str(r['tipo_animal']) ?? '',
        senas: str(r['senas']),
        imagen: str(r['imagen']),
        lat: num(r['lat']),
        lng: num(r['lng']),
        lugarVisto: str(r['lugar_visto']),
        fechaVisto: str(r['fecha_visto']) ?? '2026-08-10',
        estado: str(r['estado']) ?? 'perdido',
        nombreReporta: str(r['nombre_reporta']) ?? '',
        telefonoReporta: str(r['telefono_reporta']) ?? '',
        avistadoPorNombre: str(r['avistado_por_nombre']),
        avistadoPorTelefono: str(r['avistado_por_telefono']),
        fechaAvistamiento: str(r['fecha_avistamiento']),
        createdAt: ts(r['created_at']),
      };
    case 'centros_acopio':
      return {
        ...base,
        ciudad: str(r['ciudad']) ?? 'manizales',
        nombre: str(r['nombre']) ?? '',
        organizacion: str(r['organizacion']),
        esAcopio: bool(r['es_acopio']),
        esSangre: bool(r['es_sangre']),
        esAlojamiento: bool(r['es_alojamiento']),
        queRecibe: str(r['que_recibe']),
        imagen: str(r['imagen']),
        direccion: str(r['direccion']),
        telefono: str(r['telefono']),
        horario: str(r['horario']),
        lat: num(r['lat']),
        lng: num(r['lng']),
        estado: str(r['estado']) ?? 'abierto',
        createdAt: ts(r['created_at']),
      };
    case 'noticias':
      return {
        ...base,
        ciudad: str(r['ciudad']),
        titulo: str(r['titulo']) ?? '',
        contenido: str(r['contenido']) ?? '',
        imagen: str(r['imagen']),
        autor: str(r['autor']),
        fecha: str(r['fecha']) ?? '2026-08-10',
        createdAt: ts(r['created_at']),
      };
    case 'viviendas':
      return {
        ...base,
        pin: str(r['pin']),
        ciudad: str(r['ciudad']) ?? 'manizales',
        tipo: str(r['tipo']) ?? 'gratis',
        precio: str(r['precio']),
        capacidad: str(r['capacidad']),
        tiempoDisponible: str(r['tiempo_disponible']),
        sectorReferencia: str(r['sector_referencia']),
        descripcion: str(r['descripcion']),
        imagen: str(r['imagen']),
        estado: str(r['estado']) ?? 'disponible',
        nombreOfrece: str(r['nombre_ofrece']) ?? '',
        telefonoOfrece: str(r['telefono_ofrece']) ?? '',
        interesadoNombre: str(r['interesado_nombre']),
        interesadoTelefono: str(r['interesado_telefono']),
        fechaInteres: str(r['fecha_interes']),
        fecha: str(r['fecha']) ?? '2026-08-10',
        createdAt: ts(r['created_at']),
      };
    case 'reportes_danos':
      return {
        ...base,
        radicado: str(r['radicado']) ?? '',
        ciudad: str(r['ciudad']) ?? 'manizales',
        tipoInmueble: str(r['tipo_inmueble']) ?? '',
        direccion: str(r['direccion']) ?? '',
        lat: num(r['lat']),
        lng: num(r['lng']),
        habitado: str(r['habitado']) ?? 'si',
        nivelPercibido: str(r['nivel_percibido']) ?? 'moderado',
        descripcion: str(r['descripcion']),
        imagen: str(r['imagen']),
        nombreReporta: str(r['nombre_reporta']) ?? '',
        telefonoReporta: str(r['telefono_reporta']) ?? '',
        cedulaReporta: str(r['cedula_reporta']),
        estado: str(r['estado']) ?? 'pendiente',
        fechaVisita: str(r['fecha_visita']),
        resultadoVisita: str(r['resultado_visita']),
        notasAdmin: str(r['notas_admin']),
        fecha: str(r['fecha']) ?? '2026-08-10',
        createdAt: ts(r['created_at']),
      };
    default:
      return base;
  }
}

const tableOf = (t: string) => {
  switch (t) {
    case 'sectores': return sectores;
    case 'contactos': return contactos;
    case 'necesidades': return necesidades;
    case 'ofrecimientos': return ofrecimientos;
    case 'mascotas_perdidas': return mascotasPerdidas;
    case 'centros_acopio': return centrosAcopio;
    case 'noticias': return noticias;
    case 'viviendas': return viviendas;
    case 'reportes_danos': return reportesDanos;
    default: return null;
  }
};

async function main() {
  const dumpArg = process.argv[2];
  const candidates = [
    dumpArg,
    process.env.LEGACY_DUMP,
    path.resolve(process.cwd(), 'legacy-backups', 'mapanece_mapa-necesidades.sql'),
    path.resolve(process.cwd(), '..', 'backups', 'mapanece_mapa-necesidades.sql'),
  ].filter(Boolean) as string[];
  const dumpPath = candidates.find((p) => fs.existsSync(p));
  if (!dumpPath) {
    console.error('✖ No se encontró el dump. Pasa la ruta: node dist/scripts/import-legacy.js <dump.sql>');
    process.exit(1);
  }
  console.log(`✔ Dump: ${dumpPath}`);

  const url =
    process.env.DATABASE_URL ??
    'postgresql://postgres.idiypzqlbjeqgphjlabz:Ju%40n5826227567@aws-0-us-west-2.pooler.supabase.com:6543/redsolidaria_db?pgbouncer=true';
  const pool = new Pool({
    connectionString: url,
    family: 4, // IPv4: el pooler de Supabase no expone IPv6 en este entorno
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  } as PoolConfig);
  const db = drizzle(pool);
  const sqlText = fs.readFileSync(dumpPath, 'utf8');

  try {
    // 1) Limpiar (idempotente)
    await db.execute(sql.raw(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`));

    // 2) Insertar en orden de dependencias
    for (const t of TABLES) {
      const { rows } = extractRows(sqlText, t);
      if (!rows.length) {
        console.log(`  - ${t}: 0 filas (tabla vacía en el dump)`);
        continue;
      }
      const target = tableOf(t);
      if (!target) continue;
      const mapped = rows.map((r) => mapRow(t, r));
      await db.insert(target as never).values(mapped as never[]);
      console.log(`  ✔ ${t}: ${rows.length} filas importadas`);
    }

    // 3) Fijar secuencias al id máximo de cada tabla
    for (const t of TABLES) {
      await db.execute(
        sql.raw(
          `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1))`,
        ),
      );
    }
    console.log('  ✔ Secuencias actualizadas');

    // 4) Validación de conteos
    console.log('\nValidación:');
    let ok = true;
    for (const t of TABLES) {
      const res = await db.execute(sql.raw(`SELECT count(*)::int AS n FROM ${t}`));
      const n = Number(res.rows[0]?.['n'] ?? 0);
      const esperado = EXPECTED[t];
      const status = n === esperado ? '✔' : '✖';
      if (n !== esperado) ok = false;
      console.log(`  ${status} ${t}: ${n} filas (esperado ${esperado})`);
    }

    console.log(ok ? '\n✔ Migración completa' : '\n✖ Hay diferencias con los conteos esperados');
    if (!ok) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('✖ Error en la migración:', e);
  process.exit(1);
});
