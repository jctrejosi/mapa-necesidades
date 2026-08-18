#!/usr/bin/env node
/**
 * setup.js — Monta el proyecto completo en local.
 *
 *   node setup.js            -> levanta backend (NestJS) + bot (Anay) + interfaz web
 *                              + panel admin como procesos LOCALES en el host;
 *                              lo único que corre en Docker es PostgreSQL.
 *                              Libera los puertos ocupados, escribe los logs en
 *                              logs/ (backend, web, admin, bot, db) y TERMINA:
 *                              los servicios quedan corriendo en segundo plano.
 *   node setup.js --dev      -> igual que arriba (alias).
 *   node setup.js --import   -> fuerza la importación de los datos de producción
 *   node setup.js --down     -> detiene los servicios locales (por puerto) y la BD (conserva los datos)
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
// Perfil compose usado en down/reset (detener todo el proyecto)
const ALL = ['--profile', 'prod', '--profile', 'dev'];

const WEB_URL = 'http://localhost:8080';
const ADMIN_URL = 'http://localhost:8081';
const API_URL = 'http://localhost:3000/api';
const PORTS = [8080, 8081, 3000, 8000];
const LOGS_DIR = path.join(ROOT, 'logs');

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
  ${c.dim}Arranque local: servicios en el host (API, web, admin, bot) + PostgreSQL en Docker${c.reset}
  ${c.dim}Logs: logs/backend.log · logs/web.log · logs/admin.log · logs/bot.log · logs/db.log${c.reset}
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

/** Espera a que un puerto local responda (devuelve false si agota el tiempo). */
async function waitForPort(port, timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await portInUse(port)) return true;
    await sleep(500);
  }
  return false;
}

/** Nombre del proyecto compose actual (la carpeta que contiene db/docker-compose.yml). */
function projectName() {
  try {
    const cfg = JSON.parse(quiet(COMPOSE.concat(ALL, ['config', '--format', 'json'])));
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
  fail(`La API no respondió en ${timeoutMs / 1000}s. Revisa: logs/backend.log`);
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
  fail(`La interfaz web no respondió en ${timeoutMs / 1000}s. Revisa: logs/web.log`);
}

/** Importa datos a la base local (Postgres) si está vacía. Corre en el host. */
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

  const bkPath = path.join(ROOT, 'backups', 'bk.sql');
  const seedPath = path.join(ROOT, 'backend', 'dist', 'scripts', 'merge-bk.js');
  if (!fs.existsSync(seedPath)) {
    warn('El backend no está compilado (falta backend/dist); se omite la siembra de bk.sql.');
    return;
  }
  info(force
    ? 'Sembrando la base local desde bk.sql (merge idempotente)...'
    : 'La base local está vacía; sembrando desde bk.sql (merge idempotente)...');
  run(['node', seedPath, bkPath], path.join(ROOT, 'backend'));
}

