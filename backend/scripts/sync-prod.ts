/**
 * sync-prod.ts — Trae TODOS los registros de la base de PRODUCCIÓN (Supabase)
 * a la base LOCAL, sin duplicar: hace UPSERT por id (inserta lo nuevo y
 * actualiza los que ya existen). No borra nada en local.
 *
 * Uso (desde backend/, tras `npm run build`):
 *   node dist/scripts/sync-prod.js [urlDeProduccion]
 *
 * La URL de producción se toma de:
 *   1. argumento CLI, o
 *   2. la variable PROD_DATABASE_URL del .env (se configura una sola vez)
 */
import 'dotenv/config';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
import { poolOptions, resolveDbUrl } from '../src/db/connection';

// Orden respeta las llaves foráneas: sectores → contactos → necesidades → ...
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
  'puntos_apoyo',
  'eventos',
  'voluntarios',
  'visitas',
  'auditoria',
  'clics',
] as const;

const BATCH = 200;

async function main() {
  const prodUrl = process.argv[2] ?? process.env.PROD_DATABASE_URL;
  if (!prodUrl) {
    console.error('✖ Falta la URL de producción. Usa: node dist/scripts/sync-prod.js <url> o configura PROD_DATABASE_URL');
    process.exit(1);
  }

  const prod = new Pool({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
  const local = new Pool({
    connectionString: resolveDbUrl(),
    ...poolOptions(),
  } as PoolConfig);

  console.log('🌐 Conectando a producción (Supabase)...');
  const prodPing = await prod.query('SELECT 1');
  if (!prodPing.rows.length) throw new Error('No se pudo conectar a producción');
  console.log('✅ Producción conectada\n');

  try {
    let totalNuevos = 0;
    let totalActualizados = 0;

    for (const t of TABLES) {
      // Solo tablas que existan en producción (los deploys viejos no tienen las nuevas)
      const ex = await prod.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [t],
      );
      if (!ex.rows.length) {
        console.log(`  · ${t}: no existe en producción, omitida`);
        continue;
      }

      const colsRes = await prod.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [t],
      );
      const cols = colsRes.rows.map((r) => r.column_name as string);
      // Las columnas json/jsonb llegan como valores JS (objeto/array) y node-pg
      // serializaría los arrays como literal de Postgres `{...}` (inválido para
      // jsonb). Aquí se envían como texto JSON válido.
      const jsonCols = new Set(
        colsRes.rows.filter((r) => r.data_type === 'json' || r.data_type === 'jsonb').map((r) => r.column_name as string),
      );
      const idCol = cols.includes('id') ? 'id' : null;
      if (!idCol) {
        console.log(`  · ${t}: sin columna id, omitida`);
        continue;
      }

      const { rows } = await prod.query(`SELECT * FROM "${t}"`);
      if (!rows.length) {
        console.log(`  · ${t}: 0 registros en producción`);
        continue;
      }

      const updatable = cols.filter((c) => c !== idCol);
      const updateSet = updatable.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ');

      let nuevos = 0;
      let actualizados = 0;
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const params: unknown[] = [];
        for (const r of chunk) {
          for (const c of cols) {
            const v = r[c];
            if (v === undefined || v === null) {
              params.push(null);
            } else if (jsonCols.has(c)) {
              params.push(JSON.stringify(v));
            } else {
              params.push(v);
            }
          }
        }
        const insertSql = `INSERT INTO "${t}" (${cols.map((c) => `"${c}"`).join(', ')})
        VALUES ${chunk.map((_, i) => `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(', ')})`).join(', ')}
        ON CONFLICT ("${idCol}") DO UPDATE SET ${updateSet}`;
        // Saber cuáles ya existían (para el conteo de nuevos vs actualizados)
        const ids = chunk.map((r) => r[idCol]);
        const existRes = await local.query(`SELECT "${idCol}" FROM "${t}" WHERE "${idCol}" = ANY($1)`, [ids]);
        const existSet = new Set(existRes.rows.map((r) => String(r[idCol])));
        const nuevosEnChunk = chunk.filter((r) => !existSet.has(String(r[idCol]))).length;

        await local.query(insertSql, params);
        nuevos += nuevosEnChunk;
        actualizados += chunk.length - nuevosEnChunk;
      }

      // Ajusta la secuencia al id máximo
      await local.query(
        `SELECT setval(pg_get_serial_sequence('${t}', '${idCol}'), COALESCE((SELECT MAX("${idCol}") FROM "${t}"), 1))`,
      );

      totalNuevos += nuevos;
      totalActualizados += actualizados;
      console.log(`  ✔ ${t}: ${rows.length} en producción → +${nuevos} nuevos, ${actualizados} actualizados`);
    }

    console.log(`\n✔ Sync completo: ${totalNuevos} nuevos, ${totalActualizados} actualizados en local`);
  } finally {
    await prod.end();
    await local.end();
  }
}

main().catch((e) => {
  console.error('✖ Error en el sync:', e);
  process.exit(1);
});
