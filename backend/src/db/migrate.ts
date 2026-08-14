import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
import * as path from 'path';
import { poolOptions, resolveDbUrl } from './connection';

/**
 * Aplica las migraciones de Drizzle (carpeta ./drizzle) al arrancar.
 * Idempotente: si ya están aplicadas, no hace nada.
 */
export async function runMigrations(): Promise<void> {
  const pool = new Pool({
    connectionString: resolveDbUrl(),
    ...poolOptions(),
  } as PoolConfig);
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  } finally {
    await pool.end();
  }
}
