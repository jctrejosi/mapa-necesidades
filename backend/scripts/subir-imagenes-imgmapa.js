/**
 * subir-imagenes-imgmapa.js — Sube a Cloudinary las imágenes de img-mapa/ que
 * tienen registro asociado (mapeo según backups/bk.sql) y actualiza la columna
 * `imagen` en la BD LOCAL y en PRODUCCIÓN con la URL de Cloudinary.
 *
 * Uso (desde la raíz): node backend/scripts/subir-imagenes-imgmapa.js
 * Opciones: --local-only  (no toca producción)
 */
const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const { Pool } = require('pg');

// ── Carga backend/.env ──
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
  } catch {}
  return out;
}

const env = loadEnv(path.join(__dirname, '..', '.env'));
const LOCAL = env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/redsolidaria';
const PROD = env.PROD_DATABASE_URL || '';
const LOCAL_ONLY = process.argv.includes('--local-only');

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});
if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
  console.error('✖ Faltan credenciales de Cloudinary en backend/.env');
  process.exit(1);
}

const IMGDIR = path.join(__dirname, '..', '..', 'img-mapa');

// ── Mapeo: archivo → { tabla, id } (según backups/bk.sql) ──
const MAPEO = [
  ['img_6a7e0ffdb48001.58580107.jpg', 'necesidades', 1],
  ['img_6a7e56c1522260.83136301.jpg', 'necesidades', 18],
  ['img_6a7f4cfbc03a85.48434444.jpg', 'necesidades', 21],
  ['img_6a7f5443ce5aa1.49853045.jpg', 'necesidades', 22],
  ['img_6a7fc5415e3cf9.03889688.jpg', 'necesidades', 77],
  ['img_6a7e2bba688af9.92587874.jpg', 'ofrecimientos', 10],
  ['img_6a7e4b4385a033.14378964.jpg', 'ofrecimientos', 12],
  ['img_6a7e4be59bd186.64878390.jpg', 'ofrecimientos', 13],
  ['img_6a7deb78aa5bf6.05828571.jpg', 'ofrecimientos', 56],
  ['img_6a8099028636f6.29817347.jpg', 'ofrecimientos', 63],
  ['img_6a7e147e4197f8.59388331.jpg', 'mascotas_perdidas', 1],
  ['img_6a7f54171c4ac0.55065377.jpg', 'mascotas_perdidas', 2],
  ['img_6a7fcca8362928.68969953.jpg', 'mascotas_perdidas', 3],
  ['img_6a80b0df7ec656.50502822.jpg', 'mascotas_perdidas', 4],
  ['img_6a7e2c38ef9044.93280423.jpg', 'centros_acopio', 1],
  ['img_6a7e2322b37e25.49023414.jpg', 'centros_acopio', 2],
  ['img_6a7e2dbe149939.17449957.jpg', 'centros_acopio', 3],
  ['img_6a7e7ce219d400.38183488.jpg', 'centros_acopio', 5],
  ['img_6a7e7d50218955.01035113.jpg', 'centros_acopio', 6],
  ['img_6a7f012218e957.21757128.jpg', 'reportes_danos', 4],
  ['img_6a7f156fb5bfb6.55216094.jpg', 'reportes_danos', 6],
  ['img_6a7f2f1c408126.21436767.jpg', 'reportes_danos', 14],
  ['img_6a7f34271feee8.58338127.jpg', 'reportes_danos', 15],
  ['img_6a7f3911278af8.59219272.jpg', 'reportes_danos', 16],
  ['img_6a7f4ad064a176.91982855.jpg', 'reportes_danos', 17],
  ['img_6a7f59efbf4426.47305307.jpg', 'reportes_danos', 18],
  ['img_6a7f8b15895e58.58563478.jpg', 'reportes_danos', 20],
  ['img_6a807ee5b51999.46748416.jpg', 'reportes_danos', 24],
  ['img_6a7e1b510f1639.94066218.jpg', 'noticias', 1],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`📦 ${MAPEO.length} imágenes por subir a Cloudinary y actualizar en ${LOCAL_ONLY ? 'LOCAL (solo)' : 'LOCAL + PRODUCCIÓN'}\n`);

  const local = new Pool({ connectionString: LOCAL });
  const prod = PROD && !LOCAL_ONLY ? new Pool({ connectionString: PROD, ssl: { rejectUnauthorized: false } }) : null;

  let subidas = 0, actualizadasLocal = 0, actualizadasProd = 0, errores = 0;

  for (const [archivo, tabla, id] of MAPEO) {
    const filePath = path.join(IMGDIR, archivo);
    if (!fs.existsSync(filePath)) { console.log(`  ✖ No existe el archivo: ${archivo}`); errores++; continue; }

    // 1) Sube a Cloudinary (public_id fijo → idempotente)
    let url;
    try {
      const publicId = archivo.replace(/\.jpg$/i, '');
      const res = await cloudinary.uploader.upload(filePath, {
        folder: 'redsolidaria',
        public_id: publicId,
        overwrite: true,
      });
      url = res.secure_url;
      subidas++;
    } catch (e) {
      console.log(`  ✖ Cloudinary ${archivo} → ${e.message || e}`);
      errores++;
      continue;
    }

    // 2) UPDATE en local
    const rl = await local.query(`UPDATE ${tabla} SET imagen = $1 WHERE id = $2`, [url, id]);
    if (rl.rowCount > 0) actualizadasLocal++;
    else console.log(`  ⚠️ ${tabla} id=${id}: no existe en LOCAL (no se actualizó)`);

    // 3) UPDATE en producción
    if (prod) {
      const rp = await prod.query(`UPDATE ${tabla} SET imagen = $1 WHERE id = $2`, [url, id]);
      if (rp.rowCount > 0) actualizadasProd++;
      else console.log(`  ⚠️ ${tabla} id=${id}: no existe en PRODUCCIÓN`);
    }

    console.log(`  ✅ ${archivo} → ${tabla} id=${id}`);
    console.log(`     ${url}`);
    await sleep(250); // ritmo suave
  }

  console.log(`\n✔ Subidas a Cloudinary: ${subidas}`);
  console.log(`✔ Actualizadas en LOCAL: ${actualizadasLocal}`);
  if (prod) console.log(`✔ Actualizadas en PRODUCCIÓN: ${actualizadasProd}`);
  if (errores) console.log(`✖ Errores: ${errores}`);

  await local.end();
  if (prod) await prod.end();
})().catch((e) => { console.error('✖ Error general:', e); process.exit(1); });
