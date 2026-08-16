/**
 * Funciones por recurso contra la API del backend.
 * La UI trabaja con nombres de ciudad ('Manizales'); aquí se convierten
 * a los ids que espera la API ('manizales').
 */
import { getVisitorId, request } from './client'
import type {
  CentroAcopio, Mascota, Necesidad, Noticia, Ofrecimiento, PuntoApoyo,
  ReporteDano, Sector, Vivienda,
} from './types'

// ── Ciudades ────────────────────────────────────────────────────────────────

export const CITIES: { id: string; label: string }[] = [
  { id: 'manizales', label: 'Manizales' },
  { id: 'pereira', label: 'Pereira' },
  { id: 'cali', label: 'Cali' },
  { id: 'quibdo', label: 'Quibdó' },
  { id: 'norte_valle', label: 'Norte del Valle' },
  { id: 'armenia', label: 'Armenia' },
]

const BY_LABEL = new Map(CITIES.map(c => [c.label, c.id]))
const BY_ID = new Map(CITIES.map(c => [c.id, c.label]))

export const cityId = (label: string): string => BY_LABEL.get(label) ?? 'manizales'
export const cityLabel = (id: string): string => BY_ID.get(id) ?? id

// ── Auth ────────────────────────────────────────────────────────────────────

export const verifyAdmin = (admin_password: string): Promise<{ ok: boolean }> =>
  request('/auth/verify', { method: 'POST', body: { admin_password } })

// ── Visitas (analítica anónima: IP, user-agent, referrer, path) ────────────

export const recordVisita = (b: { visitor_id?: string; path?: string; ciudad?: string; lang?: string }): Promise<{ ok: boolean; id: number }> =>
  request('/visitas', { method: 'POST', body: b })

// ── Sectores / contactos ────────────────────────────────────────────────────

export const listSectores = (ciudadLabel: string, admin = false): Promise<Sector[]> =>
  request(`/sectores${admin ? '/admin' : ''}?ciudad=${encodeURIComponent(cityId(ciudadLabel))}`)

export const createSector = (b: {
  ciudad: string; nombre: string; barrio: string; lat: number; lng: number
  descripcion: string; nivel_afectacion: string
  contacto_nombre?: string; contacto_telefono?: string
}): Promise<Sector> =>
  request('/sectores', { method: 'POST', body: { ...b, ciudad: cityId(b.ciudad), visitor_id: getVisitorId() } })

export const updateSector = (id: number, b: Record<string, unknown>): Promise<Sector> =>
  request(`/sectores/${id}`, { method: 'PATCH', body: b })

export const setSectorEstado = (id: number, estado: 'activo' | 'cerrado'): Promise<Sector> =>
  request(`/sectores/${id}/estado`, { method: 'PATCH', body: { estado } })

export const deleteSector = (id: number): Promise<{ ok: boolean }> =>
  request(`/sectores/${id}`, { method: 'DELETE' })

// ── Necesidades ─────────────────────────────────────────────────────────────

export const listNecesidades = (ciudadLabel: string): Promise<Necesidad[]> =>
  request(`/necesidades?ciudad=${encodeURIComponent(cityId(ciudadLabel))}`)

export const createNecesidad = (b: Partial<Necesidad> & { sector_id: number; tipo: string }): Promise<Necesidad & { pin: string }> =>
  request('/necesidades', { method: 'POST', body: { ...b, visitor_id: getVisitorId() } })

export const updateNecesidad = (id: number, b: Record<string, unknown>): Promise<Necesidad> =>
  request(`/necesidades/${id}`, { method: 'PATCH', body: b })

export const updateNecesidadAdmin = (id: number, b: Record<string, unknown>): Promise<Necesidad> =>
  request(`/necesidades/${id}/admin`, { method: 'PATCH', body: b })

export const setNecesidadEstado = (id: number, estado: 'requiere' | 'atendida'): Promise<Necesidad> =>
  request(`/necesidades/${id}/estado`, { method: 'PATCH', body: { estado } })

export const setResponsable = (id: number, nombre: string, telefono: string): Promise<Necesidad> =>
  request(`/necesidades/${id}/responsable`, { method: 'POST', body: { nombre, telefono } })

/** "Yo puedo ayudar": solo teléfono; el backend envía por WhatsApp los datos de quien necesita. */
export const ayudarNecesidad = (id: number, telefono: string): Promise<{ ok: boolean; whatsapp: boolean }> =>
  request(`/necesidades/${id}/ayudar`, { method: 'POST', body: { telefono } })

export const deleteNecesidad = (id: number): Promise<{ ok: boolean }> =>
  request(`/necesidades/${id}`, { method: 'DELETE' })

