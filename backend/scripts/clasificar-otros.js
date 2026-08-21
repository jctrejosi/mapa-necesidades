/**
 * clasificar-otros.js — Reclasifica las necesidades con tipo 'Otro' usando
 * la API de DeepSeek, leyendo la DESCRIPCIÓN de cada reporte.
 *
 * Resultado:
 *   - Escribe backend/scripts/clasificacion-otros-resultado.json con
 *     { id, tipo_anterior, tipo_nuevo, descripcion } de cada reporte.
 *   - (salvo --dry-run) Actualiza la tabla `necesidades` LOCAL con el nuevo tipo.
 *
 * Uso (desde la raíz del repo):
 *   node backend/scripts/clasificar-otros.js          # clasifica y actualiza local
 *   node backend/scripts/clasificar-otros.js --dry-run # solo clasifica, no toca BD
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const CATEGORIAS = [
  'Comida y agua',
  'Servicios médicos',
  'Atención psicosocial',
  'Mascotas',
  'Transporte',
  'Voluntariado',
  'Refugio y abrigo',
  'Escombros',
  'Maquinaria y rescate',
  'Otro',
];

const SYSTEM_PROMPT = `Eres un clasificador de reportes de necesidades de una plataforma solidaria de ayuda tras un sismo en Colombia.
Debes clasificar cada reporte en EXACTAMENTE una de estas categorías:

- "Comida y agua": alimentos, bebidas, agua, insumos de cocina, productos de aseo/higiene básicos (pañales, jabón) cuando se piden junto a comida.
- "Servicios médicos": medicamentos, atención médica, salud, hospital, discapacidad, oncología, enfermería.
- "Atención psicosocial": apoyo emocional o psicológico, acompañamiento, salud mental.
- "Mascotas": alimento, refugio o atención para animales.
- "Transporte": vehículos, combustible, traslados, mudanzas/trasteos con vehículo.
- "Voluntariado": pedir personas/manos para ayudar, desalojar, jornadas de voluntarios.
- "Refugio y abrigo": alojamiento, vivienda, arriendo, albergue, local comercial, ropa, cobijas, lonas.
- "Escombros": retiro, recogida o remoción de escombros, cascajo, derrumbes, palear o limpiar escombros.
- "Maquinaria y rescate": materiales de construcción (cemento, tejas, varillas, ladrillos), herramientas, maquinaria, reparación o revisión estructural.
- "Otro": SOLO si de verdad no corresponde a ninguna de las anteriores.

Reglas:
- Elige la categoría MÁS específica y dominante de la descripción.
- Si menciona varias cosas, quédate con la principal.
- Devuelve ÚNICAMENTE un objeto JSON válido, sin texto adicional, con el formato exacto:
{"tipo":"<categoría>"}`;

// ── Utilidades de entorno ──────────────────────────────────────────────
function loadEnv(file) {
  const out = {};
  try {
    const txt = fs.readFileSync(file, 'utf8');
    for (const line of txt.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[k] = v;
    }
  } catch { /* archivo opcional */ }
  return out;
}

const ROOT = path.join(__dirname, '..', '..');
const backendEnv = loadEnv(path.join(__dirname, '..', '.env'));
const botEnv = loadEnv(path.join(ROOT, 'bot', '.env'));

const DATABASE_URL = backendEnv.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/redsolidaria';
const PROD_DATABASE_URL = backendEnv.PROD_DATABASE_URL || '';
const API_KEY = botEnv.DEEPSEEK_API_KEY_BOT || process.env.DEEPSEEK_API_KEY_BOT || '';
const MODEL = botEnv.DEEPSEEK_MODEL || 'deepseek-chat';
const API_URL = (botEnv.DEEPSEEK_API_URL || 'https://api.deepseek.com') + '/chat/completions';

const DRY_RUN = process.argv.includes('--dry-run');
const OUT_FILE = path.join(__dirname, 'clasificacion-otros-resultado.json');

