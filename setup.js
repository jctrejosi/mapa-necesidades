#!/usr/bin/env node
/**
 * setup.js — Monta el proyecto completo en local con Docker.
 *
 *   node setup.js            -> levanta PostgreSQL + backend (NestJS) + interfaz web
 *                              e importa los datos del backup si la DB está vacía
 *   node setup.js --import   -> fuerza la importación de los datos de producción
 *   node setup.js --down     -> detiene los contenedores (conserva los datos)
 *   node setup.js --reset    -> detiene, borra la base y vuelve a montar desde cero
 *
 * Sin dependencias externas (solo Node >= 18 y Docker con el plugin Compose).
 */

const { execFileSync } = require('child_process');
const net = require('net');
const path = require('path');

const ROOT = __dirname;
const COMPOSE_FILE = path.join(ROOT, 'db', 'docker-compose.yml');
// -p redsolidaria: nombre de proyecto fijo y único (evita chocar con otros compose
// que también viven en carpetas "db/", p. ej. mercaldas-ecommerce o tesis), sin
// importar desde dónde se llame al script.
const COMPOSE = ['docker', 'compose', '-p', 'redsolidaria', '-f', COMPOSE_FILE];

// Nombres reservados por docker-compose.yml (db/)
const CONTAINERS = ['redsolidaria-backend', 'redsolidaria-frontend', 'redsolidaria-admin'];

const WEB_URL = 'http://localhost:8080';
const ADMIN_URL = 'http://localhost:8081';
const API_URL = 'http://localhost:3000/api';
const PORTS = [8080, 8081, 3000];

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
${c.cyan}${c.bold}  ███ SolidaridadCO — Mapa de Sectores Afectados ███${c.reset}
  ${c.dim}Arranque local: API (NestJS/Drizzle + PostgreSQL en Supabase) + Interfaz Web${c.reset}
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
  execFileSync(cmd[0], cmd.slice(1), { stdio: 'inherit', cwd: ROOT });
}

