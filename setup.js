#!/usr/bin/env node
/**
 * setup.js — Monta el proyecto completo en local con Docker.
 *
 *   node setup.js            -> levanta backend (NestJS) + interfaz web + panel admin
 *                              en modo producción local (imágenes construidas)
 *   node setup.js --dev      -> modo desarrollo: servicios directos en el host con
 *                              hot reload y logs en vivo (Ctrl+C los detiene)
 *   node setup.js --import   -> fuerza la importación de los datos de producción
 *   node setup.js --down     -> detiene los contenedores (conserva los datos)
 *   node setup.js --reset    -> detiene, borra la base y vuelve a montar desde cero
 *
 * Sin dependencias externas (solo Node >= 18 y Docker con el plugin Compose).
 */

const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const ROOT = __dirname;
const COMPOSE_FILE = path.join(ROOT, 'db', 'docker-compose.yml');
// -p redsolidaria: nombre de proyecto fijo y único (evita chocar con otros compose
// que también viven en carpetas "db/", p. ej. mercaldas-ecommerce o tesis), sin
// importar desde dónde se llame al script.
const COMPOSE = ['docker', 'compose', '-p', 'redsolidaria', '-f', COMPOSE_FILE];

// Nombres reservados por docker-compose.yml (db/)
const CONTAINERS = ['redsolidaria-backend', 'redsolidaria-frontend', 'redsolidaria-admin', 'redsolidaria-bot'];
const DEV_CONTAINERS = ['redsolidaria-backend-dev', 'redsolidaria-frontend-dev', 'redsolidaria-admin-dev'];
// Perfiles compose: prod (build) y dev (hot reload)
const PROD = ['--profile', 'prod'];
const DEV = ['--profile', 'dev'];
const ALL = ['--profile', 'prod', '--profile', 'dev'];

const WEB_URL = 'http://localhost:8080';
const ADMIN_URL = 'http://localhost:8081';
const API_URL = 'http://localhost:3000/api';
const PORTS = [8080, 8081, 3000, 8000];

