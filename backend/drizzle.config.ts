import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres.idiypzqlbjeqgphjlabz:Ju%40n5826227567@aws-0-us-west-2.pooler.supabase.com:6543/redsolidaria_db?pgbouncer=true',
    ssl: process.env.DB_SSL === 'true',
  },
  strict: true,
  verbose: true,
});