/** Borrado público con el PIN que se le dio al usuario. */
export const eliminarNecesidad = (id: number, pin: string): Promise<{ ok: boolean }> =>
  request(`/necesidades/${id}/eliminar`, { method: 'POST', body: { pin } })

// ── Ofrecimientos ───────────────────────────────────────────────────────────

export const listOfrecimientos = (ciudadLabel: string): Promise<Ofrecimiento[]> =>
  request(`/ofrecimientos?ciudad=${encodeURIComponent(cityId(ciudadLabel))}`)

export const createOfrecimiento = (b: Partial<Ofrecimiento>): Promise<Ofrecimiento & { pin: string }> =>
  request('/ofrecimientos', { method: 'POST', body: { ...b, ciudad: cityId(b.ciudad ?? 'Manizales'), visitor_id: getVisitorId() } })

export const updateOfrecimiento = (id: number, b: Record<string, unknown>): Promise<Ofrecimiento> =>
  request(`/ofrecimientos/${id}`, { method: 'PATCH', body: b })

export const reservarOfrecimiento = (id: number, nombre: string, telefono: string): Promise<Ofrecimiento> =>
  request(`/ofrecimientos/${id}/reserva`, { method: 'POST', body: { nombre, telefono } })

export const liberarReserva = (id: number): Promise<Ofrecimiento> =>
  request(`/ofrecimientos/${id}/reserva`, { method: 'DELETE' })

export const deleteOfrecimiento = (id: number): Promise<{ ok: boolean }> =>
  request(`/ofrecimientos/${id}`, { method: 'DELETE' })

/** Borrado público con el PIN que se le dio al usuario. */
export const eliminarOfrecimiento = (id: number, pin: string): Promise<{ ok: boolean }> =>
  request(`/ofrecimientos/${id}/eliminar`, { method: 'POST', body: { pin } })

// ── Mascotas ────────────────────────────────────────────────────────────────

export const listMascotas = (ciudadLabel: string): Promise<Mascota[]> =>
  request(`/mascotas?ciudad=${encodeURIComponent(cityId(ciudadLabel))}`)

export const createMascota = (b: Partial<Mascota>): Promise<Mascota & { pin: string }> =>
  request('/mascotas', { method: 'POST', body: { ...b, ciudad: cityId(b.ciudad ?? 'Manizales'), visitor_id: getVisitorId() } })

export const updateMascota = (id: number, b: Record<string, unknown>): Promise<Mascota> =>
  request(`/mascotas/${id}`, { method: 'PATCH', body: b })

export const avistarMascota = (id: number, nombre: string, telefono: string): Promise<Mascota> =>
  request(`/mascotas/${id}/avistamiento`, { method: 'POST', body: { nombre, telefono } })

export const deleteMascota = (id: number): Promise<{ ok: boolean }> =>
  request(`/mascotas/${id}`, { method: 'DELETE' })

/** Borrado público con el PIN que se le dio al usuario. */
export const eliminarMascota = (id: number, pin: string): Promise<{ ok: boolean }> =>
  request(`/mascotas/${id}/eliminar`, { method: 'POST', body: { pin } })

// ── Centros ─────────────────────────────────────────────────────────────────

export const listCentros = (ciudadLabel: string): Promise<CentroAcopio[]> =>
  request(`/centros?ciudad=${encodeURIComponent(cityId(ciudadLabel))}`)

export const createCentro = (b: Partial<CentroAcopio>): Promise<CentroAcopio> =>
  request('/centros', { method: 'POST', body: { ...b, ciudad: cityId(b.ciudad ?? 'Manizales') } })

export const updateCentro = (id: number, b: Record<string, unknown>): Promise<CentroAcopio> =>
  request(`/centros/${id}`, { method: 'PATCH', body: b })

export const deleteCentro = (id: number): Promise<{ ok: boolean }> =>
  request(`/centros/${id}`, { method: 'DELETE' })

// ── Puntos de apoyo ──────────────────────────────────────────────────────────

export const listPuntosApoyo = (ciudadLabel: string): Promise<PuntoApoyo[]> =>
  request(`/puntos-apoyo?ciudad=${encodeURIComponent(cityId(ciudadLabel))}`)

export const createPuntoApoyo = (b: Partial<PuntoApoyo>): Promise<PuntoApoyo & { pin: string }> =>
  request('/puntos-apoyo', { method: 'POST', body: { ...b, ciudad: cityId(b.ciudad ?? 'Manizales'), visitor_id: getVisitorId() } })

export const updatePuntoApoyo = (id: number, b: Record<string, unknown>): Promise<PuntoApoyo> =>
  request(`/puntos-apoyo/${id}`, { method: 'PATCH', body: b })

