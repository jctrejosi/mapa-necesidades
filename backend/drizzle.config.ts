import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://mapa_user:mapa_pass_local@localhost:55432/mapa_necesidades',
  },
  strict: true,
  verbose: true,
});