async function up() {
  banner();

  if (!hasDocker()) fail('Docker no está instalado o no corre. Instálalo y vuelve a intentar.');
  ok(`Docker: ${quiet(['docker', '--version'])}`);

  if (!hasCompose()) fail('Falta el plugin "docker compose" de Docker.');
  ok(`Compose: ${quiet(COMPOSE.concat(['version']))}`);

  // 1) Liberar los puertos: detener contenedores del proyecto y matar cualquier
  //    proceso local que los esté usando (3000, 8080, 8081, 8000).
  info('Liberando puertos (3000, 8080, 8081, 8000)...');
  for (const name of CONTAINERS.concat(DEV_CONTAINERS)) {
    if (containerRunning(name)) {
      warn(`El contenedor "${name}" está corriendo; se detiene (mismos puertos).`);
      run(['docker', 'stop', name]);
    }
  }
  removeStaleContainers(CONTAINERS);
  for (const p of PORTS) {
    if (await portInUse(p)) {
      warn(`Puerto ${p} ocupado; matando el proceso que lo usa...`);
      killPort(p);
    }
  }
  await sleep(800);

  // 2) La única cosa que corre en Docker es la base de datos.
  info('Levantando PostgreSQL local (docker compose up -d db)...');
  run(COMPOSE.concat(ALL, ['up', '-d', 'db']));
  if (!(await waitForPort(5435, 60000))) {
    warn('No se detectó PostgreSQL local en :5435; el backend reintentará la conexión al arrancar.');
  }
  startDbLog();

  // 3) Dependencias locales (node_modules / venv del bot).
  info('Preparando servicios en el host (dependencias)...');
  for (const svc of DEV_SERVICES) {
    if (svc.dir !== 'bot') ensureDeps(svc);
  }
  const botDir = path.join(ROOT, 'bot');
  const botPython = path.join(botDir, '.venv', 'bin', 'python');
  if (!fs.existsSync(botPython)) {
    info('Preparando el bot (venv + dependencias de Python)...');
    run(['python3', '-m', 'venv', '.venv'], botDir);
    run([botPython, '-m', 'pip', 'install', '-r', 'requirements.txt'], botDir);
  }

  // 4) Arrancar los 4 servicios como procesos locales (logs en consola + logs/).
  console.log(`
${c.bold}  Levantando ${DEV_SERVICES.length} servicios locales — logs en vivo:${c.reset}
`);
  for (const svc of DEV_SERVICES) startDevService(svc);

  await waitForApi();
  await waitForWeb();
  await importLegacyIfNeeded();

  summary();
  ok('Servicios corriendo en segundo plano. Logs en logs/ (backend.log, web.log, admin.log, bot.log, db.log).');
  info('Para detenerlos: node setup.js --down');
}

