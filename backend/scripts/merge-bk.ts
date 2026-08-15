/**
 * merge-bk.ts — Importa registros de un dump MySQL/MariaDB SIN duplicar los
 * que ya existen en la base (dedupe por id; en reportes_danos también por
 * radicado). No borra nada: solo inserta lo nuevo y fija las secuencias.
 *
 * Uso (desde backend/, tras `npm run build`):
 *   node dist/scripts/merge-bk.js <ruta/del/dump.sql>
 *
 * Ejemplo: node dist/scripts/merge-bk.js ../db/bk.sql
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
import * as fs from 'fs';
import { poolOptions, resolveDbUrl } from '../src/db/connection';
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
      else out += next;
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
  const dumpPath = process.argv[2];
  if (!dumpPath || !fs.existsSync(dumpPath)) {
    console.error('✖ Pasa la ruta del dump: node dist/scripts/merge-bk.js <dump.sql>');
    process.exit(1);
  }
  console.log(`✔ Dump: ${dumpPath}`);

  const pool = new Pool({
    connectionString: resolveDbUrl(),
    ...poolOptions(),
  } as PoolConfig);
  const db = drizzle(pool);
  const sqlText = fs.readFileSync(dumpPath, 'utf8');

  try {
    let totalInserted = 0;
    let totalSkipped = 0;

    for (const t of TABLES) {
      const { rows } = extractRows(sqlText, t);
      if (!rows.length) {
        console.log(`  · ${t}: 0 filas en el dump`);
        continue;
      }
      const target = tableOf(t);
      if (!target) continue;

      // Ids existentes en la BD destino
      const existingRes = await db.execute(sql.raw(`SELECT id FROM ${t}`));
      const existingIds = new Set<number>(existingRes.rows.map((r) => Number(r['id'])));

      // En reportes_danos también se evita duplicar por radicado
      let radicados = new Set<string>();
      if (t === 'reportes_danos') {
        const rres = await db.execute(sql.raw(`SELECT radicado FROM reportes_danos`));
        radicados = new Set<string>(rres.rows.map((r) => String(r['radicado'])));
      }

      const toInsert = rows.filter((r) => {
        if (existingIds.has(int(r['id']))) return false;
        if (t === 'reportes_danos' && radicados.has(str(r['radicado']) ?? '')) return false;
        return true;
      });
      const skipped = rows.length - toInsert.length;

      if (toInsert.length) {
        const mapped = toInsert.map((r) => mapRow(t, r));
        await db.insert(target as never).values(mapped as never[]);
      }
      totalInserted += toInsert.length;
      totalSkipped += skipped;
      console.log(
        `  ${toInsert.length ? '✔' : '·'} ${t}: +${toInsert.length} nuevas, ${skipped} ya existían (omitidas)`,
      );
    }

    // Fijar secuencias al id máximo de cada tabla
    for (const t of TABLES) {
      await db.execute(
        sql.raw(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1))`),
      );
    }
    console.log('  ✔ Secuencias actualizadas');

    console.log(`\n✔ Merge completo: ${totalInserted} insertadas, ${totalSkipped} omitidas (ya existían)`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('✖ Error en el merge:', e);
  process.exit(1);
});
