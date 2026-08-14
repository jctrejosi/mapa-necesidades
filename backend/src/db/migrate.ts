import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as path from 'path';

/**
 * Aplica las migraciones de Drizzle (carpeta ./drizzle) al arrancar.
 * Idempotente: si ya están aplicadas, no hace nada.
 */
export async function runMigrations(): Promise<void> {
  const url =
    process.env.DATABASE_URL ??
    'postgres://mapa_user:mapa_pass_local@localhost:55432/mapa_necesidades';
  const pool = new Pool({ connectionString: url });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  } finally {
    await pool.end();
  }
}
