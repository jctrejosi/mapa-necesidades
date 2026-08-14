import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
import * as path from 'path';

/**
 * Aplica las migraciones de Drizzle (carpeta ./drizzle) al arrancar.
 * Idempotente: si ya están aplicadas, no hace nada.
 */
export async function runMigrations(): Promise<void> {
  const url =
    process.env.DATABASE_URL ??
    'postgresql://postgres.idiypzqlbjeqgphjlabz:Ju%40n5826227567@aws-0-us-west-2.pooler.supabase.com:6543/redsolidaria_db?pgbouncer=true';
  const pool = new Pool({
    connectionString: url,
    family: 4, // IPv4: el pooler de Supabase no expone IPv6 en este entorno
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  } as PoolConfig);
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  } finally {
    await pool.end();
  }
}