// ── Modo desarrollo: servicios directos en el host (como dev.js de mercaldas) ──
// Cada servicio corre en su carpeta con sus propias dependencias; los logs se
// muestran en vivo con prefijo de color y Ctrl+C los detiene. La base de datos
// local (PostgreSQL) corre en Docker y queda intacta.
const DEV_SERVICES = [
  {
    name: 'BACKEND', dir: 'backend', cmd: ['npm', 'run', 'start:dev'],
    env: {}, port: 3000, url: 'http://localhost:3000/api', color: '\x1b[35m',
  },
  {
    name: 'WEB', dir: 'interfaz web', cmd: ['pnpm', 'dev'],
    env: { PORT: '8080' }, port: 8080, url: 'http://localhost:8080', color: '\x1b[32m',
  },
  {
    name: 'ADMIN', dir: 'interfaz web admin', cmd: ['npm', 'run', 'dev'],
    env: { PORT: '8081' }, port: 8081, url: 'http://localhost:8081', color: '\x1b[34m',
  },
  {
    name: 'BOT', dir: 'bot', cmd: ['bash', 'dev.sh'],
    env: {}, port: 8000, url: 'http://localhost:8000', color: '\x1b[36m',
  },
];
const devChildren = [];

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
  ${c.dim}Arranque local: API (NestJS/Drizzle + PostgreSQL local en Docker) + Interfaz Web${c.reset}
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
function run(cmd, cwd = ROOT) {
  execFileSync(cmd[0], cmd.slice(1), { stdio: 'inherit', cwd });
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
function removeStaleContainers(names) {
  const project = projectName();
  for (const name of names) {
    const exists = quiet(['docker', 'container', 'inspect', '-f', '{{.Id}}', name]) !== '';
    if (!exists) continue;

    const owner = quiet(['docker', 'inspect', '-f', '{{index .Config.Labels "com.docker.compose.project"}}', name]);
    if (owner === project) continue; // contenedor válido de este proyecto: compose lo reutiliza

    const state = quiet(['docker', 'inspect', '-f', '{{.State.Status}}', name]);
    const isRunning = state === 'running' || state === 'restarting';

    warn(`El contenedor "${name}" es de una ejecución anterior (proyecto: ${owner || 'desconocido'}); se detiene y elimina.`);
    if (isRunning) run(['docker', 'stop', name]);
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

/** Importa datos a la base local (Postgres) si está vacía. */
async function importLegacyIfNeeded(force = false, devMode = false) {
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

  const backend = devMode ? 'backend-dev' : 'backend';
  const bkPath = path.join(ROOT, 'backups', 'bk.sql');
  if (fs.existsSync(bkPath)) {
    info(force
      ? 'Sembrando la base local desde bk.sql (merge idempotente)...'
      : 'La base local está vacía; sembrando desde bk.sql (merge idempotente)...');
    run(COMPOSE.concat(['exec', '-T', backend, 'npm', 'run', 'db:seed-bk']));
  } else {
    info(force
      ? 'Importando los datos del backup de producción (legacy)...'
      : 'La base local está vacía; importando el backup de producción (legacy)...');
    run(COMPOSE.concat(['exec', '-T', backend, 'npm', 'run', 'db:import-legacy']));
  }
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
    (p === 8080 && containerRunning('redsolidaria-frontend')) ||
    (p === 8081 && containerRunning('redsolidaria-admin')) ||
    (p === 3000 && containerRunning('redsolidaria-backend')) ||
    (p === 8000 && containerRunning('redsolidaria-bot'));
  const foreign = busy.filter((p) => !ours(p));
  if (foreign.length) {
    warn(`Puerto${foreign.length > 1 ? 's' : ''} ${foreign.join(' y ')} en uso.`);
    warn('Se liberarán los puertos ocupados por procesos ajenos al proyecto.');
  }

  // Si el stack de desarrollo está corriendo, detenerlo (mismos puertos 3000/8080/8081)
  for (const name of DEV_CONTAINERS) {
    if (containerRunning(name)) {
      warn(`El contenedor de desarrollo "${name}" está corriendo; se detiene (mismos puertos).`);
      run(['docker', 'stop', name]);
    }
  }

  removeStaleContainers(CONTAINERS);

  // Liberar los puertos que aún estén ocupados por procesos ajenos al proyecto.
  for (const p of foreign) {
    if (await portInUse(p)) {
      warn(`Liberando el puerto ${p} (proceso ajeno)...`);
      killPort(p);
    }
  }
  if (foreign.length) await sleep(800);

  info('Montando backend + interfaz web + panel admin (docker compose up -d --build)...');
  run(COMPOSE.concat(PROD, ['up', '-d', '--build']));

  await waitForApi();
  await waitForWeb();
  await importLegacyIfNeeded();

  summary(false);

  // Mantener la consola abierta mostrando los logs (como dev.js): Ctrl+C sale
  // del log sin apagar los contenedores.
  info('Mostrando logs en vivo (Ctrl+C para salir; los contenedores siguen corriendo).');
  info('Para volver a verlos: node setup.js');
  run(COMPOSE.concat(PROD, ['logs', '-f', '--tail=50']));
  ok('Seguimiento de logs terminado. Los contenedores siguen arriba.');
}

/** Mata el proceso que esté escuchando en `port` (Unix: fuser). */
function killPort(port) {
  try {
    execFileSync('fuser', ['-k', `${port}/tcp`], { stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { /* nada que liberar */ }
}

/** Asegura node_modules en la carpeta del servicio (instala si falta). */
function ensureDeps(svc) {
  const dir = path.join(ROOT, svc.dir);
  if (require('fs').existsSync(path.join(dir, 'node_modules'))) return;
  info(`Instalando dependencias de ${svc.name} (${svc.dir})...`);
  const pm = svc.cmd[0] === 'pnpm' ? 'pnpm' : 'npm';
  run([pm, 'install'], dir);
}

/** Arranca un servicio dev en el host con salida prefijada en vivo. */
function startDevService(svc) {
  const cwd = path.join(ROOT, svc.dir);
  const prefix = `${svc.color}[${svc.name}]${c.reset} `;
  console.log(`${prefix}▶ ${svc.url}  (cwd: ${cwd})`);

  killPort(svc.port);
  // dar tiempo a que el SO libere el socket
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, 800);

  const child = spawn(svc.cmd[0], svc.cmd.slice(1), {
    cwd,
    env: { ...process.env, ...svc.env },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  const pipe = (stream, out) => {
    stream.on('data', (chunk) => {
      chunk.toString().split('\n').forEach((line) => {
        if (line.trim()) out.write(prefix + line + '\n');
      });
    });
  };
  if (child.stdout) pipe(child.stdout, process.stdout);
  if (child.stderr) pipe(child.stderr, process.stderr);
  child.on('exit', (code, signal) => {
    console.log(`${prefix}terminó (${signal || code})`);
  });
  devChildren.push(child);
}

function killDevChildren() {
  if (!devChildren.length) return;
  console.log('\n⏹  Deteniendo servicios dev...');
  for (const child of devChildren) {
    try {
      if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch { /* ya terminó */ }
  }
}

/** Modo desarrollo: servicios en el host con hot reload y logs en vivo. */
async function devUp() {
  banner();

  // La base de datos local (PostgreSQL) se levanta con Docker
  info('Levantando PostgreSQL local (docker compose up -d db)...');
  run(COMPOSE.concat(['up', '-d', 'db']));
  if (!(await waitForPort(5434, 60000))) {
    warn('No se detectó PostgreSQL local en :5434; el backend reintentará la conexión al arrancar.');
  }

  // El modo dev usa los mismos puertos (3000/8080/8081): detener contenedores del proyecto
  for (const name of CONTAINERS.concat(DEV_CONTAINERS)) {
    if (containerRunning(name)) {
      warn(`El contenedor "${name}" está corriendo; se detiene (mismos puertos).`);
      run(['docker', 'stop', name]);
    }
  }

  info('Preparando servicios dev en el host (hot reload: nest --watch + Vite HMR)...');
  for (const svc of DEV_SERVICES) {
    if (svc.dir !== 'bot') ensureDeps(svc);
  }

  // Bot (Python): crear venv e instalar dependencias si falta
  const botDir = path.join(ROOT, 'bot');
  const botPython = path.join(botDir, '.venv', 'bin', 'python');
  if (!require('fs').existsSync(botPython)) {
    info('Preparando el bot (venv + dependencias de Python)...');
    run(['python3', '-m', 'venv', '.venv'], botDir);
    run([botPython, '-m', 'pip', 'install', '-r', 'requirements.txt'], botDir);
  }

  console.log(`
${c.bold}  Levantando ${DEV_SERVICES.length} servicios — logs en vivo:${c.reset}
`);
  for (const svc of DEV_SERVICES) startDevService(svc);

  console.log(`
${c.green}${c.bold}  ✔ Servicios dev arriba${c.reset}
  ${c.bold}Interfaz web${c.reset}  ${c.cyan}http://localhost:8080${c.reset}
  ${c.bold}Panel admin${c.reset}   ${c.cyan}http://localhost:8081${c.reset}
  ${c.bold}API${c.reset}          ${c.cyan}http://localhost:3000/api${c.reset}
  ${c.bold}Bot Ibanaska${c.reset}     ${c.cyan}http://localhost:8000${c.reset}

  ${c.dim}Hot reload activo: edita y mira los logs aquí. Ctrl+C detiene los 4 servicios.${c.reset}
`);

  // El script se queda vivo hasta Ctrl+C (manejado abajo).
  await new Promise(() => {});
}

async function down() {
  banner();
  info('Deteniendo los contenedores (los datos se conservan)...');
  run(COMPOSE.concat(ALL, ['down']));
  ok('Contenedores detenidos.');
}

async function reset() {
  banner();
  info('Deteniendo y borrando la base de datos (docker compose down -v)...');
  run(COMPOSE.concat(ALL, ['down', '-v']));
  info('Montando de cero...');
  run(COMPOSE.concat(PROD, ['up', '-d', '--build']));
  await waitForApi();
  await waitForWeb();
  await importLegacyIfNeeded();
  summary(false);
}

async function forceImport() {
  banner();
  info('Asegurando que el stack esté arriba...');
  run(COMPOSE.concat(PROD, ['up', '-d']));
  await waitForApi();
  await importLegacyIfNeeded(true);
  ok('Importación completada.');
}

/** Detecta la IP de la red local (excluye redes Docker 172.x y loopback). */
function lanUrl() {
  try {
    const out = execFileSync('hostname', ['-I'], { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    const ip = out.split(/\s+/).find((i) => {
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(i)) return false;
      if (i.startsWith('127.') || i.startsWith('169.254.')) return false;
      if (i.startsWith('172.')) return false; // redes Docker
      return true;
    });
    return ip ? `http://${ip}` : null;
  } catch { return null }
}

function summary(dev = false) {
  console.log(`
${c.bold}${c.green}  ✔ Todo listo — SolidaridadCO está corriendo en local${c.reset}

  ${c.bold}Interfaz web${c.reset}    ${c.cyan}${WEB_URL}${c.reset}
  ${c.bold}Panel admin${c.reset}     ${c.cyan}${ADMIN_URL}${c.reset}   (clave por defecto: admin123)
  ${c.bold}API${c.reset}            ${c.cyan}${API_URL}/...${c.reset}
  ${c.bold}PostgreSQL${c.reset}     Local (Docker) — semilla desde backups/bk.sql; producción usa Supabase
${dev ? `
  ${c.dim}Modo DEV: hot reload activo — backend (nest --watch) y frontends (Vite HMR)${c.reset}
` : ''}
${lanUrl() ? `  ${c.bold}Red local${c.reset}      ${c.cyan}${lanUrl()}:8080${c.reset} (web) · ${c.cyan}${lanUrl()}:8081${c.reset} (admin)
` : ''}
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
    else if (arg === '--dev') await devUp();
    else if (arg === '--help' || arg === '-h') {
      banner();
      console.log('Uso: node setup.js [--dev | --import | --down | --reset]');
    } else await up();
  } catch (e) {
    if (e && (e.signal === 'SIGINT' || e.signal === 'SIGTERM')) {
      console.log('\n  Detenido por el usuario.');
      process.exit(0);
    }
    fail(e && e.message ? e.message : String(e));
  }
})();

// Ctrl+C / SIGTERM: detiene servicios dev si los hay y sale limpio.
function onStop() {
  killDevChildren();
  process.exit(0);
}
process.on('SIGINT', onStop);
process.on('SIGTERM', onStop);
