import { str } from './util';

/** Tipos canónicos de necesidad (coincide con TIPOS_NECESIDAD del frontend y con ia-service). */
export const TIPOS_NECESIDAD = [
  'Comida y agua',
  'Servicios médicos',
  'Atención psicosocial',
  'Refugio y abrigo',
  'Escombros',
  'Maquinaria y rescate',
  'Transporte',
  'Voluntariado',
  'Mascotas',
  'Otro',
];

/** URL del servicio de IA (clasificación con DeepSeek). En docker: http://ia-service:8100.
 * Se usa 127.0.0.1 en vez de localhost: en algunos entornos localhost resuelve a
 * ::1 (IPv6) y el servicio local solo escucha en IPv4, dando ECONNREFUSED. */
const IA_SERVICE_URL = (process.env.IA_SERVICE_URL ?? 'http://127.0.0.1:8100').replace(/\/+$/, '');

/**
 * Clasifica/valida el tipo de un reporte con el ia-service (DeepSeek).
 * Es OPCIONAL y silencioso: si el servicio no responde, tarda o devuelve algo
 * no válido, devuelve null y el reporte queda con el tipo original.
 */
export async function clasificarTipo(descripcion: string, tipoActual: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${IA_SERVICE_URL}/clasificar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descripcion: descripcion.slice(0, 4000),
        tipo_actual: tipoActual,
        tipos_posibles: TIPOS_NECESIDAD,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const d = (await res.json()) as { tipo?: unknown };
    const tipo = str(d?.tipo);
    return TIPOS_NECESIDAD.includes(tipo) ? tipo : null;
  } catch {
    return null;
  }
}
