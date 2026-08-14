import { Global, Module } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DB = Symbol('DB');
export type Db = NodePgDatabase<typeof schema>;

export function dbUrl(): string {
  return (
    process.env.DATABASE_URL ??
    'postgres://mapa_user:mapa_pass_local@localhost:55432/mapa_necesidades'
  );
}

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: (): Db => drizzle(new Pool({ connectionString: dbUrl() }), { schema }),
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