export const updatePuntoApoyoAdmin = (id: number, b: Record<string, unknown>): Promise<PuntoApoyo> =>
  request(`/puntos-apoyo/${id}/admin`, { method: 'PATCH', body: b })

export const deletePuntoApoyo = (id: number): Promise<{ ok: boolean }> =>
  request(`/puntos-apoyo/${id}`, { method: 'DELETE' })

/** Borrado público con el PIN que se le dio al usuario al publicar. */
export const eliminarPuntoApoyo = (id: number, pin: string): Promise<{ ok: boolean }> =>
  request(`/puntos-apoyo/${id}/eliminar`, { method: 'POST', body: { pin } })

// ── Noticias ────────────────────────────────────────────────────────────────

export const listNoticias = (ciudadLabel: string): Promise<Noticia[]> =>
  request(`/noticias?ciudad=${encodeURIComponent(cityId(ciudadLabel))}`)

export const createNoticia = (b: Partial<Noticia>): Promise<Noticia> =>
  request('/noticias', { method: 'POST', body: b })

export const updateNoticia = (id: number, b: Record<string, unknown>): Promise<Noticia> =>
  request(`/noticias/${id}`, { method: 'PATCH', body: b })

export const deleteNoticia = (id: number): Promise<{ ok: boolean }> =>
  request(`/noticias/${id}`, { method: 'DELETE' })

// ── Viviendas ───────────────────────────────────────────────────────────────

export const listViviendas = (ciudadLabel: string): Promise<Vivienda[]> =>
  request(`/viviendas?ciudad=${encodeURIComponent(cityId(ciudadLabel))}`)

export const createVivienda = (b: Partial<Vivienda>): Promise<Vivienda & { pin: string }> =>
  request('/viviendas', { method: 'POST', body: { ...b, ciudad: cityId(b.ciudad ?? 'Manizales'), visitor_id: getVisitorId() } })

export const updateVivienda = (id: number, b: Record<string, unknown>): Promise<Vivienda> =>
  request(`/viviendas/${id}`, { method: 'PATCH', body: b })

export const marcarInteresado = (id: number, nombre: string, telefono: string): Promise<Vivienda> =>
  request(`/viviendas/${id}/interesado`, { method: 'POST', body: { nombre, telefono } })

export const deleteVivienda = (id: number): Promise<{ ok: boolean }> =>
  request(`/viviendas/${id}`, { method: 'DELETE' })

/** Borrado público con el PIN que se le dio al usuario. */
export const eliminarVivienda = (id: number, pin: string): Promise<{ ok: boolean }> =>
  request(`/viviendas/${id}/eliminar`, { method: 'POST', body: { pin } })

// ── Daños ───────────────────────────────────────────────────────────────────

export const listDanos = (ciudadLabel: string, admin = false): Promise<ReporteDano[]> =>
  request(`/danos${admin ? '/admin' : ''}?ciudad=${encodeURIComponent(cityId(ciudadLabel))}`)

export const createDano = (b: Partial<ReporteDano>): Promise<ReporteDano & { radicado: string }> =>
  request('/danos', { method: 'POST', body: { ...b, ciudad: cityId(b.ciudad ?? 'Manizales'), visitor_id: getVisitorId() } })

export const updateDanoAdmin = (id: number, b: Record<string, unknown>): Promise<ReporteDano> =>
  request(`/danos/${id}`, { method: 'PATCH', body: b })

/** Consulta pública de un reporte de daños por su número de radicado. */
export const consultarDano = (radicado: string): Promise<ReporteDano> =>
  request(`/danos/${encodeURIComponent(radicado)}`)

export const deleteDano = (id: number): Promise<{ ok: boolean }> =>
  request(`/danos/${id}`, { method: 'DELETE' })

/** Edición pública de un reporte de daños con el número de radicado. */
export const editarDano = (id: number, b: Record<string, unknown>): Promise<ReporteDano> =>
  request(`/danos/${id}/editar`, { method: 'POST', body: b })

/** Borrado público de un reporte de daños con el número de radicado. */
export const eliminarDano = (id: number, radicado: string): Promise<{ ok: boolean }> =>
  request(`/danos/${id}/eliminar`, { method: 'POST', body: { radicado } })

// ── Uploads (Cloudinary: solo se guarda la URL) ─────────────────────────────

export const uploadImage = (imagen: string): Promise<{ path: string }> =>
  request('/uploads', { method: 'POST', body: { imagen } })

// ── Admin: PINs ─────────────────────────────────────────────────────────────

export const verPin = (tabla: string, id: number): Promise<{ pin: string | null }> =>
  request(`/admin/pins/${tabla}/${id}`)

export const restablecerPin = (tabla: string, id: number): Promise<{ pin: string }> =>
  request(`/admin/pins/${tabla}/${id}/reset`, { method: 'POST', body: {} })
