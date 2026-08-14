/**
 * Cliente HTTP para la API de SolidaridadCO (NestJS).
 * - En producción nginx proxya /api y /uploads al backend.
 * - En desarrollo Vite proxya /api (ver vite.config.ts).
 */

const RAW_API_URL: string = (import.meta.env.VITE_API_URL as string) || '/api'

/**
 * URL base de la API. El backend sirve todo bajo /api (NestJS con prefijo
 * global), así que normalizamos: si VITE_API_URL viene sin el sufijo
 * (p. ej. https://redsolidaria.onrender.com), se lo agregamos automáticamente.
 */
export const API_URL: string = RAW_API_URL.endsWith('/api')
  ? RAW_API_URL
  : `${RAW_API_URL.replace(/\/+$/, '')}/api`

const ORIGIN = API_URL.replace(/\/api$/, '')

/** Guarda/lee la contraseña de admin de la sesión (para los endpoints protegidos). */
export function getAdminPass(): string {
  return sessionStorage.getItem('cr_admin_pass') ?? ''
}

export function setAdminPass(pass: string | null) {
  if (pass) sessionStorage.setItem('cr_admin_pass', pass)
  else sessionStorage.removeItem('cr_admin_pass')
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function request<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; admin?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const pass = getAdminPass()
  if (pass && opts.admin !== false) headers['x-admin-password'] = pass

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0)
  }

  let data: any = null
  try {
    data = await res.json()
  } catch {
    /* respuestas sin JSON (p.ej. CSV) */
  }

  if (!res.ok) {
    throw new ApiError(data?.error ?? `Error del servidor (${res.status})`, res.status)
  }
  return data as T
}

/** Convierte una ruta de imagen relativa (/uploads/x.jpg) en URL absoluta. */
export function imgUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http') || path.startsWith('data:')) return path
  return `${ORIGIN}${path}`
}