/** Ejecuta un comando silenciosamente y devuelve su stdout ('' si falla). */
function quiet(cmd) {
  try {
    return execFileSync(cmd[0], cmd.slice(1), { stdio: 'pipe', cwd: ROOT }).toString().trim();
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

/** ¿Un contenedor de este proyecto está en ejecución? */
function containerRunning(name) {
  return quiet(['docker', 'inspect', '-f', '{{.State.Running}}', name]) === 'true';
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Nombre del proyecto compose actual (la carpeta que contiene db/docker-compose.yml). */
function projectName() {
  try {
    const cfg = JSON.parse(quiet(COMPOSE.concat(['config', '--format', 'json'])));
    if (cfg && cfg.name) return cfg.name;
  } catch { /* noop */ }
  return path.basename(path.dirname(COMPOSE_FILE)).toLowerCase();
}

/**
 * Elimina contenedores huérfanos que bloqueen los nombres reservados por este
 * proyecto (p. ej. instancias viejas creadas desde otra carpeta).
 */
function removeStaleContainers() {
  const project = projectName();
  for (const name of CONTAINERS) {
    const exists = quiet(['docker', 'container', 'inspect', '-f', '{{.Id}}', name]) !== '';
    if (!exists) continue;

    const owner = quiet(['docker', 'inspect', '-f', '{{index .Config.Labels "com.docker.compose.project"}}', name]);
    if (owner === project) continue; // contenedor válido de este proyecto: compose lo reutiliza

    const state = quiet(['docker', 'inspect', '-f', '{{.State.Status}}', name]);
    const image = quiet(['docker', 'inspect', '-f', '{{.Config.Image}}', name]);
    const isRunning = state === 'running' || state === 'restarting';
    const looksOurs = /postgres|node|nginx|mysql|php|apache/i.test(image);

    if (isRunning && !looksOurs) {
      fail(
        `El contenedor "${name}" está en ejecución y no parece ser una instancia previa de este ` +
        `proyecto (imagen: ${image || 'desconocida'}). Detenlo manualmente: ` +
        `docker stop ${name} && docker rm ${name}`
      );
    }

    if (isRunning) {
      warn(`El contenedor "${name}" es una instancia anterior que sigue en ejecución; se detendrá.`);
      run(['docker', 'stop', name]);
    }
    warn(`El contenedor "${name}" sobra de una ejecución anterior; se elimina.`);
    run(['docker', 'rm', '-f', name]);
  }
}

/** Espera a que la API responda (el backend corre las migraciones al arrancar). */
async function waitForApi(timeoutMs = 180000) {
  const started = Date.now();
  info('Esperando a que la API esté lista...');
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${API_URL}/stats?ciudad=manizales`);
      if (res.ok) { ok('API respondiendo'); return; }
    } catch { /* aún no arriba */ }
    await sleep(2000);
  }
  fail(`La API no respondió en ${timeoutMs / 1000}s. Revisa: docker compose logs backend`);
}

/** Espera a que la interfaz web responda. */
async function waitForWeb(timeoutMs = 60000) {
  const started = Date.now();
  info('Esperando a la interfaz web...');
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(WEB_URL);
      if (res.ok) { ok('Interfaz web respondiendo'); return; }
    } catch { /* aún no arriba */ }
    await sleep(1000);
  }
  fail(`La interfaz web no respondió en ${timeoutMs / 1000}s. Revisa: docker compose logs frontend`);
}

/** Importa los datos de producción (dump MySQL) si la DB está vacía. */
async function importLegacyIfNeeded(force = false) {
  let totalSectores = 0;
  try {
    const res = await fetch(`${API_URL}/stats?ciudad=manizales`);
    const body = await res.json();
    totalSectores = body.total_sectores ?? 0;
  } catch { /* API aún no lista; se ignora */ }

  if (totalSectores > 0 && !force) {
    ok(`Base de datos con datos (${totalSectores} sectores en Manizales)`);
    return;
  }

  if (!force) {
    info('La base de datos está vacía; importando los datos del backup de producción...');
  } else {
    info('Importando los datos del backup de producción...');
  }
  run(COMPOSE.concat(['exec', '-T', 'backend', 'npm', 'run', 'db:import-legacy']));
}

async function up() {
  banner();

  if (!hasDocker()) fail('Docker no está instalado o no corre. Instálalo y vuelve a intentar.');
  ok(`Docker: ${quiet(['docker', '--version'])}`);

  if (!hasCompose()) fail('Falta el plugin "docker compose" de Docker.');
  ok(`Compose: ${quiet(COMPOSE.concat(['version']))}`);

  const busy = (await Promise.all(PORTS.map(portInUse)))
    .map((used, i) => (used ? PORTS[i] : null))
    .filter(Boolean);
  // Los puertos que ocupan contenedores de ESTE proyecto no son un problema
  const ours = (p) =>
    (p === 8080 && containerRunning(CONTAINERS[1])) ||
    (p === 8081 && containerRunning(CONTAINERS[2])) ||
    (p === 3000 && containerRunning(CONTAINERS[0]));
  const foreign = busy.filter((p) => !ours(p));
  if (foreign.length) {
    warn(`Puerto${foreign.length > 1 ? 's' : ''} ${foreign.join(' y ')} en uso.`);
    warn('Si los ocupan contenedores de una instancia anterior, se limpiarán automáticamente.');
  }

  removeStaleContainers();

  info('Montando backend + interfaz web + panel admin (docker compose up -d --build)...');
  run(COMPOSE.concat(['up', '-d', '--build']));

  await waitForApi();
  await waitForWeb();
  await importLegacyIfNeeded();

  summary();
}

async function down() {
  banner();
  info('Deteniendo los contenedores (los datos se conservan)...');
  run(COMPOSE.concat(['down']));
  ok('Contenedores detenidos.');
}

async function reset() {
  banner();
  info('Deteniendo y borrando la base de datos (docker compose down -v)...');
  run(COMPOSE.concat(['down', '-v']));
  info('Montando de cero...');
  run(COMPOSE.concat(['up', '-d', '--build']));
  await waitForApi();
  await waitForWeb();
  await importLegacyIfNeeded();
  summary();
}

async function forceImport() {
  banner();
  info('Asegurando que el stack esté arriba...');
  run(COMPOSE.concat(['up', '-d']));
  await waitForApi();
  await importLegacyIfNeeded(true);
  ok('Importación completada.');
}

function summary() {
  console.log(`
${c.bold}${c.green}  ✔ Todo listo — SolidaridadCO está corriendo en local${c.reset}

  ${c.bold}Interfaz web${c.reset}    ${c.cyan}${WEB_URL}${c.reset}
  ${c.bold}Panel admin${c.reset}     ${c.cyan}${ADMIN_URL}${c.reset}   (clave por defecto: admin123)
  ${c.bold}API${c.reset}            ${c.cyan}${API_URL}/...${c.reset}
  ${c.bold}PostgreSQL${c.reset}     Supabase (nube) — se migra con: node setup.js --import

  ${c.dim}Parar:  node setup.js --down${c.reset}
  ${c.dim}Reset:  node setup.js --reset${c.reset}
`);
}

(async () => {
  const arg = process.argv[2] || '';
  try {
    if (arg === '--down') await down();
    else if (arg === '--reset') await reset();
    else if (arg === '--import') await forceImport();
    else if (arg === '--help' || arg === '-h') {
      banner();
      console.log('Uso: node setup.js [--import | --down | --reset]');
    } else await up();
  } catch (e) {
    fail(e && e.message ? e.message : String(e));
  }
})();
