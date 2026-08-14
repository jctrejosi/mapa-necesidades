#!/usr/bin/env node
/**
 * setup.js — Arranca el proyecto en local con Docker.
 *
 *   node setup.js            -> levanta MySQL + Apache/PHP y verifica la conexión
 *   node setup.js --down     -> detiene los contenedores (conserva los datos)
 *   node setup.js --reset    -> detiene y borra la base de datos, luego arranca de cero
 *
 * Sin dependencias externas (solo Node >= 18 y Docker con el plugin Compose).
 */

const { execSync } = require('child_process');
const net = require('net');

const COMPOSE = ['docker', 'compose'];
const DB_CONTAINER = 'mapa-necesidades-db';
const WEB_URL = 'http://localhost:8080';
const API = `${WEB_URL}/api.php?action=`;
const ADMIN_PASSWORD = 'admin123';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function banner() {
  console.log(`
${c.cyan}${c.bold}  ███ Mapa de Sectores Afectados — Sismo Manizales ███${c.reset}
  ${c.dim}Arranque local: MySQL (Docker) + Apache/PHP (Docker)${c.reset}
`);
}

function ok(msg) { console.log(`  ${c.green}✔${c.reset} ${msg}`); }
function info(msg) { console.log(`  ${c.cyan}›${c.reset} ${msg}`); }
function warn(msg) { console.log(`  ${c.yellow}!${c.reset} ${msg}`); }
function fail(msg) {
  console.error(`  ${c.red}✖ ${msg}${c.reset}`);
  process.exit(1);
}

/** Ejecuta un comando mostrando su salida en vivo. Lanza si falla. */
function run(cmd) {
  execSync(cmd.join(' '), { stdio: 'inherit', cwd: __dirname });
}

/** Ejecuta un comando silenciosamente y devuelve su stdout ('' si falla). */
function quiet(cmd) {
  try {
    return execSync(cmd.join(' '), { stdio: 'pipe', cwd: __dirname }).toString().trim();
  } catch {
    return '';
  }
}

function hasDocker() {
  return quiet(['docker', '--version']) !== '';
}

function hasCompose() {
  return quiet(COMPOSE.concat(['version'])) !== '';
}

function portInUse(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: '127.0.0.1' });
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => resolve(false));
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Espera a que el contenedor de MySQL esté healthy. */
async function waitForDb(timeoutMs = 180000) {
  const started = Date.now();
  info('Esperando a que MySQL esté listo (healthcheck)...');
  while (Date.now() - started < timeoutMs) {
    const status = quiet([
      'docker', 'inspect', '-f', '{{.State.Health.Status}}', DB_CONTAINER,
    ]);
    if (status === 'healthy') { ok('MySQL healthy'); return; }
    if (status && status !== 'starting') warn(`estado de MySQL: ${status}`);
    await sleep(2000);
  }
  fail(`MySQL no quedó healthy en ${timeoutMs / 1000}s. Revisa: docker compose logs db`);
}

/** Espera a que Apache responda. */
async function waitForWeb(timeoutMs = 60000) {
  const started = Date.now();
  info('Esperando a que Apache responda...');
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${WEB_URL}/index.html`);
      if (res.ok) { ok('Apache respondiendo'); return; }
    } catch { /* aún no arriba */ }
    await sleep(1000);
  }
  fail(`Apache no respondió en ${timeoutMs / 1000}s. Revisa: docker compose logs web`);
}

/** Prueba los endpoints de la API contra la base de datos. */
async function verifyApi() {
  info('Verificando conexión con la base de datos (API):');
  const endpoints = [
    ['listar_sectores', 'sectores'],
    ['listar_ofrecimientos', 'ofrecimientos'],
    ['listar_mascotas', 'mascotas'],
    ['listar_centros', 'centros'],
    ['listar_noticias', 'noticias'],
    ['listar_viviendas', 'viviendas'],
    ['listar_danos_publico', 'reportes'],
    ['estadisticas', null],
  ];

  let stats = null;
  for (const [action, key] of endpoints) {
    try {
      const res = await fetch(`${API}${action}`);
      const body = await res.json();
      if (body.error) throw new Error(body.error);
      if (action === 'estadisticas') stats = body;
      ok(`${action}${key ? ` (${(body[key] || []).length} registros)` : ''}`);
    } catch (e) {
      fail(`Fallo en ${action}: ${e.message}`);
    }
  }

  if (stats) {
    info(
      `Resumen: ${stats.total_sectores} sectores · ${stats.total_necesidades} necesidades · ` +
      `${stats.total_ofrecimientos} ofrecimientos`
    );
  }
}

function summary() {
  console.log(`
${c.bold}${c.green}  ✔ Todo listo — el proyecto está corriendo en local${c.reset}

  ${c.bold}Mapa público${c.reset}   ${c.cyan}${WEB_URL}/index.html${c.reset}
  ${c.bold}Panel admin${c.reset}    ${c.cyan}${WEB_URL}/admin.html${c.reset}   (clave: ${ADMIN_PASSWORD})
  ${c.bold}API${c.reset}           ${c.cyan}${WEB_URL}/api.php?action=...${c.reset}
  ${c.bold}MySQL${c.reset}         localhost:3307  (mapa_user / mapa_pass_local / mapa_necesidades)

  ${c.dim}Parar:  node setup.js --down${c.reset}
  ${c.dim}Reset:  node setup.js --reset${c.reset}
`);
}

async function up() {
  banner();

  if (!hasDocker()) fail('Docker no está instalado o no corre. Instálalo y vuelve a intentar.');
  ok(`Docker: ${quiet(['docker', '--version'])}`);

  if (!hasCompose()) fail('Falta el plugin "docker compose" de Docker.');
  ok(`Compose: ${quiet(COMPOSE.concat(['version']))}`);

  const [p8080, p3307] = await Promise.all([portInUse(8080), portInUse(3307)]);
  if (p8080 || p3307) {
    warn(`Puerto${p8080 && p3307 ? 's' : ''} ${p8080 ? '8080' : ''}${p8080 && p3307 ? ' y ' : ''}${p3307 ? '3307' : ''} ya en uso.`);
    warn('Si es otra instancia de este proyecto, detenla con: node setup.js --down');
  }

  info('Levantando contenedores (docker compose up -d --build)...');
  run(COMPOSE.concat(['up', '-d', '--build']));

  await waitForDb();
  await waitForWeb();
  await verifyApi();
  summary();
}

async function down() {
  banner();
  info('Deteniendo contenedores (los datos de MySQL se conservan)...');
  run(COMPOSE.concat(['down']));
  ok('Contenedores detenidos.');
}

async function reset() {
  banner();
  info('Deteniendo y borrando la base de datos (docker compose down -v)...');
  run(COMPOSE.concat(['down', '-v']));
  info('Arrancando de cero (la base de datos se re-creará)...');
  run(COMPOSE.concat(['up', '-d', '--build']));
  await waitForDb();
  await waitForWeb();
  await verifyApi();
  summary();
}

(async () => {
  const arg = process.argv[2] || '';
  try {
    if (arg === '--down') await down();
    else if (arg === '--reset') await reset();
    else if (arg === '--help' || arg === '-h') banner() || console.log('Uso: node setup.js [--down | --reset]');
    else await up();
  } catch (e) {
    fail(e && e.message ? e.message : String(e));
  }
})();
