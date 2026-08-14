import { Global, Module } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DB = Symbol('DB');
export type Db = NodePgDatabase<typeof schema>;

export function dbUrl(): string {
  return (
    process.env.DATABASE_URL ??
    'postgresql://postgres.idiypzqlbjeqgphjlabz:Ju%40n5826227567@aws-0-us-west-2.pooler.supabase.com:6543/redsolidaria_db?pgbouncer=true'
  );
}

/** Opciones de conexión: SSL cuando se apunta a Supabase (DB_SSL=true). */
export function poolOptions(): { family?: number; ssl?: { rejectUnauthorized: boolean } } {
  return {
    family: 4,
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: (): Db =>
        drizzle(new Pool({ connectionString: dbUrl(), ...poolOptions() }), { schema }),
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
