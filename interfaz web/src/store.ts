import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import * as api from './api'
import { getAdminPass, imgUrl, setAdminPass } from './api/client'
import { cityLabel } from './api'
import type {
  CentroAcopio, Mascota, Necesidad, Noticia, Ofrecimiento,
  ReporteDano, Sector, Vivienda,
} from './api/types'

export type {
  Contacto, Sector, Necesidad, Ofrecimiento, Mascota,
  CentroAcopio, Noticia, Vivienda, ReporteDano,
} from './api/types'

// ── Helpers de formato / imágenes ───────────────────────────────────────────

export const genId = () => Math.random().toString(36).slice(2, 10)

export function fmtFecha(iso: string) {
  const d = new Date(iso)
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${meses[d.getMonth()]}`
}
export function fmtFechaLarga(iso: string) {
  const d = new Date(iso)
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
}

export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 1000
        const scale = img.width > maxW ? maxW / img.width : 1
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Estado global (datos vienen de la API) ─────────────────────────────────

interface Data {
  sectores: Sector[]
  necesidades: Necesidad[]
  ofrecimientos: Ofrecimiento[]
  mascotas: Mascota[]
  centros: CentroAcopio[]
  noticias: Noticia[]
  viviendas: Vivienda[]
  danos: ReporteDano[]
}

let cache: Data = {
  sectores: [], necesidades: [], ofrecimientos: [], mascotas: [],
  centros: [], noticias: [], viviendas: [], danos: [],
}
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l) }
const getSnapshot = () => cache

const mapItem = (x: any) => ({
  ...x,
  imagen: x.imagen ? imgUrl(x.imagen) : x.imagen ?? '',
  ciudad: x.ciudad === null || x.ciudad === undefined ? x.ciudad ?? null : cityLabel(x.ciudad),
})

/** Carga todos los listados (admin ve sectores cerrados y campos completos). */
async function refresh(ciudad: string): Promise<void> {
  const isAdmin = !!getAdminPass()
  const [sectores, necesidades, ofrecimientos, mascotas, centros, noticias, viviendas, danos] =
    await Promise.all([
      api.listSectores(ciudad),
      api.listNecesidades(ciudad),
      api.listOfrecimientos(ciudad),
      api.listMascotas(ciudad),
      api.listCentros(ciudad),
      api.listNoticias(ciudad),
      api.listViviendas(ciudad),
      isAdmin ? api.listDanos(ciudad) : api.listDanos(ciudad),
    ])

  cache = {
    sectores: sectores.map(mapItem),
    necesidades: necesidades.map(mapItem),
    ofrecimientos: ofrecimientos.map(mapItem),
    mascotas: mascotas.map(mapItem),
    centros: centros.map(mapItem),
    noticias: noticias.map(mapItem),
    viviendas: viviendas.map(mapItem),
    danos: danos.map(mapItem),
  }
  emit()
}

/** Ejecuta una mutación y refresca; muestra errores como alert. */
async function mutate(fn: () => Promise<unknown>, ciudad: string): Promise<any> {
  try {
    const res = await fn()
    await refresh(ciudad)
    return res
  } catch (e) {
    alert(e instanceof Error ? e.message : String(e))
    return undefined
  }
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useStore() {
  const data = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [ciudad, setCiudadState] = useState<string>(() => {
    try { return localStorage.getItem('cr_ciudad') ?? 'Manizales' } catch { return 'Manizales' }
  })

  const setCiudad = useCallback((c: string) => {
    setCiudadState(c)
    try { localStorage.setItem('cr_ciudad', c) } catch { /* noop */ }
  }, [])

  useEffect(() => {
    refresh(ciudad).catch((e) => console.error('Error cargando datos:', e))
  }, [ciudad])

  // Estado agregado de un sector según sus necesidades
  const getSectorEstado = (sectorId: number): 'requiere' | 'en_proceso' | 'atendido' | 'sin_reportes' => {
    const ns = data.necesidades.filter(n => n.sector_id === sectorId)
    if (!ns.length) return 'sin_reportes'
    const pendientes = ns.filter(n => n.estado === 'requiere' && !n.responsable)
    const enProceso = ns.filter(n => n.estado === 'requiere' && n.responsable)
    if (pendientes.length > 0) return 'requiere'
    if (enProceso.length > 0) return 'en_proceso'
    return 'atendido'
  }

  // ── CRUD (todo contra la API) ────────────────────────────────────────────

  const addSector = (s: Omit<Sector, 'id'>): Promise<Sector> =>
    mutate(async () => {
      const contacto = s.contactos[0]
      const created = await api.createSector({
        ciudad: s.ciudad, nombre: s.nombre, barrio: s.barrio,
        lat: s.lat, lng: s.lng, descripcion: s.descripcion,
        nivel_afectacion: s.nivel_afectacion,
        contacto_nombre: contacto?.nombre, contacto_telefono: contacto?.telefono,
      })
      return mapItem(created)
    }, ciudad)

  const updateSector = (id: number, b: Partial<Sector>): Promise<Sector> =>
    mutate(() => api.updateSector(id, b as Record<string, unknown>), ciudad)

  const deleteSector = (id: number): Promise<unknown> =>
    mutate(() => api.deleteSector(id), ciudad)

  const addNecesidad = (n: Omit<Necesidad, 'id' | 'pin'>): Promise<string> =>
    mutate(async () => (await api.createNecesidad(n)).pin, ciudad)

  const updateNecesidad = (id: number, b: Partial<Necesidad> & { responsable?: { nombre: string; telefono: string } | null; pin?: string }): Promise<unknown> =>
    mutate(async () => {
      if (b.responsable !== undefined) {
        if (b.responsable) return api.setResponsable(id, b.responsable.nombre, b.responsable.telefono)
        return api.updateNecesidadAdmin(id, { responsable: null })
      }
      if (getAdminPass()) return api.updateNecesidadAdmin(id, b as Record<string, unknown>)
      return api.updateNecesidad(id, b as Record<string, unknown>)
    }, ciudad)

  const deleteNecesidad = (id: number): Promise<unknown> =>
    mutate(() => api.deleteNecesidad(id), ciudad)

  const addOfrecimiento = (o: Omit<Ofrecimiento, 'id' | 'pin'>): Promise<string> =>
    mutate(async () => (await api.createOfrecimiento(o)).pin, ciudad)

  const updateOfrecimiento = (id: number, b: Partial<Ofrecimiento> & { pin?: string }): Promise<unknown> =>
    mutate(async () => {
      if (b.reservado_por !== undefined) {
        if (b.reservado_por) return api.reservarOfrecimiento(id, b.reservado_por.nombre, b.reservado_por.telefono)
        return api.liberarReserva(id)
      }
      return api.updateOfrecimiento(id, b as Record<string, unknown>)
    }, ciudad)

  const deleteOfrecimiento = (id: number): Promise<unknown> =>
    mutate(() => api.deleteOfrecimiento(id), ciudad)

  const addMascota = (m: Omit<Mascota, 'id' | 'pin'>): Promise<string> =>
    mutate(async () => (await api.createMascota(m)).pin, ciudad)

  const updateMascota = (id: number, b: Partial<Mascota> & { pin?: string }): Promise<unknown> =>
    mutate(async () => {
      if (b.avistado_por !== undefined) {
        if (b.avistado_por) return api.avistarMascota(id, b.avistado_por.nombre, b.avistado_por.telefono)
        return api.updateMascota(id, { avistado_por: null } as unknown as Record<string, unknown>)
      }
      return api.updateMascota(id, b as Record<string, unknown>)
    }, ciudad)

  const deleteMascota = (id: number): Promise<unknown> =>
    mutate(() => api.deleteMascota(id), ciudad)

  const addCentro = (c: Omit<CentroAcopio, 'id'>): Promise<unknown> =>
    mutate(() => api.createCentro(c), ciudad)

  const updateCentro = (id: number, b: Partial<CentroAcopio>): Promise<unknown> =>
    mutate(() => api.updateCentro(id, b as Record<string, unknown>), ciudad)

  const deleteCentro = (id: number): Promise<unknown> =>
    mutate(() => api.deleteCentro(id), ciudad)

  const addNoticia = (n: Omit<Noticia, 'id'>): Promise<unknown> =>
    mutate(() => api.createNoticia(n), ciudad)

  const updateNoticia = (id: number, b: Partial<Noticia>): Promise<unknown> =>
    mutate(() => api.updateNoticia(id, b as Record<string, unknown>), ciudad)

  const deleteNoticia = (id: number): Promise<unknown> =>
    mutate(() => api.deleteNoticia(id), ciudad)

  const addVivienda = (v: Omit<Vivienda, 'id' | 'pin'>): Promise<string> =>
    mutate(async () => (await api.createVivienda(v)).pin, ciudad)

  const updateVivienda = (id: number, b: Partial<Vivienda> & { pin?: string }): Promise<unknown> =>
    mutate(async () => {
      if (b.interesado !== undefined) {
        if (b.interesado) return api.marcarInteresado(id, b.interesado.nombre, b.interesado.telefono)
        return api.updateVivienda(id, { interesado: null } as unknown as Record<string, unknown>)
      }
      return api.updateVivienda(id, b as Record<string, unknown>)
    }, ciudad)

  const deleteVivienda = (id: number): Promise<unknown> =>
    mutate(() => api.deleteVivienda(id), ciudad)

  const addDano = (d: Omit<ReporteDano, 'id' | 'radicado'>): Promise<string> =>
    mutate(async () => (await api.createDano(d)).radicado, ciudad)

  const updateDano = (id: number, b: Partial<ReporteDano>): Promise<unknown> =>
    mutate(() => api.updateDanoAdmin(id, b as Record<string, unknown>), ciudad)

  const deleteDano = (id: number): Promise<unknown> =>
    mutate(() => api.deleteDano(id), ciudad)

  const setSectores = useCallback((list: Sector[]) => {
    cache = { ...cache, sectores: list }
    emit()
  }, [])

  const loginAdmin = useCallback(async (password: string): Promise<boolean> => {
    const { ok } = await api.verifyAdmin(password)
    if (!ok) return false
    setAdminPass(password)
    await refresh(ciudad)
    return true
  }, [ciudad])

  const logoutAdmin = useCallback(async () => {
    setAdminPass(null)
    await refresh(ciudad)
  }, [ciudad])

  return {
    ciudad, setCiudad,
    ...data,
    setSectores,
    addSector, updateSector, deleteSector,
    addNecesidad, updateNecesidad, deleteNecesidad,
    addOfrecimiento, updateOfrecimiento, deleteOfrecimiento,
    addMascota, updateMascota, deleteMascota,
    addCentro, updateCentro, deleteCentro,
    addNoticia, updateNoticia, deleteNoticia,
    addVivienda, updateVivienda, deleteVivienda,
    addDano, updateDano, deleteDano,
    getSectorEstado,
    loginAdmin, logoutAdmin,
  }
}

export type Store = ReturnType<typeof useStore>