/** Mata el proceso que esté escuchando en `port` (fuser, con fallback lsof). */
function killPort(port) {
  try {
    execFileSync('fuser', ['-k', `${port}/tcp`], { stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { /* nada que liberar */ }
  try {
    const pids = execFileSync('lsof', ['-ti', `tcp:${port}`], { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString().trim().split(/\s+/).filter(Boolean);
    for (const pid of pids) {
      try { process.kill(Number(pid), 'SIGKILL'); } catch { /* ya terminó */ }
    }
  } catch { /* sin lsof o nada que liberar */ }
}

/** Crea la carpeta logs/ (si no existe). */
function ensureLogsDir() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/** Abre (append) el fd del log de un servicio y escribe el encabezado de ejecución. */
function openLogFd(name) {
  ensureLogsDir();
  const fd = fs.openSync(path.join(LOGS_DIR, `${name}.log`), 'a');
  fs.writeSync(fd, `\n${'='.repeat(72)}\n[${new Date().toLocaleString('es-CO')}] — Ejecución iniciada\n${'='.repeat(72)}\n`);
  return fd;
}

/** Asegura node_modules en la carpeta del servicio (instala si falta). */
function ensureDeps(svc) {
  const dir = path.join(ROOT, svc.dir);
  if (require('fs').existsSync(path.join(dir, 'node_modules'))) return;
  info(`Instalando dependencias de ${svc.name} (${svc.dir})...`);
  const pm = svc.cmd[0] === 'pnpm' ? 'pnpm' : 'npm';
  run([pm, 'install'], dir);
}

/**
 * Arranca un servicio local desacoplado (daemon): su salida va directo a
 * logs/<nombre>.log y sigue corriendo aunque el setup termine.
 */
function startDevService(svc) {
  const cwd = path.join(ROOT, svc.dir);
  const prefix = `${svc.color}[${svc.name}]${c.reset} `;

  killPort(svc.port);
  // dar tiempo a que el SO libere el socket
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, 800);

  const fd = openLogFd(svc.name.toLowerCase());
  const child = spawn(svc.cmd[0], svc.cmd.slice(1), {
    cwd,
    env: { ...process.env, ...svc.env },
    stdio: ['ignore', fd, fd],
    detached: process.platform !== 'win32',
  });
  fs.closeSync(fd); // el padre cierra su copia; el hijo conserva la suya
  child.on('error', (err) => {
    console.log(`${prefix}✖ No se pudo arrancar ${svc.name}: ${err.message}`);
  });
  child.unref(); // el setup puede terminar sin esperar al servicio
  devChildren.push(child);
  console.log(`${prefix}▶ ${svc.url}  (log: logs/${svc.name.toLowerCase()}.log)`);
}

/** Sigue los logs del contenedor PostgreSQL y los escribe en logs/db.log (desacoplado). */
function startDbLog() {
  const fd = openLogFd('db');
  const child = spawn('docker', ['logs', '-f', '--tail=0', 'redsolidaria-db'], {
    stdio: ['ignore', fd, fd],
    detached: process.platform !== 'win32',
  });
  fs.closeSync(fd);
  child.on('error', (err) => {
    console.log(`${c.red}✖ No se pudo capturar los logs de PostgreSQL: ${err.message}${c.reset}`);
  });
  child.unref();
  devChildren.push(child);
  info('Capturando logs de PostgreSQL en logs/db.log');
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

/** Modo desarrollo: alias del flujo local (mismos servicios, hot reload). */
async function devUp() {
  await up();
}

async function down() {
  banner();
  info('Deteniendo servicios locales (por puerto: 3000, 8080, 8081, 8000)...');
  for (const p of PORTS) {
    if (await portInUse(p)) killPort(p);
  }
  await sleep(600);
  info('Deteniendo los contenedores del proyecto...');
  run(COMPOSE.concat(ALL, ['down']));
  ok('Todo detenido. Los datos de la base se conservan.');
}

async function reset() {
  banner();
  info('Deteniendo y borrando la base de datos (docker compose down -v)...');
  killDevChildren();
  run(COMPOSE.concat(ALL, ['down', '-v']));
  info('Montando de cero (solo la BD en Docker; servicios en el host)...');
  await up();
}

async function forceImport() {
  banner();
  info('Asegurando PostgreSQL local (docker compose up -d db)...');
  run(COMPOSE.concat(ALL, ['up', '-d', 'db']));
  if (!(await waitForPort(5435, 60000))) {
    warn('No se detectó PostgreSQL local en :5435.');
  }
  const seedPath = path.join(ROOT, 'backend', 'dist', 'scripts', 'merge-bk.js');
  if (!fs.existsSync(seedPath)) {
    fail('El backend no está compilado (falta backend/dist). Ejecuta: npm --prefix backend run build');
  }
  info('Ejecutando el merge de datos (bk.sql) contra la base local...');
  run(['node', seedPath, path.join(ROOT, 'backups', 'bk.sql')], path.join(ROOT, 'backend'));
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

function summary() {
  console.log(`
${c.bold}${c.green}  ✔ Todo listo — SolidaridadCO está corriendo en local${c.reset}

  ${c.bold}Interfaz web${c.reset}    ${c.cyan}${WEB_URL}${c.reset}
  ${c.bold}Panel admin${c.reset}     ${c.cyan}${ADMIN_URL}${c.reset}   (clave por defecto: admin123)
  ${c.bold}API${c.reset}            ${c.cyan}${API_URL}/...${c.reset}
  ${c.bold}Bot Anay${c.reset}       ${c.cyan}http://localhost:8000${c.reset}
  ${c.bold}PostgreSQL${c.reset}     Local (Docker) — semilla desde backups/bk.sql; producción usa Supabase
  ${c.bold}Logs${c.reset}           ${c.cyan}logs/backend.log · web.log · admin.log · bot.log · db.log${c.reset}
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
    else if (arg === '--dev') await devUp(); // mismo flujo local
    else if (arg === '--help' || arg === '-h') {
      banner();
      console.log('Uso: node setup.js [--dev | --import | --down | --reset]');
      console.log('Logs en logs/ (backend, web, admin, bot, db). Solo PostgreSQL corre en Docker.');
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
