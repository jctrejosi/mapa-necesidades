/**
 * Resolución de la conexión a PostgreSQL (Supabase).
 *
 * El host directo de Supabase (`db.<ref>.supabase.co`) solo expone IPv6 en la
 * mayoría de los entornos y falla con ENETUNREACH/ENOTFOUND en despliegues sin
 * salida IPv6 (Render, Vercel, etc.). Por eso la conexión se hace vía el
 * pooler (`aws-0-<region>.pooler.supabase.com`), que sí tiene IPv4.
 *
 * `resolveDbUrl()` escribe automáticamente la URL si apunta al host directo,
 * para que el backend arranque sin importar qué cadena de conexión se haya
 * copiado del dashboard de Supabase.
 */

import * as net from 'net';

// Node 20+ activa Happy Eyeballs (autoSelectFamily) por defecto e ignora
// `family` en net.connect, intentando IPv6 e IPv4 a la vez. El pooler de
// Supabase solo nos interesa por IPv4: desactivamos el auto-familia para que
// `family: 4` del pool se respete (sin ruido ENETUNREACH de IPv6).
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  net.setDefaultAutoSelectFamily(false);
}

const DEFAULT_DATABASE_URL =
  'postgresql://postgres.idiypzqlbjeqgphjlabz:Ju%40n5826227567@aws-0-us-west-2.pooler.supabase.com:6543/redsolidaria_db?pgbouncer=true';

/** Pooler IPv4 del proyecto (región us-west-2). */
const POOLER_HOST = 'aws-0-us-west-2.pooler.supabase.com';
const POOLER_PORT = 6543;
const TARGET_DB = 'redsolidaria_db';

/** ¿Es el host directo de Supabase (db.<ref>.supabase.co)? */
function isDirectSupabaseHost(host: string): boolean {
  return /^db\.[a-z0-9]+\.supabase\.co$/i.test(host);
}

export function dbUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

/**
 * URL final de conexión:
 * - Si no hay `DATABASE_URL`, usa el pooler por defecto (IPv4).
 * - Si `DATABASE_URL` apunta al host directo de Supabase, la reescribe al
 *   pooler (host, puerto, usuario `postgres.<ref>` y db) para garantizar IPv4.
 */
export function resolveDbUrl(): string {
  const provided = dbUrl();
  try {
    const u = new URL(provided);
    if (isDirectSupabaseHost(u.hostname)) {
      const ref = u.hostname.split('.')[1];
      u.hostname = POOLER_HOST;
      u.port = String(POOLER_PORT);
      if (u.username === 'postgres') u.username = `postgres.${ref}`;
      if (u.pathname === '/' || u.pathname === '/postgres') u.pathname = `/${TARGET_DB}`;
      u.searchParams.set('pgbouncer', 'true');
      return u.toString();
    }
  } catch {
    /* URL inválida: se deja tal cual y el error será claro */
  }
  return provided;
}

/** Opciones del Pool: forzar IPv4, SSL y timeout de conexión acotado. */
export function poolOptions(): { family?: number; connectionTimeoutMillis?: number; ssl?: { rejectUnauthorized: boolean } } {
  return {
    family: 4,
    connectionTimeoutMillis: 8000,
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}