async function classify(descripcion, cantidad) {
  const user = `Descripción del reporte: ${descripcion || '(sin descripción)'}${cantidad ? `\nCantidad: ${cantidad}` : ''}\n\nClasifícalo en una de las categorías.`;
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: user },
    ],
    temperature: 0,
    max_tokens: 60,
    response_format: { type: 'json_object' },
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = (data?.choices?.[0]?.message?.content || '').trim();
      // Extrae el primer objeto JSON del contenido
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error(`No JSON en respuesta: ${content.slice(0, 120)}`);
      const parsed = JSON.parse(m[0]);
      const tipo = String(parsed.tipo || '').trim();
      if (!CATEGORIAS.includes(tipo)) throw new Error(`Categoría inválida: "${tipo}"`);
      return tipo;
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(500 * attempt);
    }
  }
  throw new Error('No clasificable');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Aplica el JSON de resultados (ya revisado) a la base de datos indicada. */
async function applyFromFile(prod = false) {
  const connectionString = prod ? PROD_DATABASE_URL : DATABASE_URL;
  if (prod && !connectionString) {
    console.error('✖ No se encontró PROD_DATABASE_URL en backend/.env');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString,
    ssl: prod ? { rejectUnauthorized: false } : (process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined),
  });
  const data = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  let cambiadas = 0;
  for (const r of data) {
    if (!r.id || !r.tipo_nuevo || !CATEGORIAS.includes(r.tipo_nuevo)) continue;
    if (r.tipo_nuevo === r.tipo_anterior) continue;
    const res = await pool.query(`UPDATE necesidades SET tipo = $1 WHERE id = $2 AND tipo = 'Otro'`, [r.tipo_nuevo, r.id]);
    if (res.rowCount > 0) cambiadas++;
  }
  await pool.end();
  console.log(`✔ Aplicado: ${cambiadas} cambios de tipo en la base ${prod ? 'PRODUCCIÓN' : 'LOCAL'} (desde ${path.basename(OUT_FILE)}).`);
}

async function main() {
  if (process.argv.includes('--apply')) {
    await applyFromFile(process.argv.includes('--prod'));
    return;
  }

  if (!API_KEY) {
    console.error('✖ No se encontró DEEPSEEK_API_KEY_BOT (revisa bot/.env)');
    process.exit(1);
  }

  console.log(`🔍 Modo: ${DRY_RUN ? 'DRY-RUN (solo clasifica, no actualiza BD)' : 'NORMAL (clasifica y actualiza BD local)'}`);
  console.log(`   Modelo: ${MODEL}\n`);

  const pool = new Pool({ connectionString: DATABASE_URL, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined });

  const { rows } = await pool.query(
    `SELECT id, tipo, descripcion, cantidad FROM necesidades WHERE tipo = 'Otro' ORDER BY id`,
  );
  console.log(`📋 ${rows.length} necesidades con tipo 'Otro' para clasificar.\n`);

  const resultados = [];
  let cambiadas = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const desc = r.descripcion || '';
    try {
      const nuevo = await classify(desc, r.cantidad);
      resultados.push({ id: r.id, tipo_anterior: r.tipo, tipo_nuevo: nuevo, descripcion: desc });
      const cambia = nuevo !== r.tipo;
      if (cambia) cambiadas++;
      console.log(`  ${String(i + 1).padStart(2)}/${rows.length} · id ${r.id} · "${(desc || '').replace(/\s+/g, ' ').slice(0, 55)}" → ${nuevo}${cambia ? '' : ' (sin cambio)'}`);
      if (!DRY_RUN && cambia) {
        await pool.query(`UPDATE necesidades SET tipo = $1 WHERE id = $2`, [nuevo, r.id]);
      }
    } catch (e) {
      resultados.push({ id: r.id, tipo_anterior: r.tipo, tipo_nuevo: null, error: String(e.message || e), descripcion: desc });
      console.log(`  ${String(i + 1).padStart(2)}/${rows.length} · id ${r.id} · ERROR: ${e.message || e}`);
    }
    // Ritmo suave para no saturar la API
    await sleep(120);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(resultados, null, 2), 'utf8');
  await pool.end();

  const conTipo = resultados.filter((x) => x.tipo_nuevo && CATEGORIAS.includes(x.tipo_nuevo));
  console.log(`\n✔ Guardado registro en: ${path.relative(process.cwd(), OUT_FILE)}`);
  console.log(`✔ Clasificados: ${conTipo.length} · con cambio de tipo: ${cambiadas} · errores: ${resultados.filter((x) => x.error).length}`);
  if (DRY_RUN) console.log('ℹ️ Modo dry-run: NO se actualizó la base de datos.');
}

main().catch((e) => {
  console.error('✖ Error:', e);
  process.exit(1);
});
