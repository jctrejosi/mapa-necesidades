/** Compara conteos por ciudad entre producción y local (no imprime la URL ni datos sensibles). */
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '..', 'backend', '.env');
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const { Pool } = require('pg');
const PROD_URL = env.PROD_DATABASE_URL;
const LOCAL_URL = env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/redsolidaria';

const TABLES = ['sectores', 'contactos', 'necesidades', 'ofrecimientos', 'mascotas_perdidas', 'centros_acopio', 'noticias', 'viviendas', 'reportes_danos', 'puntos_apoyo', 'eventos', 'voluntarios', 'visitas', 'auditoria'];

(async () => {
  const prod = new Pool({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  const local = new Pool({ connectionString: LOCAL_URL });

  console.log('== Conteos por tabla: prod vs local ==');
  for (const t of TABLES) {
    try {
      const [p, l] = await Promise.all([
        prod.query(`SELECT count(*) AS n FROM "${t}"`),
        local.query(`SELECT count(*) AS n FROM "${t}"`),
      ]);
      const a = Number(p.rows[0].n), b = Number(l.rows[0].n);
      console.log(`${t.padEnd(18)} prod=${String(a).padStart(5)} local=${String(b).padStart(5)} ${a !== b ? '  <-- DIFERENTE' : ''}`);
    } catch (e) { console.log(`${t}: error ${e.message.slice(0, 60)}`); }
  }

  console.log('\n== sectores por ciudad: prod vs local ==');
  const ps = (await prod.query(`SELECT ciudad, count(*) AS n FROM sectores GROUP BY ciudad ORDER BY ciudad`)).rows;
  const ls = (await local.query(`SELECT ciudad, count(*) AS n FROM sectores GROUP BY ciudad ORDER BY ciudad`)).rows;
  const all = new Set([...ps.map(r => r.ciudad), ...ls.map(r => r.ciudad)]);
  for (const c of [...all].sort()) {
    const p = ps.find(r => r.ciudad === c)?.n ?? 0;
    const l = ls.find(r => r.ciudad === c)?.n ?? 0;
    console.log(`  ${String(c).padEnd(12)} prod=${String(p).padStart(4)} local=${String(l).padStart(4)} ${p !== l ? '  <-- DIFERENTE' : ''}`);
  }

  await prod.end();
  await local.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
