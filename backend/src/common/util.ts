/** Extrae un string recortado de cualquier valor. */
export function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Convierte a entero; devuelve `def` si no es válido. */
export function toInt(v: unknown, def = 0): number {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : def;
}

/** Convierte a número flotante; null si no es válido. */
export function toNum(v: unknown): number | null {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/** Normaliza una fecha a 'YYYY-MM-DD' o null. */
export function toDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Fecha de hoy como 'YYYY-MM-DD'. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Genera un PIN de 4 dígitos que no colisione con los existentes. */
export function genPin(existing: Iterable<string | null | undefined>): string {
  const used = new Set(existing);
  let pin = '';
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  } while (used.has(pin));
  return pin;
}

/**
 * Regla de autoservicio (compatible con el legado):
 * - publicación con PIN: exige el PIN correcto
 * - publicación sin PIN (filas migradas): editable sin código
 */
export function checkPin(stored: string | null | undefined, provided: unknown): boolean {
  if (!stored) return true;
  return stored === str(provided);
}

/** Comparación en tiempo constante de la contraseña admin. */
export function isAdminPass(pass: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? 'admin123';
  const a = String(pass ?? '');
  if (a.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/**
 * Contraseña del rol OWNER (OWNER_PASSWORD en el .env). NO cae a ADMIN_PASSWORD:
 * si no está definida, nadie es owner (visitas/auditoría quedan ocultas para
 * el admin hasta que se configure). Así el admin NUNCA ve las secciones
 * reservadas al owner.
 */
export function isOwnerPass(pass: unknown): boolean {
  const expected = process.env.OWNER_PASSWORD ?? '';
  const a = String(pass ?? '');
  if (!expected || a.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/**
 * Llave universal de EDICIÓN de reportes (ADMIN_EDIT en el .env).
 * Permite editar/borrar cualquier reporte sin conocer su PIN/radicado.
 * Acepta varias llaves separadas por coma (ej. ADMIN_EDIT=admin-edit-2026,2026)
 * y recorta espacios alrededor de lo que escriba el usuario.
 * Si ADMIN_EDIT no está definido, cae a ADMIN_PASSWORD.
 */
export function isAdminEdit(code: unknown): boolean {
  const env = process.env.ADMIN_EDIT ?? process.env.ADMIN_PASSWORD ?? 'admin123';
  const keys = env.split(',').map(k => k.trim()).filter(Boolean);
  const a = String(code ?? '').trim();
  return keys.some(expected => {
    if (a.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

/**
 * Código de edición válido = el PIN del reporte O la llave universal ADMIN_EDIT.
 */
export function checkEditCode(stored: string | null | undefined, provided: unknown): boolean {
  return checkPin(stored, provided) || isAdminEdit(provided);
}

/** Crea un radicado 'DA######' que no colisione con los existentes. */
export function genRadicado(existing: Iterable<string>): string {
  const used = new Set(existing);
  let radicado = '';
  do {
    radicado = 'DA' + String(Math.floor(100000 + Math.random() * 900000));
  } while (used.has(radicado));
  return radicado;
}
