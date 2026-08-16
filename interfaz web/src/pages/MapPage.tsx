import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { CSSProperties } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Store, Necesidad } from '../store'
import { TIPOS_NECESIDAD, ICONO_PUNTO_APOYO, TIPOS_AYUDA, NEED_LAYERS, needKey, needIcon } from '../data/mock'
import Modal from '../components/Modal'
import PinModal from '../components/PinModal'
import ImageInput from '../components/ImageInput'
import ChatbotWidget from '../components/ChatbotWidget'
import { uploadImage } from '../api'

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Props { store: Store; setPage: (p: string) => void; reportesSignal?: number }

/**
 * Geocodificación inversa: lat/lng → dirección legible (calle/carrera/número,
 * barrio, ciudad). Prioriza Nominatim porque da el detalle de vía y número;
 * BigDataCloud queda como respaldo (sin API key).
 */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es&addressdetails=1`
    )
    if (res.ok) {
      const d = await res.json()
      if (d.display_name) return d.display_name
      const a = d.address ?? {}
      const street = [a.road, a.house_number].filter(Boolean).join(' ')
      const parts = [street, a.neighbourhood || a.suburb, a.city || a.town || a.village, a.state, a.country].filter(Boolean)
      if (parts.length) return parts.join(', ')
    }
  } catch { /* probar fallback */ }
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`
    )
    if (res.ok) {
      const d = await res.json()
      const parts = [d.locality || d.city, d.principalSubdivision, d.countryName].filter(Boolean)
      if (parts.length) return parts.join(', ')
    }
  } catch { /* sin conexión */ }
  return null
}

function getStatusColor(estado: string) {
  if (estado === 'requiere') return '#CE1126'
  if (estado === 'en_proceso') return '#E08E00'
  if (estado === 'atendido') return '#2E9E5B'
  return '#9AA0AC'
}

/** Mini-mapa sin marcadores para colocar el punto del reporte manualmente. */
function MiniMapPicker({ initial, onPick }: {
  initial: [number, number]
  onPick: (lat: number, lng: number) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInst = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return
    const map = L.map(mapRef.current, { zoomControl: true }).setView(initial, 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)
    const place = (lat: number, lng: number) => {
      if (markerRef.current) markerRef.current.setLatLng([lat, lng])
      else {
        const mk = L.marker([lat, lng], { draggable: true }).addTo(map)
        mk.on('dragend', () => {
          const p = mk.getLatLng()
          setPoint({ lat: p.lat, lng: p.lng })
          onPick(p.lat, p.lng)
        })
        markerRef.current = mk
      }
      setPoint({ lat, lng })
      // Actualiza el formulario (coordenadas + dirección) en el mismo instante.
      onPick(lat, lng)
    }
    map.on('click', (e: L.LeafletMouseEvent) => place(e.latlng.lat, e.latlng.lng))
    mapInst.current = map
    setTimeout(() => map.invalidateSize(), 120)
    return () => { map.remove(); mapInst.current = null; markerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ border: '1.5px solid #e1e4e9', borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
      <div ref={mapRef} style={{ height: 210, width: '100%' }} />
      <div style={{ padding: 10, background: '#f8f9fb', fontSize: 11.5, color: '#6b7280' }}>
        {point ? `📍 ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : 'Haz clic en el mapa para colocar el marcador'}
      </div>
    </div>
  )
}

/** Carousel simple para mostrar las imágenes del detalle de un reporte. */
function DetailImageCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0)
  if (images.length === 0) return null
  const current = images[Math.min(idx, images.length - 1)]
  return (
    <div style={{ margin: '0 0 12px' }}>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#f4f5f7' }}>
        <img src={current} alt="Imagen del reporte" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIdx(i => (i === 0 ? images.length - 1 : i - 1))}
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: 999, background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
              aria-label="Anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setIdx(i => (i === images.length - 1 ? 0 : i + 1))}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: 999, background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
              aria-label="Siguiente"
            >
              ›
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 6 }}>
          {images.map((_, i) => (
            <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: i === idx ? '#003893' : '#D1D5DB' }} />
          ))}
        </div>
      )}
    </div>
  )
}


export default function MapPage({ store, setPage, reportesSignal = 0 }: Props) {
  const { ciudad, sectores, necesidades, puntosApoyo, eventos, mascotas, danos, noticias, ofrecimientos, viviendas,
    notificaciones, markAllRead,
    addSector, addNecesidad, addMascota, addDano, updateNecesidad, ayudarNecesidad, getSectorEstado,
    eliminarNecesidad, updateOfrecimiento, eliminarOfrecimiento, updateMascota, eliminarMascota,
    updateVivienda, eliminarVivienda, editarDano, eliminarDano, updateEvento, eliminarEvento } = store

  const isColombia = ciudad === 'Colombia'
  const matchesCiudad = (c: string | null) => isColombia || c === ciudad

  const mapRef = useRef<any>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const mascotaMarkersRef = useRef<any[]>([])
  const danoMarkersRef = useRef<any[]>([])
  const puntoMarkersRef = useRef<any[]>([])
  const eventoMarkersRef = useRef<any[]>([])
  // Registro de payloads de detalle por clave, para los botones de los popups
  const detailRegistry = useRef<Record<string, any>>({})
  const openDetailRef = useRef<(key: string) => void>(() => {})
  const [mapReady, setMapReady] = useState(false)
  const [layers, setLayers] = useState<Record<string, boolean>>(() => ({
    ...Object.fromEntries(NEED_LAYERS.map(t => [t.key, true])),
    puntos: true,
    mascotas: true,
    danos: true,
    eventos: true,
  }))
  const toggleLayer = (key: string) => setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  // Mobile UX
  const [sheetState, setSheetState] = useState<'collapsed' | 'peek' | 'full'>('collapsed')
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)
  const [reportesModalOpen, setReportesModalOpen] = useState(false)
  // Detalle del reporte seleccionado (se abre al hacer click en un ítem)
  const [detailItem, setDetailItem] = useState<any | null>(null)
  // Intentos fallidos de ubicación (tras 3 se muestra el modal de aviso)
  const [locationAttempts, setLocationAttempts] = useState(0)
  const locationAttemptsRef = useRef(0)
  const [showLocationWarning, setShowLocationWarning] = useState(false)
  const [pickedLatLng, setPickedLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const geoAddrTimer = useRef<number | null>(null)
  const [showNeedModal, setShowNeedModal] = useState<number | null>(null) // sector_id
  const [showHelpModal, setShowHelpModal] = useState<number | null>(null) // need_id
  const [showUpdateModal, setShowUpdateModal] = useState<number | null>(null) // need_id
  // Editar/eliminar cualquier reporte público con el código (PIN/radicado)
  const [editReport, setEditReport] = useState<{ tipo: string; id: number; titulo: string; sectorId?: number } | null>(null)
  const [editStep, setEditStep] = useState<'pin' | 'form'>('pin')
  const [editForm, setEditForm] = useState({ pin: '', direccion: '', descripcion: '', imagen: null as string | null })
  const [deleteReport, setDeleteReport] = useState<{ tipo: string; id: number; titulo: string } | null>(null)
  const [deletePin, setDeletePin] = useState('')
  const [pinResult, setPinResult] = useState<string | null>(null)
  const [radicadoResult, setRadicadoResult] = useState<string | null>(null)
  // Popup temporal (toast) que se autodespide: no usa alert() bloqueante
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null)
  const toastTimer = useRef<number | null>(null)
  const showToast = (msg: string, tone: 'success' | 'error' = 'success') => {
    setToast({ msg, tone })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }

  // Centro de reportes (panel de notificaciones por secciones)
  const [openSection, setOpenSection] = useState<string | null>('actividad')
  const [nFilter, setNFilter] = useState('urgentes')
  const [oFilter, setOFilter] = useState('disponibles')
  const [mFilter, setMFilter] = useState('perdidas')
  const [dFilter, setDFilter] = useState('pendientes')
  const [vFilter, setVFilter] = useState('disponibles')

  // Report form state
  const [rForm, setRForm] = useState({
    nombre: '', detalles: '', contactoTel: '',
    imagen: null as string | null,
    tipoAyuda: 'Otro',
  })
  // Need form
  const [nForm, setNForm] = useState({
    tipo: 'Comida y agua', cantidad: '', prioridad: 'alta' as const,
    detalles: '', reportado_por: '', telefono: '', imagen: null as string | null
  })
  // Help form — solo teléfono (el backend envía por WhatsApp los datos de quien necesita)
  const [hForm, setHForm] = useState({ telefono: '' })
  // Update form
  const [uForm, setUForm] = useState({
    cantidad: '', prioridad: 'alta' as const, detalles: '', estado: 'requiere' as const,
    imagen: null as string | null, pin: ''
  })

  const ciudadSectores = sectores.filter(s => matchesCiudad(s.ciudad) && s.estado === 'activo')
  const unreadCount = notificaciones.filter(n => !n.leida).length

  // Los 5 reportes pendientes más recientes (necesidades sin responsable)
  const pendingNeeds = necesidades
    .filter(n => n.estado === 'requiere' && !n.responsable && ciudadSectores.some(s => s.id === n.sector_id))
    .sort((a, b) => {
      const ta = new Date(a.fecha || '').getTime() || 0
      const tb = new Date(b.fecha || '').getTime() || 0
      return tb - ta || b.id - a.id
    })
    .slice(0, 5)

  // Actividad reciente derivada de los datos reales de la API. No filtra por
  // antigüedad: muestra los últimos reportes disponibles de todas las entidades.
  const reciente = useMemo(() => {
    const ts = (iso?: string | null) => {
      if (!iso) return 0
      const t = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso).getTime()
      return Number.isFinite(t) ? t : 0
    }
    const items: Array<{ key: string; type: string; mensaje: string; ciudad: string | null; at: string; ts: number; detail?: any }> = []

    necesidades.forEach(n => {
      const s = sectores.find(x => x.id === n.sector_id)
      items.push({
        key: `n${n.id}`,
        type: 'necesidad',
        mensaje: `Nueva necesidad: ${n.tipo}${n.cantidad ? ` (${n.cantidad})` : ''}`,
        ciudad: s?.ciudad ?? ciudad,
        at: n.fecha,
        ts: ts(n.fecha),
        detail: {
          titulo: `${needIcon(n.tipo)} ${n.tipo}`,
          detalle: n.descripcion || undefined,
          ubicacion: s?.nombre,
          telefono: n.telefono_reporta,
          lat: s?.lat, lng: s?.lng,
          imagenes: n.imagen ? [n.imagen] : undefined,
          editable: { tipo: 'necesidad', id: n.id, sectorId: n.sector_id },
        },
      })
    })
    ofrecimientos.forEach(o => {
      if (!matchesCiudad(o.ciudad)) return
      items.push({
        key: `o${o.id}`, type: 'ofrecimiento', mensaje: `Nuevo ofrecimiento: ${o.tipo}`, ciudad: o.ciudad, at: o.fecha, ts: ts(o.fecha),
        detail: {
          titulo: `🤝 ${o.tipo}`,
          detalle: o.descripcion || undefined,
          telefono: o.telefono_ofrece,
          imagenes: o.imagen ? [o.imagen] : undefined,
          editable: { tipo: 'ofrecimiento', id: o.id },
        },
      })
    })
    mascotas.forEach(m => {
      if (!matchesCiudad(m.ciudad)) return
      items.push({
        key: `m${m.id}`, type: 'mascota', mensaje: `Mascota reportada: ${m.nombre || m.tipo_animal}`, ciudad: m.ciudad, at: m.fecha_visto, ts: ts(m.fecha_visto),
        detail: {
          titulo: `🐾 ${m.nombre || m.tipo_animal}`,
          detalle: m.senas || undefined,
          ubicacion: m.lugar_visto || undefined,
          telefono: m.telefono_reporta,
          lat: m.lat, lng: m.lng,
          imagenes: m.imagen ? [m.imagen] : undefined,
          editable: { tipo: 'mascota', id: m.id },
        },
      })
    })
    viviendas.forEach(v => {
      if (!matchesCiudad(v.ciudad)) return
      items.push({
        key: `v${v.id}`, type: 'vivienda', mensaje: 'Nueva oferta de vivienda', ciudad: v.ciudad, at: v.fecha, ts: ts(v.fecha),
        detail: {
          titulo: `🏠 ${v.sector_referencia || 'Vivienda'}`,
          detalle: v.descripcion || undefined,
          telefono: v.telefono_ofrece,
          imagenes: v.imagen ? [v.imagen] : undefined,
          editable: { tipo: 'vivienda', id: v.id },
        },
      })
    })
    danos.forEach(d => {
      if (!matchesCiudad(d.ciudad)) return
      items.push({
        key: `d${d.id}`, type: 'dano', mensaje: `Nuevo reporte de daños: ${d.tipo_inmueble}`, ciudad: d.ciudad, at: d.fecha, ts: ts(d.fecha),
        detail: {
          titulo: `🏚️ ${d.tipo_inmueble} — ${d.direccion}`,
          detalle: d.descripcion || undefined,
          ubicacion: d.direccion,
          telefono: d.telefono_reportante,
          lat: d.lat, lng: d.lng,
          imagenes: d.imagen ? [d.imagen] : undefined,
          editable: { tipo: 'dano', id: d.id },
        },
      })
    })
    noticias.forEach(n => {
      if (!(n.ciudad === null || matchesCiudad(n.ciudad))) return
      items.push({ key: `i${n.id}`, type: 'noticia', mensaje: `Nueva noticia: ${n.titulo}`, ciudad: n.ciudad, at: n.fecha, ts: ts(n.fecha) })
    })
    eventos.forEach(e => {
      if (!matchesCiudad(e.ciudad)) return
      items.push({
        key: `ev${e.id}`, type: 'evento', mensaje: `Nuevo evento: ${e.titulo}`, ciudad: e.ciudad,
        at: e.fecha_inicio ?? new Date().toISOString(), ts: e.fecha_inicio ? Date.parse(e.fecha_inicio) : Date.now(),
        detail: {
          titulo: `📅 ${e.titulo}`,
          detalle: e.descripcion || undefined,
          ubicacion: e.direccion || undefined,
          telefono: e.punto?.telefono || undefined,
          lat: e.lat, lng: e.lng,
          imagenes: e.punto?.imagen ? [e.punto.imagen] : undefined,
          editable: { tipo: 'evento', id: e.id },
        },
      })
    })

    return items.sort((a, b) => b.ts - a.ts || b.key.localeCompare(a.key)).slice(0, 50)
  }, [necesidades, ofrecimientos, mascotas, viviendas, danos, noticias, eventos, sectores, ciudad])

  // Abre el modal de reportes cuando el navbar pide "Reportes"
  useEffect(() => {
    if (reportesSignal > 0) {
      setNotifPanelOpen(false)
      setReportesModalOpen(true)
    }
  }, [reportesSignal])



  // Default map center by city
  const cityCenter: Record<string, [number, number]> = {
    'Colombia': [4.2, -74.0],
    'Manizales': [5.0703, -75.5138],
    'Pereira': [4.8133, -75.6961],
    'Cali': [3.4516, -76.5320],
    'Quibdó': [5.6942, -76.6583],
    'Norte del Valle': [3.9000, -76.0000],
    'Armenia': [4.5339, -75.6811],
  }
  const center = cityCenter[ciudad] || [4.8133, -75.6961]
  const zoomForCiudad = isColombia ? 6 : 13

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const map = L.map(mapRef.current, { zoomControl: false }).setView(center, zoomForCiudad)
    // Zoom (+/-) al lado derecho
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)
    mapInstance.current = map
    setMapReady(true)
    return () => {
      map.remove()
      mapInstance.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al cambiar la ciudad (o elegir "Colombia") recentra y re-zoom el mapa.
  useEffect(() => {
    if (!mapInstance.current) return
    const target = cityCenter[ciudad] || [4.8133, -75.6961]
    mapInstance.current.setView(target, isColombia ? 6 : 13)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudad])

  // Invalidate map size when the bottom sheet changes so tiles fill correctly
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current?.invalidateSize(), 50)
    }
  }, [sheetState])

  const renderMarkers = useCallback(() => {
    if (!mapInstance.current) return
    detailRegistry.current = {}

    // — Sector markers (always shown)
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    const curSectores = sectores.filter(s => matchesCiudad(s.ciudad) && s.estado === 'activo')
    curSectores.forEach(sector => {
      const estado = getSectorEstado(sector.id)
      const color = getStatusColor(estado)
      const ns = necesidades.filter(n => n.sector_id === sector.id && n.estado === 'requiere')
      // Necesidad principal (más urgente) para el ícono del marcador
      const prioridadOrder: Record<string, number> = { alta: 0, media: 1, baja: 2 }
      const primary = ns.slice().sort((a, b) => {
        const ua = a.responsable ? 1 : 0
        const ub = b.responsable ? 1 : 0
        if (ua !== ub) return ua - ub
        return (prioridadOrder[a.prioridad] ?? 1) - (prioridadOrder[b.prioridad] ?? 1)
      })[0]
      // Sin necesidades activas → sin marcador (se quitan los "sin reportes")
      if (!primary) return
      const emoji = needIcon(primary.tipo)
      const key = needKey(primary.tipo)
      if (!layers[key]) return
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:30px;height:30px;border-radius:50%;background:#fff;border:3px solid ${color};box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:15px">${emoji}</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
      })
      const marker = L.marker([sector.lat, sector.lng], { icon }).addTo(mapInstance.current)
      const contacto = sector.contactos[0]

      const statusBadge = estado === 'requiere'
        ? '<span style="background:#fde8eb;color:#CE1126;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">🔴 REQUIERE AYUDA</span>'
        : estado === 'en_proceso'
          ? '<span style="background:#fff3e0;color:#E08E00;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">🟠 EN PROCESO</span>'
          : estado === 'atendido'
            ? '<span style="background:#e6f5ec;color:#2E9E5B;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">✅ ATENDIDO</span>'
            : '<span style="background:#f1f3f5;color:#6b7280;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">⬜ SIN REPORTES</span>'

      const needsHtml = ns.length
        ? ns.slice(0, 4).map(n => {
          detailRegistry.current[`n${n.id}`] = {
            titulo: `${needIcon(n.tipo)} ${n.tipo}`,
            detalle: n.descripcion || undefined,
            ubicacion: sector.nombre,
            telefono: n.telefono_reporta,
            lat: sector.lat, lng: sector.lng,
            imagenes: n.imagen ? [n.imagen] : undefined,
            editable: { tipo: 'necesidad', id: n.id, sectorId: n.sector_id },
          }
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;gap:6px">
              <span style="font-size:12px;font-weight:600;color:#1f2430;flex:1">${needIcon(n.tipo)} ${n.tipo}${n.cantidad ? ' — ' + n.cantidad : ''}</span>
              <div style="display:flex;gap:4px;flex-shrink:0">
                ${!n.responsable ? `<button onclick="window.__helpNeed('${n.id}')" style="background:#003893;color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:Nunito,sans-serif">🙋 Yo ayudo</button>` : '<span style="font-size:11px;color:#2E9E5B;white-space:nowrap">🙋 En proceso</span>'}
                <button onclick="window.__openDetail('n${n.id}')" style="background:#f0f4ff;color:#003893;border:none;border-radius:5px;padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:Nunito,sans-serif">Ver detalle</button>
              </div>
            </div>`
        }).join('')
          + (ns.length > 4 ? `<div style="font-size:12px;color:#003893;padding:4px 0">+${ns.length - 4} más...</div>` : '')
        : '<p style="font-size:12px;color:#6b7280;margin:4px 0">Sin necesidades activas</p>'

      marker.bindPopup(`
        <div style="min-width:210px;max-width:270px">
          <div style="margin-bottom:6px">${statusBadge}</div>
          <h4 style="margin:0 0 6px;font-size:15px;font-weight:700;color:#1f2430">${sector.nombre}</h4>
          ${contacto ? `<div style="background:#fffbea;border:1px solid #FCD116;border-radius:6px;padding:6px 8px;font-size:12px;margin-bottom:8px">📞 <strong>${contacto.nombre}</strong> · ${contacto.telefono}</div>` : ''}
          <div style="margin-bottom:4px;font-size:11px;font-weight:700;color:#9AA0AC;text-transform:uppercase;letter-spacing:.5px">Necesidades activas</div>
          ${needsHtml}
        </div>
      `, { maxWidth: 290 })
      markersRef.current.push(marker)
    })

    // — Mascota markers
    mascotaMarkersRef.current.forEach(m => m.remove())
    mascotaMarkersRef.current = []
    if (layers.mascotas) {
      mascotas.filter(m => matchesCiudad(m.ciudad) && m.estado === 'perdido').forEach(m => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:24px;height:24px;border-radius:50%;background:#7C3AED;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px">🐾</div>`,
          iconSize: [24, 24], iconAnchor: [12, 12],
        })
        const mk = L.marker([m.lat, m.lng], { icon }).addTo(mapInstance.current)
        detailRegistry.current[`m${m.id}`] = {
          titulo: `🐾 ${m.nombre || m.tipo_animal}`,
          detalle: m.senas || undefined,
          ubicacion: m.lugar_visto || undefined,
          telefono: m.telefono_reporta,
          lat: m.lat, lng: m.lng,
          imagenes: m.imagen ? [m.imagen] : undefined,
          editable: { tipo: 'mascota', id: m.id },
        }
        mk.bindPopup(`
          <div style="min-width:180px">
            <span style="background:#f3e8ff;color:#7C3AED;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">🐾 PERDIDA</span>
            <h4 style="margin:6px 0 4px;font-size:14px;font-weight:700">${m.nombre || m.tipo_animal}</h4>
            <p style="font-size:12px;color:#6b7280;margin:0 0 4px">${m.senas}</p>
            <p style="font-size:12px;margin:0 0 4px">📍 ${m.lugar_visto}</p>
            <p style="font-size:12px;margin:0 0 8px">📞 ${m.nombre_reporta} · ${m.telefono_reporta}</p>
            <button onclick="window.__openDetail('m${m.id}')" style="width:100%;background:#f0f4ff;color:#003893;border:none;border-radius:6px;padding:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif">👁 Ver detalle</button>
          </div>
        `)
        mascotaMarkersRef.current.push(mk)
      })
    }

    // — Daño markers
    danoMarkersRef.current.forEach(m => m.remove())
    danoMarkersRef.current = []
    if (layers.danos) {
      const nivelColor: Record<string, string> = { leve: '#E08E00', moderado: '#CE1126', severo: '#7f1d1d', colapso: '#1f2430' }
      danos.filter(d => matchesCiudad(d.ciudad)).forEach(d => {
        const color = nivelColor[d.nivel_percibido] || '#CE1126'
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:22px;height:22px;border-radius:4px;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:11px">🏚</div>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        })
        const mk = L.marker([d.lat, d.lng], { icon }).addTo(mapInstance.current)
        detailRegistry.current[`d${d.id}`] = {
          titulo: `🏚️ ${d.tipo_inmueble} — ${d.direccion}`,
          detalle: d.descripcion || undefined,
          ubicacion: d.direccion,
          telefono: d.telefono_reportante,
          lat: d.lat, lng: d.lng,
          imagenes: d.imagen ? [d.imagen] : undefined,
          editable: { tipo: 'dano', id: d.id },
        }
        mk.bindPopup(`
          <div style="min-width:180px">
            <span style="background:#fde8eb;color:#CE1126;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">🏚 ${d.nivel_percibido.toUpperCase()}</span>
            <h4 style="margin:6px 0 4px;font-size:14px;font-weight:700">${d.tipo_inmueble}</h4>
            <p style="font-size:12px;color:#6b7280;margin:0 0 4px">📍 ${d.direccion}</p>
            <p style="font-size:12px;color:#6b7280;margin:0 0 8px">${d.descripcion}</p>
            <button onclick="window.__openDetail('d${d.id}')" style="width:100%;background:#f0f4ff;color:#003893;border:none;border-radius:6px;padding:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif">👁 Ver detalle</button>
          </div>
        `)
        danoMarkersRef.current.push(mk)
      })
    }

    // — Puntos de apoyo: marcador con la imagen guardada
    puntoMarkersRef.current.forEach(m => m.remove())
    puntoMarkersRef.current = []
    if (layers.puntos) {
      puntosApoyo.filter(p => matchesCiudad(p.ciudad)).forEach(p => {
        const img = p.imagen
        const emoji = ICONO_PUNTO_APOYO[p.tipo] ?? '🏪'
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:38px;height:38px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);background:${p.color} url('${img}') center/cover no-repeat;display:flex;align-items:center;justify-content:center;font-size:16px">${img ? '' : emoji}</div>`,
          iconSize: [38, 38], iconAnchor: [19, 19],
        })
        const mk = L.marker([p.lat, p.lng], { icon }).addTo(mapInstance.current)
        detailRegistry.current[`p${p.id}`] = {
          titulo: `${emoji} ${p.nombre}`,
          detalle: `${p.tipo} · teléfono ${p.telefono || 'no registrado'}`,
          ubicacion: p.direccion,
          telefono: p.telefono || undefined,
          lat: p.lat, lng: p.lng,
          imagenes: p.imagen ? [p.imagen] : undefined,
        }
        mk.bindPopup(`
          <div style="min-width:200px">
            <span style="background:#e8eeff;color:#003893;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">${emoji} ${p.tipo}</span>
            ${img ? `<img src="${img}" alt="${p.nombre}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin:6px 0" />` : ''}
            <h4 style="margin:6px 0 4px;font-size:14px;font-weight:700">${p.nombre}</h4>
            <p style="font-size:12px;color:#6b7280;margin:0 0 4px">📍 ${p.direccion}</p>
            ${p.telefono ? `<p style="font-size:12px;margin:0 0 8px">📞 ${p.telefono}</p>` : ''}
            <button onclick="window.__openDetail('p${p.id}')" style="width:100%;background:#f0f4ff;color:#003893;border:none;border-radius:6px;padding:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif">👁 Ver detalle</button>
          </div>
        `)
        puntoMarkersRef.current.push(mk)
      })
    }

    // — Eventos vigentes: marcador pulsante con el color del punto de apoyo
    eventoMarkersRef.current.forEach(m => m.remove())
    eventoMarkersRef.current = []
    if (layers.eventos) {
      const now = Date.now()
      const vigentes = eventos.filter(e => {
        if (!matchesCiudad(e.ciudad) || !e.activo) return false
        const ini = e.fecha_inicio ? new Date(e.fecha_inicio).getTime() : 0
        const fin = e.fecha_fin ? new Date(e.fecha_fin).getTime() : Infinity
        return now >= ini && now <= fin
      })
      vigentes.forEach(e => {
        const color = e.punto?.color ?? '#003893'
        const img = e.punto?.imagen ?? ''
        const icon = L.divIcon({
          className: '',
          html: `
            <div class="evt-marker" style="--evc:${color}">
              <span class="evt-ping"></span>
              <div class="evt-core"${img ? ` style="background-image:url('${img}')"` : ''}>
                <span class="evt-badge">📅</span>
              </div>
            </div>`,
          iconSize: [34, 34], iconAnchor: [17, 17],
        })
        const mk = L.marker([e.lat, e.lng], { icon }).addTo(mapInstance.current)
        detailRegistry.current[`ev${e.id}`] = {
          titulo: `📅 ${e.titulo}`,
          detalle: e.descripcion || undefined,
          ubicacion: e.direccion || undefined,
          telefono: e.punto?.telefono || undefined,
          lat: e.lat, lng: e.lng,
          imagenes: e.punto?.imagen ? [e.punto.imagen] : undefined,
          editable: { tipo: 'evento', id: e.id },
        }
        mk.bindPopup(`
          <div style="min-width:190px">
            <span style="background:#e8f5e9;color:#2E9E5B;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">📅 EVENTO ACTIVO</span>
            <h4 style="margin:6px 0 4px;font-size:14px;font-weight:700">${e.titulo}</h4>
            <p style="font-size:12px;color:#6b7280;margin:0 0 4px">🏪 ${e.punto?.nombre ?? 'Punto de apoyo'}</p>
            ${e.direccion ? `<p style="font-size:12px;color:#6b7280;margin:0 0 4px">📍 ${e.direccion}</p>` : ''}
            ${e.descripcion ? `<p style="font-size:12px;color:#6b7280;margin:0 0 8px">${e.descripcion}</p>` : ''}
            <button onclick="window.__openDetail('ev${e.id}')" style="width:100%;background:#f0f4ff;color:#003893;border:none;border-radius:6px;padding:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif">👁 Ver detalle</button>
          </div>
        `)
        eventoMarkersRef.current.push(mk)
      })
    }
  }, [sectores, necesidades, puntosApoyo, eventos, mascotas, danos, ciudad, getSectorEstado, layers])

  useEffect(() => {
    renderMarkers()
  }, [renderMarkers])

  // Wire global callbacks for popup buttons
  useEffect(() => {
    (window as any).__helpNeed = (needId: string) => {
      setShowHelpModal(Number(needId))
      if (mapInstance.current) mapInstance.current.closePopup()
    }
    ;(window as any).__openDetail = (key: string) => openDetailRef.current(key)
    return () => {
      delete (window as any).__helpNeed
      delete (window as any).__openDetail
    }
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => renderMarkers(), 30000)
    return () => clearInterval(interval)
  }, [renderMarkers])

  /** Aplica el punto elegido en el mini-mapa: coordenadas + dirección por geocodificación inversa. */
  const applyMiniPoint = (lat: number, lng: number) => {
    setPickedLatLng({ lat, lng })
    // Mantén el mini-mapa abierto para que el usuario pueda seguir ajustando
    // el marcador y ver la sincronización en ambos sentidos.
    reverseGeocode(lat, lng).then(addr => {
      if (addr) setRForm(p => ({ ...p, nombre: addr }))
    })
  }

  /** Al editar la dirección, actualiza las coordenadas del marcador (geocodificación con retardo). */
  const onReportAddressChange = (v: string) => {
    setRForm(p => ({ ...p, nombre: v }))
    if (geoAddrTimer.current) clearTimeout(geoAddrTimer.current)
    if (v.trim().length < 5) return
    geoAddrTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(v)}`)
        const data = await res.json()
        if (Array.isArray(data) && data.length) {
          setPickedLatLng({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
        }
      } catch { /* sin conexión */ }
    }, 900)
  }

  /**
   * Cuenta un intento fallido de obtener la ubicación. Al llegar a 3
   * muestra el modal de aviso sobre el permiso del navegador.
   */
  const registerLocationFailure = () => {
    locationAttemptsRef.current += 1
    setLocationAttempts(locationAttemptsRef.current)
    if (locationAttemptsRef.current >= 3) setShowLocationWarning(true)
  }

  /**
   * Obtiene la ubicación pidiéndosela directamente al navegador (sin confirm
   * propio: el prompt nativo ES el permiso). En éxito rellena coordenadas +
   * dirección y, si `openOnSuccess`, abre el modal de reporte.
   * Tras 3 fallos seguidos muestra un modal de aviso sobre el permiso.
   */
  const geolocate = (openOnSuccess = false) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      registerLocationFailure()
      return
    }

    const onOk = (pos: GeolocationPosition) => {
      locationAttemptsRef.current = 0
      setLocationAttempts(0)
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      setPickedLatLng({ lat, lng })
      setRForm(p => (p.nombre.trim() ? p : { ...p, nombre: 'Obteniendo dirección...' }))
      reverseGeocode(lat, lng).then(addr => {
        setRForm(p => (p.nombre === 'Obteniendo dirección...' ? { ...p, nombre: addr ?? '' } : p))
      })
      if (openOnSuccess) setShowReportModal(true)
    }

    const opts: PositionOptions = { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    // Llamamos siempre a getCurrentPosition: el navegador es quien decide si
    // muestra el prompt, devuelve la posición (ya autorizado) o llama al error
    // (cancelado/denegado). Así vuelve a preguntar tras un "Cancelar" previo.
    navigator.geolocation.getCurrentPosition(onOk, registerLocationFailure, opts)
  }

  /** 🆘 NECESITO AYUDA: pide la ubicación al navegador; el modal abre solo si hay permiso. */
  const handleNecesitoAyuda = () => {
    geolocate(true)
  }

  const submitReport = async () => {
    if (!rForm.detalles.trim()) { alert('La descripción es obligatoria'); return }
    if (!rForm.contactoTel.trim()) { alert('Tu teléfono es obligatorio'); return }
    const direccion = rForm.nombre.trim()
    if (!pickedLatLng && !direccion) {
      alert('Necesitamos una ubicación o una dirección: usa "📍 Usar mi ubicación", el botón "🗺️" junto a la dirección o escribe la dirección manualmente.')
      return
    }

    const tipoAyuda = rForm.tipoAyuda || 'Otro'
    const tel = rForm.contactoTel.trim()
    const desc = rForm.detalles.trim()

    // Si no se pudo obtener la ubicación, usa el centro de la ciudad actual
    // para que el reporte quede geolocalizado y pueda localizarse en el mapa.
    const fallback = cityCenter[ciudad] || cityCenter.Manizales
    const coords = pickedLatLng || { lat: fallback[0], lng: fallback[1] }
    const resetForm = () => setRForm({ nombre: '', detalles: '', contactoTel: '', imagen: null, tipoAyuda: 'Otro' })

    // 🐾 Mascotas perdidas → se guarda como mascota (tiene su propio tab y marcadores).
    if (tipoAyuda === 'Mascotas perdidas') {
      const pin = await addMascota({
        ciudad,
        nombre: '',
        tipo_animal: 'No especificado',
        senas: desc,
        imagen: rForm.imagen,
        lat: coords.lat, lng: coords.lng,
        lugar_visto: direccion || 'Ubicación en el mapa',
        fecha_visto: new Date().toISOString(),
        estado: 'perdido',
        nombre_reporta: 'Persona que reporta',
        telefono_reporta: tel,
        avistado_por: null,
      })
      if (!pin) return
      setShowReportModal(false)
      setRadicadoResult(null)
      setPinResult(pin)
      resetForm()
      return
    }

    // 🏚️ Daños → se guarda como reporte de daños (tab de daños, con radicado).
    if (tipoAyuda === 'Daños') {
      const radicado = await addDano({
        ciudad,
        tipo_inmueble: 'No especificado',
        direccion: direccion || 'Reporte de daños',
        lat: coords.lat, lng: coords.lng,
        habitado: 'si',
        nivel_percibido: 'moderado',
        descripcion: desc,
        imagen: rForm.imagen,
        estado: 'pendiente',
        nombre_reportante: 'Persona que reporta',
        telefono_reportante: tel,
        cedula: null,
        fecha: new Date().toISOString(),
        fecha_visita: null,
        resultado_visita: null,
        notas_admin: null,
      })
      if (!radicado) return
      setShowReportModal(false)
      setPinResult(null)
      setRadicadoResult(radicado)
      resetForm()
      return
    }

    // Resto de tipos (necesidades y puntos de apoyo) → sector + necesidad.
    const sector = await addSector({
      ciudad,
      nombre: direccion || 'Reporte de ayuda',
      barrio: '',
      lat: coords.lat, lng: coords.lng,
      descripcion: desc, nivel_afectacion: 'leve', estado: 'activo',
      contactos: [{ id: 0, nombre: 'Persona que reporta', telefono: tel, rol: 'Coordinador' }]
    })
    if (!sector) return
    const pin = await addNecesidad({
      sector_id: sector.id, tipo: tipoAyuda, descripcion: desc,
      cantidad: '', prioridad: 'alta', estado: 'requiere',
      responsable: null, reportado_por: 'Persona que reporta',
      telefono_reporta: tel, fecha: new Date().toISOString(), imagen: rForm.imagen
    })
    if (!pin) return
    setShowReportModal(false)
    setRadicadoResult(null)
    setPinResult(pin)
    resetForm()
  }

  const submitNeed = async () => {
    if (!showNeedModal) return
    if (!nForm.reportado_por.trim()) { alert('Tu nombre es obligatorio'); return }
    if (!nForm.telefono.trim()) { alert('Tu teléfono es obligatorio'); return }
    const pin = await addNecesidad({
      sector_id: showNeedModal, tipo: nForm.tipo, descripcion: nForm.detalles,
      cantidad: nForm.cantidad, prioridad: nForm.prioridad, estado: 'requiere',
      responsable: null, reportado_por: nForm.reportado_por,
      telefono_reporta: nForm.telefono, fecha: new Date().toISOString(), imagen: nForm.imagen
    })
    if (!pin) return
    setShowNeedModal(null)
    setPinResult(pin)
  }

  const submitHelp = async () => {
    if (!showHelpModal) return
    if (!hForm.telefono.trim()) { alert('Tu teléfono es obligatorio'); return }
    const r = await ayudarNecesidad(showHelpModal, hForm.telefono.trim())
    if (!r) return
    setShowHelpModal(null)
    setHForm({ telefono: '' })
    alert(r.whatsapp
      ? '¡Gracias! Te enviamos por WhatsApp la información de quien necesita ayuda (teléfono y ubicación).'
      : '¡Gracias! Quedaste registrado. (El envío por WhatsApp aún no está configurado.)')
  }

  const submitUpdate = async () => {
    if (!showUpdateModal) return
    const need = necesidades.find(n => n.id === showUpdateModal)
    if (!need) return
    if (!uForm.pin.trim()) { alert('Ingresa el código de 4 dígitos que se te dio al publicar.'); return }
    const r = await updateNecesidad(showUpdateModal, {
      cantidad: uForm.cantidad || need.cantidad,
      prioridad: uForm.prioridad,
      descripcion: uForm.detalles || need.descripcion,
      estado: uForm.estado,
      imagen: uForm.imagen || need.imagen,
      pin: uForm.pin.trim(),
    })
    if (!r) return
    setShowUpdateModal(null)
    showToast('✅ Necesidad actualizada correctamente.')
  }

  // ── Editar / eliminar reporte propio (PIN o radicado) ──
  const openEdit = (e: { tipo: string; id: number; sectorId?: number }) => {
    const d = detailItem ?? {}
    setEditForm({
      pin: '',
      direccion: d.ubicacion ?? '',
      descripcion: d.detalle ?? '',
      imagen: d.imagenes?.[0] ?? null,
    })
    setEditReport({ ...e, titulo: d.titulo ?? '' })
    setEditStep('pin')
  }

  const openDelete = (e: { tipo: string; id: number }) => {
    setDeletePin('')
    setDeleteReport({ ...e, titulo: detailItem?.titulo ?? '' })
  }

  const submitEditReport = async () => {
    if (!editReport) return
    const codigo = editForm.pin.trim()
    if (!codigo) {
      alert(editReport.tipo === 'dano'
        ? 'Ingresa el número de radicado para poder editar.'
        : 'Ingresa el código de 4 dígitos que se te dio al publicar.')
      return
    }

    // Sube la imagen a Cloudinary si el usuario eligió una nueva
    let imagen: string | undefined
    if (editForm.imagen) {
      imagen = editForm.imagen.startsWith('data:')
        ? (await uploadImage(editForm.imagen)).path
        : editForm.imagen
    }

    let r: unknown
    if (editReport.tipo === 'necesidad') {
      r = await updateNecesidad(editReport.id, {
        descripcion: editForm.descripcion || undefined,
        imagen,
        direccion_sector: editForm.direccion || undefined,
        pin: codigo,
      })
    } else if (editReport.tipo === 'ofrecimiento') {
      r = await updateOfrecimiento(editReport.id, {
        descripcion: editForm.descripcion || undefined,
        imagen,
        pin: codigo,
      })
    } else if (editReport.tipo === 'mascota') {
      r = await updateMascota(editReport.id, {
        lugar_visto: editForm.direccion || undefined,
        senas: editForm.descripcion || undefined,
        imagen,
        pin: codigo,
      })
    } else if (editReport.tipo === 'vivienda') {
      r = await updateVivienda(editReport.id, {
        sector_referencia: editForm.direccion || undefined,
        descripcion: editForm.descripcion || undefined,
        imagen,
        pin: codigo,
      })
    } else if (editReport.tipo === 'evento') {
      r = await updateEvento(editReport.id, {
        direccion: editForm.direccion || undefined,
        descripcion: editForm.descripcion || undefined,
        pin: codigo,
      })
    } else {
      r = await editarDano(editReport.id, {
        radicado: codigo,
        direccion: editForm.direccion || undefined,
        descripcion: editForm.descripcion || undefined,
        imagen,
      })
    }
    if (!r) return
    setEditReport(null)
    setDetailItem(null)
    showToast('✅ Reporte actualizado.')
  }

  const submitDeleteReport = async () => {
    if (!deleteReport) return
    const codigo = deletePin.trim()
    if (!codigo) {
      alert(deleteReport.tipo === 'dano'
        ? 'Ingresa el número de radicado para poder eliminar.'
        : 'Ingresa el código de 4 dígitos que se te dio al publicar.')
      return
    }
    let r: unknown
    if (deleteReport.tipo === 'necesidad') r = await eliminarNecesidad(deleteReport.id, codigo)
    else if (deleteReport.tipo === 'ofrecimiento') r = await eliminarOfrecimiento(deleteReport.id, codigo)
    else if (deleteReport.tipo === 'mascota') r = await eliminarMascota(deleteReport.id, codigo)
    else if (deleteReport.tipo === 'vivienda') r = await eliminarVivienda(deleteReport.id, codigo)
    else if (deleteReport.tipo === 'evento') r = await eliminarEvento(deleteReport.id, codigo)
    else r = await eliminarDano(deleteReport.id, codigo)
    if (!r) return
    setDeleteReport(null)
    setDetailItem(null)
    showToast('🗑 Reporte eliminado. La modificación quedó registrada en la auditoría.')
  }

  const centerOnSector = (sectorId: number) => {
    const s = sectores.find(x => x.id === sectorId)
    if (!s || !mapInstance.current) return
    mapInstance.current.setView([s.lat, s.lng], 15)
    const marker = markersRef.current[ciudadSectores.indexOf(s)]
    if (marker) marker.openPopup()
  }

  const centerOn = (lat: number, lng: number) => {
    if (!mapInstance.current) return
    setReportesModalOpen(false)
    mapInstance.current.setView([lat, lng], 15)
    if (sheetState === 'full') setSheetState('peek')
  }

  /** Normaliza un teléfono para el enlace wa.me (código de país +57). */
  const waNumber = (tel?: string | null) => {
    const d = (tel || '').replace(/\D/g, '')
    if (d.length === 10) return `57${d}`
    if (d.startsWith('57') && d.length === 12) return d
    return d
  }

  /** Abre el detalle de un reporte y centra el mapa en su ubicación (si tiene). */
  const openDetail = (item: { titulo: string; detalle?: string; ubicacion?: string; telefono?: string; lat?: number; lng?: number; imagenes?: string[]; editable?: { tipo: string; id: number; sectorId?: number } }) => {
    setReportesModalOpen(false)
    setDetailItem(item)
    if (item.lat != null && item.lng != null && mapInstance.current) {
      mapInstance.current.setView([item.lat, item.lng], 15)
      if (sheetState === 'full') setSheetState('peek')
    }
  }

  // Mantiene el callback de los popups apuntando al openDetail más reciente
  useEffect(() => {
    openDetailRef.current = (key: string) => {
      const item = detailRegistry.current[key]
      if (item) {
        if (mapInstance.current) mapInstance.current.closePopup()
        openDetail(item)
      }
    }
  })

  const timeAgo = (iso: string) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return 'ahora'
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`
    if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
    return `hace ${Math.max(1, Math.floor(s / 86400))} d`
  }

  const NOTIF_ICONS: Record<string, string> = {
    sector: '📍', necesidad: '🆘', ofrecimiento: '🤝', mascota: '🐾',
    noticia: '📰', vivienda: '🏠', dano: '🏚️', centro: '📦', punto_apoyo: '🏪',
  }

  // Ítem de reporte pendiente reutilizable (notificaciones + centro de reportes)
  const renderPendingItem = (n: Necesidad) => {
    const sector = sectores.find(s => s.id === n.sector_id)
    return (
      <div key={n.id} onClick={() => openDetail({
        titulo: `${needIcon(n.tipo)} ${n.tipo}`,
        detalle: n.descripcion || undefined,
        ubicacion: sector?.nombre,
        telefono: n.telefono_reporta,
        lat: sector?.lat, lng: sector?.lng,
        imagenes: n.imagen ? [n.imagen] : undefined,
        editable: { tipo: 'necesidad', id: n.id, sectorId: n.sector_id },
      })} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'flex-start', cursor: 'pointer' }}>
        <span style={{ fontSize: 15 }}>🆘</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#1f2430' }}>{needIcon(n.tipo)} {n.tipo}{n.cantidad ? ` — ${n.cantidad}` : ''}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9AA0AC' }}>📍 {sector?.nombre ?? 'Sector'}{n.fecha ? ` · ${timeAgo(n.fecha)}` : ''}</p>
        </div>
        <span className="tag tag-red" style={{ fontSize: 9, flexShrink: 0 }}>PENDIENTE</span>
      </div>
    )
  }

  // Chips de filtro reutilizables dentro de cada sección del panel
  const Chips = ({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0 6px' }}>
      {options.map(o => (
        <button key={o.id} className={`chip ${value === o.id ? 'active' : ''}`} style={{ fontSize: 11 }}
          onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  )

  // Encabezado colapsable (dropdown) de cada sección del centro de reportes
  const ReportSection = ({ id, icon, title, count, badge, children }: { id: string; icon: string; title: string; count: number; badge?: React.ReactNode; children: React.ReactNode }) => {
    const open = openSection === id
    return (
      <div style={{ borderBottom: '1px solid #f0f0f0' }}>
        <button
          onClick={() => setOpenSection(prev => {
            const next = prev === id ? null : id
            if (next === 'actividad') markAllRead()
            return next
          })}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', textAlign: 'left' }}
        >
          <span style={{ fontSize: 15 }}>{icon}</span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: '#1f2430' }}>{title}</span>
          {badge}
          <span style={{ color: '#9AA0AC', fontSize: 12, fontWeight: 700 }}>{count}</span>
          <span style={{ color: '#9AA0AC', fontSize: 11, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▼</span>
        </button>
        {open && <div style={{ padding: '0 16px 12px' }}>{children}</div>}
      </div>
    )
  }

  // ── Centro de reportes: actividad + secciones por entidad ──
  const ReportesPanel = () => {
    const unread = notificaciones.filter(n => !n.leida).length
    const prioridadOrder: Record<string, number> = { alta: 0, media: 1, baja: 2 }

    const nsDeCiudad = necesidades.filter(n => ciudadSectores.some(s => s.id === n.sector_id))
    const nsFiltered = nsDeCiudad
      .filter(n =>
        nFilter === 'urgentes' ? (n.estado === 'requiere' && !n.responsable)
        : nFilter === 'en_proceso' ? (n.estado === 'requiere' && n.responsable)
        : nFilter === 'atendidas' ? n.estado === 'atendida'
        : true)
      .sort((a, b) => {
        const ua = a.estado === 'requiere' && !a.responsable ? 0 : a.estado === 'requiere' ? 1 : 2
        const ub = b.estado === 'requiere' && !b.responsable ? 0 : b.estado === 'requiere' ? 1 : 2
        if (ua !== ub) return ua - ub
        return (prioridadOrder[a.prioridad] ?? 1) - (prioridadOrder[b.prioridad] ?? 1)
      })

    const ofs = ofrecimientos
      .filter(o => matchesCiudad(o.ciudad))
      .filter(o =>
        oFilter === 'disponibles' ? (o.estado === 'disponible' && !o.reservado_por)
        : oFilter === 'reservados' ? (o.estado === 'disponible' && o.reservado_por)
        : oFilter === 'entregados' ? o.estado === 'entregado'
        : true)

    const ms = mascotas
      .filter(m => matchesCiudad(m.ciudad))
      .filter(m => mFilter === 'perdidas' ? m.estado === 'perdido' : mFilter === 'encontradas' ? m.estado === 'encontrado' : true)

    const ds = danos
      .filter(d => matchesCiudad(d.ciudad))
      .filter(d =>
        dFilter === 'pendientes' ? d.estado === 'pendiente'
        : dFilter === 'visita' ? d.estado === 'visita_programada'
        : dFilter === 'visitados' ? d.estado === 'visitado'
        : true)

    const vs = viviendas
      .filter(v => matchesCiudad(v.ciudad))
      .filter(v => vFilter === 'disponibles' ? v.estado === 'disponible' : vFilter === 'ocupadas' ? v.estado === 'ocupado' : true)

    const nsNoticias = noticias.filter(n => n.ciudad === null || matchesCiudad(n.ciudad))

    return (
      <div>
        {/* 🔔 Actividad reciente — notificaciones en tiempo real */}
        <ReportSection id="actividad" icon="🔔" title="Actividad reciente" count={reciente.length}
          badge={unread > 0 ? <span className="tag tag-red" style={{ fontSize: 10 }}>{unread} nuevas</span> : null}>
          {pendingNeeds.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#CE1126', margin: '8px 0 4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🆘 Últimos pendientes</p>
              {pendingNeeds.map(n => renderPendingItem(n))}
            </>
          )}
          {reciente.length === 0 ? (
            <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0' }}>
              Sin actividad todavía. Cuando alguien reporte una necesidad, una mascota, un ofrecimiento,
              una vivienda o un daño —o se publique una noticia— aparecerá aquí en tiempo real.
            </p>
          ) : (
            reciente.map(n => (
              <div
                key={n.key}
                onClick={() => {
                  if (n.type === 'noticia') setPage('noticias')
                  else if (n.detail) openDetail(n.detail)
                }}
                style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'flex-start', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 16 }}>{NOTIF_ICONS[n.type] ?? '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: '#1f2430' }}>{n.mensaje}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9AA0AC' }}>{n.ciudad ?? 'Todas las ciudades'} · {timeAgo(n.at)}</p>
                </div>
              </div>
            ))
          )}
        </ReportSection>

        {/* 📍 Sectores */}

        {/* 🆘 Necesidades (alimentos y demás) */}
        <ReportSection id="necesidades" icon="🆘" title="Necesidades" count={nsDeCiudad.length}>
          <Chips value={nFilter} onChange={setNFilter} options={[
            { id: 'urgentes', label: '🟥 Urgentes' },
            { id: 'en_proceso', label: '🟠 En proceso' },
            { id: 'atendidas', label: '✅ Atendidas' },
            { id: 'todos', label: 'Todas' },
          ]} />
          {nsFiltered.length === 0 && <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0' }}>Sin necesidades con este filtro.</p>}
          {nsFiltered.map(n => {
            const sector = sectores.find(s => s.id === n.sector_id)
            const urgente = n.estado === 'requiere' && !n.responsable
            return (
              <div key={n.id} onClick={() => openDetail({
                titulo: `${needIcon(n.tipo)} ${n.tipo}`,
                detalle: n.descripcion || undefined,
                ubicacion: sector?.nombre,
                telefono: n.telefono_reporta,
                lat: sector?.lat, lng: sector?.lng,
                imagenes: n.imagen ? [n.imagen] : undefined,
                editable: { tipo: 'necesidad', id: n.id, sectorId: n.sector_id },
              })} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2430' }}>{needIcon(n.tipo)} {n.tipo}{n.cantidad ? ` — ${n.cantidad}` : ''}</span>
                  <span className={urgente ? 'tag tag-red' : n.estado === 'atendida' ? 'tag tag-green' : 'tag tag-orange'} style={{ fontSize: 10, flexShrink: 0 }}>
                    {urgente ? '🔴 Urgente' : n.estado === 'atendida' ? '✅ Atendida' : '🟠 En proceso'}
                  </span>
                </div>
                <p style={{ margin: '2px 0', fontSize: 11.5, color: '#6b7280' }}>📍 {sector?.nombre ?? 'Sector'}</p>
                {urgente && (
                  <button onClick={(e) => { e.stopPropagation(); setShowHelpModal(n.id) }} className="btn btn-primary btn-sm" style={{ marginTop: 4 }}>🙋 Yo ayudo</button>
                )}
                {n.responsable && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#2E9E5B' }}>🙋 {n.responsable.nombre}</p>}
              </div>
            )
          })}
        </ReportSection>

        {/* 🤝 Ofrecimientos */}
        <ReportSection id="ofrecimientos" icon="🤝" title="Ofrecimientos" count={ofrecimientos.filter(o => matchesCiudad(o.ciudad)).length}>
          <Chips value={oFilter} onChange={setOFilter} options={[
            { id: 'disponibles', label: '🟢 Disponibles' },
            { id: 'reservados', label: '🟠 Reservados' },
            { id: 'entregados', label: '✅ Entregados' },
            { id: 'todos', label: 'Todos' },
          ]} />
          {ofs.length === 0 && <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0' }}>Sin ofrecimientos con este filtro.</p>}
          {ofs.map(o => (
            <div key={o.id} onClick={() => openDetail({
              titulo: `🤝 ${o.tipo}`,
              detalle: o.descripcion || undefined,
              telefono: o.telefono_ofrece,
              imagenes: o.imagen ? [o.imagen] : undefined,
              editable: { tipo: 'ofrecimiento', id: o.id },
            })} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2430' }}>{o.tipo}{o.cantidad ? ` — ${o.cantidad}` : ''}</span>
                <span className={o.estado === 'entregado' ? 'tag tag-gray' : o.reservado_por ? 'tag tag-orange' : 'tag tag-green'} style={{ fontSize: 10, flexShrink: 0 }}>
                  {o.estado === 'entregado' ? '✅ Entregado' : o.reservado_por ? '🟠 Reservado' : '🟢 Disponible'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#6b7280' }}>🤝 {o.nombre_ofrece}</p>
            </div>
          ))}
        </ReportSection>

        {/* 🐾 Mascotas */}
        <ReportSection id="mascotas" icon="🐾" title="Mascotas" count={mascotas.filter(m => matchesCiudad(m.ciudad)).length}>
          <Chips value={mFilter} onChange={setMFilter} options={[
            { id: 'perdidas', label: '🔴 Perdidas' },
            { id: 'encontradas', label: '✅ Encontradas' },
            { id: 'todos', label: 'Todas' },
          ]} />
          {ms.length === 0 && <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0' }}>Sin mascotas con este filtro.</p>}
          {ms.map(m => (
            <div key={m.id} onClick={() => openDetail({
              titulo: `🐾 ${m.nombre || m.tipo_animal}`,
              detalle: m.senas || undefined,
              ubicacion: m.lugar_visto || undefined,
              telefono: m.telefono_reporta,
              lat: m.lat, lng: m.lng,
              imagenes: m.imagen ? [m.imagen] : undefined,
              editable: { tipo: 'mascota', id: m.id },
            })} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2430' }}>{m.nombre || m.tipo_animal}</span>
                <span className={m.estado === 'perdido' ? 'tag tag-red' : 'tag tag-green'} style={{ fontSize: 10, flexShrink: 0 }}>
                  {m.estado === 'perdido' ? '🔴 Perdida' : '✅ Encontrada'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#6b7280' }}>📍 {m.lugar_visto || 'Sin lugar'}</p>
            </div>
          ))}
        </ReportSection>

        {/* 🏠 Viviendas */}
        <ReportSection id="viviendas" icon="🏠" title="Viviendas" count={viviendas.filter(v => matchesCiudad(v.ciudad)).length}>
          <Chips value={vFilter} onChange={setVFilter} options={[
            { id: 'disponibles', label: '🟢 Disponibles' },
            { id: 'ocupadas', label: '⚪ Ocupadas' },
            { id: 'todos', label: 'Todas' },
          ]} />
          {vs.length === 0 && <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0' }}>Sin ofertas con este filtro.</p>}
          {vs.map(v => (
            <div key={v.id} onClick={() => openDetail({
              titulo: `🏠 ${v.sector_referencia || 'Vivienda'}`,
              detalle: v.descripcion || undefined,
              telefono: v.telefono_ofrece,
              imagenes: v.imagen ? [v.imagen] : undefined,
              editable: { tipo: 'vivienda', id: v.id },
            })} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2430' }}>{v.sector_referencia || 'Vivienda'}</span>
                <span className={v.estado === 'ocupado' ? 'tag tag-gray' : v.tipo === 'alquiler' ? 'tag tag-orange' : 'tag tag-green'} style={{ fontSize: 10, flexShrink: 0 }}>
                  {v.estado === 'ocupado' ? '⚪ Ocupada' : v.tipo === 'alquiler' ? '💰 Alquiler' : '🏠 Gratis'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#6b7280' }}>👥 {v.capacidad} · 🕒 {v.tiempo_disponible}</p>
            </div>
          ))}
        </ReportSection>

        {/* 🏚️ Daños */}
        {(isColombia || ciudad === 'Manizales') && (
          <ReportSection id="danos" icon="🏚️" title="Daños estructurales" count={danos.filter(d => matchesCiudad(d.ciudad)).length}>
            <Chips value={dFilter} onChange={setDFilter} options={[
              { id: 'pendientes', label: '🔴 Pendientes' },
              { id: 'visita', label: '🟠 Con visita' },
              { id: 'visitados', label: '✅ Visitados' },
              { id: 'todos', label: 'Todos' },
            ]} />
            {ds.length === 0 && <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0' }}>Sin reportes con este filtro.</p>}
            {ds.map(d => (
              <div key={d.id} onClick={() => openDetail({
                titulo: `🏚️ ${d.tipo_inmueble} — ${d.direccion}`,
                detalle: d.descripcion || undefined,
                ubicacion: d.direccion,
                telefono: d.telefono_reportante,
                lat: d.lat, lng: d.lng,
                imagenes: d.imagen ? [d.imagen] : undefined,
                editable: { tipo: 'dano', id: d.id },
              })} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2430' }}>{d.tipo_inmueble} — {d.direccion}</span>
                  <span className={d.estado === 'pendiente' ? 'tag tag-red' : d.estado === 'visita_programada' ? 'tag tag-orange' : 'tag tag-green'} style={{ fontSize: 10, flexShrink: 0 }}>
                    {d.estado === 'pendiente' ? '🔴 Pendiente' : d.estado === 'visita_programada' ? '🟠 Visita' : '✅ Visitado'}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9AA0AC' }}>Nivel: {d.nivel_percibido}</p>
              </div>
            ))}
          </ReportSection>
        )}

        {/* 📰 Noticias */}
        <ReportSection id="noticias" icon="📰" title="Noticias" count={nsNoticias.length}>
          {nsNoticias.length === 0 && <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0' }}>Sin comunicados publicados.</p>}
          {nsNoticias.map(n => (
            <div key={n.id} onClick={() => setPage('noticias')} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#003893' }}>{n.titulo} <span style={{ fontSize: 11, color: '#9AA0AC', fontWeight: 400 }}>→ ver</span></p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9AA0AC' }}>✍️ {n.autor || 'Equipo'} · {timeAgo(n.fecha + 'T00:00:00Z')}</p>
            </div>
          ))}
        </ReportSection>
      </div>
    )
  }

  // Layer toggle buttons (shared between desktop and mobile)
  // compact: en móvil se muestran solo con ícono para ocupar menos espacio
  const LayerToggles = ({ bottomOffset = 60, compact = false }: { bottomOffset?: number; compact?: boolean }) => {
    const buttons = [
      ...NEED_LAYERS.filter(t => t.key !== 'mascotas').map(t => ({
        key: t.key,
        icon: t.icon,
        label: t.label.split(' ').slice(1).join(' ') || t.label,
      })),
      { key: 'puntos', icon: '🏪', label: 'Puntos de apoyo' },
      { key: 'eventos', icon: '📅', label: 'Eventos' },
      { key: 'mascotas', icon: '🐾', label: 'Mascotas perdidas' },
      { key: 'danos', icon: '🏚️', label: 'Daños' },
    ]
    const allOn = buttons.every(b => layers[b.key])

    const chipStyle = (active: boolean): CSSProperties => compact
      ? {
          pointerEvents: 'auto',
          background: active ? '#FCD116' : '#E5E7EB',
          color: active ? '#1f2430' : '#6B7280',
          border: '1px solid ' + (active ? '#E8B800' : '#D1D5DB'),
          borderRadius: 18, width: 34, height: 34, padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, lineHeight: 1, cursor: 'pointer',
          boxShadow: '0 1px 5px rgba(0,0,0,0.18)', backdropFilter: 'blur(4px)',
          fontFamily: 'Nunito, sans-serif', opacity: active ? 1 : 0.82,
        }
      : {
          pointerEvents: 'auto',
          background: active ? '#FCD116' : '#E5E7EB',
          color: active ? '#1f2430' : '#6B7280',
          border: '1px solid ' + (active ? '#E8B800' : '#D1D5DB'),
          borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 1px 5px rgba(0,0,0,0.18)', backdropFilter: 'blur(4px)',
          fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap', opacity: active ? 1 : 0.82,
        }

    return (
      <>
        <div style={{ position: 'absolute', bottom: bottomOffset, left: 10, zIndex: 400, display: 'flex', flexDirection: 'column', gap: compact ? 4 : 5, maxHeight: 'calc(100% - 90px)', overflowY: 'auto', paddingRight: 2, pointerEvents: 'none' }}>
          <button
            onClick={() => setLayers(prev => {
              const next = !allOn
              return Object.fromEntries(Object.keys(prev).map(k => [k, next]))
            })}
            title={allOn ? 'Ocultar todas las capas' : 'Mostrar todas las capas'}
            style={{
              pointerEvents: 'auto',
              background: allOn ? '#FCD116' : '#E5E7EB',
              color: allOn ? '#1f2430' : '#6B7280',
              border: '1px solid ' + (allOn ? '#E8B800' : '#D1D5DB'),
              borderRadius: compact ? 18 : 20,
              width: compact ? 34 : undefined, height: compact ? 34 : undefined, padding: compact ? 0 : '4px 10px',
              display: compact ? 'flex' : undefined, alignItems: compact ? 'center' : undefined, justifyContent: compact ? 'center' : undefined,
              fontSize: compact ? 16 : 11, lineHeight: compact ? 1 : undefined, fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 1px 5px rgba(0,0,0,0.18)', backdropFilter: 'blur(4px)',
              fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap', opacity: 1,
            }}
          >
            {compact ? (allOn ? '🙈' : '👁️') : (allOn ? '🙈 Ocultar todos' : '👁️ Ver todos')}
          </button>
          {buttons.map(btn => {
            const active = layers[btn.key]
            return (
              <button key={btn.key} onClick={() => toggleLayer(btn.key)} title={btn.label} style={chipStyle(active)}>
                {compact ? btn.icon : `${btn.icon} ${btn.label}`}
              </button>
            )
          })}

          {/* 📋 Ver reportes + 🆘 NECESITO AYUDA — móvil: dentro de la columna, debajo de las capas */}
          {compact && (
            <>
              <button
                onClick={() => setReportesModalOpen(true)}
                title="Ver todos los reportes"
                className="ver-reportes"
                style={{
                  pointerEvents: 'auto',
                  padding: '8px 14px', fontSize: 12, marginTop: 4,
                }}
              >
                📋 VER REPORTES
              </button>
              <button
                onClick={handleNecesitoAyuda}
                className="necesito-ayuda"
                style={{
                  pointerEvents: 'auto',
                  padding: '8px 14px', fontSize: 12, marginTop: 4,
                }}
              >
                🆘 NECESITO AYUDA
              </button>
            </>
          )}
        </div>

        {/* 📋 Ver reportes + 🆘 NECESITO AYUDA — desktop: a la derecha, bajo la campana */}
        {!compact && (
          <div style={{ position: 'absolute', bottom: bottomOffset, right: 10, zIndex: 400, display: 'flex', alignItems: 'flex-end', gap: 20, pointerEvents: 'none' }}>
            <button
              onClick={() => setReportesModalOpen(true)}
              title="Ver todos los reportes"
              className="ver-reportes"
              style={{
                pointerEvents: 'auto',
                padding: '9px 14px', fontSize: 13,
              }}
            >
              📋 VER REPORTES
            </button>
            <button
              onClick={handleNecesitoAyuda}
              className="necesito-ayuda"
              style={{
                pointerEvents: 'auto',
                padding: '9px 16px', fontSize: 13,
              }}
            >
              🆘 NECESITO AYUDA
            </button>
          </div>
        )}
      </>
    )
  }

  const sheetHeights: Record<string, string> = {
    collapsed: 'calc(100% - 58px)',  // only handle visible
    peek: '45%',
    full: '82%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Map wrapper */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative' }}>
        <div className="map-layout">
          {/* ── Map ── */}
          <div className="map-container" style={{ position: 'relative' }}>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

            {!mapReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f7' }}>
                <span style={{ color: '#003893', fontWeight: 600 }}>Cargando mapa...</span>
              </div>
            )}

            {/* Desktop layer toggles — shift up so they don't overlap report button */}
            <div className="map-toggles-desktop">
              <LayerToggles bottomOffset={60} />
            </div>

            {/* Mobile layer toggles — compactos (solo ícono), 15px sobre el navbar; ocultos al expandir el sheet */}
            {sheetState === 'collapsed' && (
              <div className="map-toggles-mobile">
                <LayerToggles bottomOffset={77} compact />
              </div>
            )}

            {/* Centro de notificaciones */}
            <button
              onClick={() => {
                markAllRead()
                if (window.matchMedia('(max-width: 720px)').matches) {
                  setNotifPanelOpen(true)
                } else {
                  setOpenSection('actividad')
                }
              }}
              title="Centro de notificaciones"
              className="notif-bell"
              style={{
                position: 'absolute', bottom: 104, right: 10, zIndex: 400,
                background: 'rgba(255,255,255,0.95)', border: '1px solid #d1d5db',
                borderRadius: 999, width: 40, height: 40, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', fontSize: 17,
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: '#CE1126', color: '#fff', fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Desktop Sidebar (centro de reportes) ── */}
          <div className="map-sidebar">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e1e4e9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📋 Reportes</h2>
              {unreadCount > 0 && <span className="tag tag-red" style={{ fontSize: 10 }}>{unreadCount} nuevas</span>}
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ReportesPanel />
            </div>
          </div>
        </div>

        {/* ── Mobile Bottom Sheet (centro de reportes) ── */}
        <div
          className="map-bottom-sheet"
          style={{ top: sheetHeights[sheetState] }}
        >
          {/* Pull handle */}
          <div
            className="sheet-handle-area"
            onClick={() => setSheetState(s => s === 'collapsed' ? 'peek' : s === 'peek' ? 'full' : 'collapsed')}
          >
            <div className="sheet-handle-pill" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 10px', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2430' }}>📋 Reportes</span>
                {unreadCount > 0 && <span className="tag tag-red" style={{ fontSize: 10 }}>{unreadCount} nuevas</span>}
                {ciudadSectores.filter(s => getSectorEstado(s.id) === 'requiere').length > 0 && (
                  <span className="tag tag-red" style={{ fontSize: 10 }}>
                    {ciudadSectores.filter(s => getSectorEstado(s.id) === 'requiere').length} urgentes
                  </span>
                )}
              </div>
              <span style={{ color: '#9AA0AC', fontSize: 14, userSelect: 'none' }}>
                {sheetState === 'collapsed' ? '▲' : sheetState === 'full' ? '▼' : '⋯'}
              </span>
            </div>
          </div>

          {/* Panel de reportes por secciones */}
          <div style={{ flex: 1, overflow: 'auto', overscrollBehavior: 'contain' }}>
            <ReportesPanel />
          </div>
        </div>
      </div>

      {/* ── Notificaciones (móvil): panel desplegable desde arriba ── */}
      {notifPanelOpen && (
        <>
          <div className="notif-top-backdrop" onClick={() => setNotifPanelOpen(false)} />
          <div className="notif-top-panel">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e1e4e9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#1f2430' }}>🔔 Notificaciones</h2>
              <button onClick={() => setNotifPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }} aria-label="Cerrar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 16px' }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#CE1126', margin: '10px 0 4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🆘 Últimos reportes pendientes</h3>
              {pendingNeeds.length === 0 ? (
                <p style={{ fontSize: 13, color: '#6b7280', padding: '8px 0' }}>No hay reportes pendientes.</p>
              ) : (
                pendingNeeds.map(n => renderPendingItem(n))
              )}

              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#003893', margin: '14px 0 4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🔔 Actividad reciente</h3>
              {reciente.length === 0 ? (
                <p style={{ fontSize: 13, color: '#6b7280', padding: '8px 0' }}>
                  Sin actividad todavía. Cuando alguien reporte una necesidad, mascota, ofrecimiento,
                  vivienda o daño —o se publique una noticia— aparecerá aquí en tiempo real.
                </p>
              ) : (
                reciente.map(n => (
                  <div
                    key={n.key}
                    onClick={() => {
                      if (n.type === 'noticia') setPage('noticias')
                      else if (n.detail) openDetail(n.detail)
                    }}
                    style={{ display: 'flex', gap: 8, padding: '10px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'flex-start', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 16 }}>{NOTIF_ICONS[n.type] ?? '🔔'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1f2430' }}>{n.mensaje}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9AA0AC' }}>{n.ciudad ?? 'Todas las ciudades'} · {timeAgo(n.at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Modal de reportes: todos los reportes por secciones ── */}
      {reportesModalOpen && (
        <div className="reportes-overlay" onClick={() => setReportesModalOpen(false)}>
          <div className="reportes-modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e1e4e9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#1f2430' }}>
                📋 Reportes
                {unreadCount > 0 && <span className="tag tag-red" style={{ fontSize: 10, marginLeft: 8 }}>{unreadCount} nuevas</span>}
              </h2>
              <button onClick={() => setReportesModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }} aria-label="Cerrar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
              <ReportesPanel />
            </div>
          </div>
        </div>
      )}

      {/* Detalle del reporte seleccionado */}
      {detailItem && (
        <Modal title={detailItem.titulo} onClose={() => setDetailItem(null)} hideCancel>
          <DetailImageCarousel images={detailItem.imagenes ?? []} />
          {detailItem.detalle && <p style={{ fontSize: 14, color: '#1f2430', margin: '0 0 8px' }}>{detailItem.detalle}</p>}
          {detailItem.ubicacion && <p style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 12px' }}>📍 {detailItem.ubicacion}</p>}
          {detailItem.telefono ? (
            <a
              href={`https://wa.me/${waNumber(detailItem.telefono)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#25D366', color: '#fff', padding: '10px 18px',
                borderRadius: 999, textDecoration: 'none', fontWeight: 800, fontSize: 14,
              }}
            >
              📞 Llamar por WhatsApp
            </a>
          ) : (
            <p style={{ fontSize: 12.5, color: '#9AA0AC', margin: 0 }}>No hay teléfono registrado para este reporte.</p>
          )}
          {detailItem.editable && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
              <button className="btn btn-outline btn-sm" onClick={() => openEdit(detailItem.editable!)}>✎ Editar reporte</button>
              <button className="btn btn-red btn-sm" onClick={() => openDelete(detailItem.editable!)}>🗑 Eliminar</button>
              <span style={{ fontSize: 11, color: '#9AA0AC', alignSelf: 'center' }}>
                Se pedirá el código que recibiste al publicar.
              </span>
            </div>
          )}
        </Modal>
      )}

      {/* Editar reporte propio: primero el código, luego dirección + descripción + imagen */}
      {editReport && (
        <Modal
          title={editStep === 'pin' ? `🔑 Código para editar: ${editReport.titulo}` : `✎ Editar: ${editReport.titulo}`}
          onClose={() => setEditReport(null)}
          onConfirm={editStep === 'pin' ? () => setEditStep('form') : submitEditReport}
          confirmLabel={editStep === 'pin' ? 'Continuar' : 'Guardar cambios'}
          hideCancel
        >
          {editStep === 'pin' ? (
            <>
              <p style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 12px' }}>
                Ingresa el {editReport.tipo === 'dano' ? 'número de radicado' : 'código de 4 dígitos'} que se te dio al publicar.
              </p>
              <div className="form-group">
                <label className="form-label">{editReport.tipo === 'dano' ? 'Número de radicado' : 'Código de edición'} <span className="req">*</span></label>
                <input className="form-input" autoFocus value={editForm.pin} onChange={e => setEditForm(p => ({ ...p, pin: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && editForm.pin.trim() && setEditStep('form')}
                  placeholder={editReport.tipo === 'dano' ? 'DA000000' : '····'} maxLength={32}
                  style={{ letterSpacing: 6, fontFamily: 'monospace', fontSize: 15 }} />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">{editReport.tipo === 'mascota' ? 'Lugar visto' : editReport.tipo === 'vivienda' ? 'Sector / referencia' : 'Dirección'}</label>
                <input className="form-input" value={editForm.direccion} onChange={e => setEditForm(p => ({ ...p, direccion: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-input" rows={3} value={editForm.descripcion} onChange={e => setEditForm(p => ({ ...p, descripcion: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Foto / imagen</label>
                <ImageInput value={editForm.imagen ?? undefined} onChange={v => setEditForm(p => ({ ...p, imagen: v ?? null }))} />
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Eliminar reporte propio (PIN o radicado) */}
      {deleteReport && (
        <Modal title={`🗑 Eliminar: ${deleteReport.titulo}`} onClose={() => setDeleteReport(null)} onConfirm={submitDeleteReport} confirmLabel="Eliminar definitivamente" confirmClass="btn btn-red">
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
            Esta acción borra el reporte del mapa. Quedará registrada en la auditoría.
          </p>
          <div className="form-group">
            <label className="form-label">{deleteReport.tipo === 'dano' ? 'Número de radicado' : 'Código de edición'} <span className="req">*</span></label>
            <input className="form-input" value={deletePin} onChange={e => setDeletePin(e.target.value)}
              placeholder={deleteReport.tipo === 'dano' ? 'DA000000' : '····'} maxLength={32}
              style={{ letterSpacing: 6, fontFamily: 'monospace', fontSize: 15 }} />
          </div>
        </Modal>
      )}

      {/* Aviso: tras 3 intentos fallidos de ubicación */}
      {showLocationWarning && (
        <Modal
          title="📍 Permiso de ubicación necesario"
          onClose={() => setShowLocationWarning(false)}
        >
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            El navegador no ha podido obtener tu ubicación. Puedes intentarlo de nuevo o continuar
            e ingresar la dirección manualmente.
          </p>
          <div className="alert-yellow" style={{ marginTop: 12 }}>
            Para permitir la ubicación: toca el candado 🔒 en la barra de direcciones →
            <strong> Permisos → Ubicación → Permitir</strong>, y vuelve a intentar.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => { setShowLocationWarning(false); geolocate(true) }}
            >
              🔄 Intentar de nuevo
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setShowLocationWarning(false)
                locationAttemptsRef.current = 0
                setLocationAttempts(0)
                setShowReportModal(true)
              }}
            >
              Continuar sin ubicación
            </button>
          </div>
        </Modal>
      )}

      {/* Realizar reporte: modal simplificado (descripción + teléfono + foto) */}
      {showReportModal && (
        <Modal title="Realizar reporte" onClose={() => setShowReportModal(false)} onConfirm={submitReport} confirmLabel="Publicar" hideCancel>
          {pickedLatLng && (
            <p style={{ fontSize: 12.5, color: '#2E9E5B', fontWeight: 700, margin: '0 0 8px' }}>
              📍 Ubicación capturada correctamente
            </p>
          )}
          <div className="form-group">
            <label className="form-label">Dirección (puedes editarla)</label>
            <input
              className="form-input"
              value={rForm.nombre}
              onChange={e => onReportAddressChange(e.target.value)}
              placeholder="Ej. Barrio La Linda, Manizales"
            />
            <MiniMapPicker
              initial={pickedLatLng ? [pickedLatLng.lat, pickedLatLng.lng] : [center[0], center[1]]}
              onPick={applyMiniPoint}
            />
          </div>
          {!pickedLatLng && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <button type="button" onClick={() => geolocate(false)} className="btn btn-sm btn-outline">📍 Usar mi ubicación</button>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Tipo de ayuda <span style={{ color: '#9AA0AC', fontWeight: 600 }}>(opcional — por defecto "Otro")</span></label>
            <select className="form-select" value={rForm.tipoAyuda} onChange={e => setRForm(p => ({ ...p, tipoAyuda: e.target.value }))}>
              {TIPOS_AYUDA.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.value}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción <span className="req">*</span></label>
            <textarea className="form-input" rows={3} value={rForm.detalles} onChange={e => setRForm(p => ({ ...p, detalles: e.target.value }))} placeholder="Describe tu situación, por ejemplo: se nos acabó el agua potable..." />
          </div>
          <div className="form-group">
            <label className="form-label">Tu teléfono <span className="req">*</span></label>
            <input className="form-input" type="tel" value={rForm.contactoTel} onChange={e => setRForm(p => ({ ...p, contactoTel: e.target.value }))} placeholder="300 123 4567" />
          </div>
          <div className="form-group">
            <label className="form-label">Foto (opcional)</label>
            <ImageInput capture value={rForm.imagen ?? undefined} onChange={v => setRForm(p => ({ ...p, imagen: v ?? null }))} />
          </div>
        </Modal>
      )}

      {/* Report need in existing sector */}
      {showNeedModal && (
        <Modal title="+ Reportar necesidad" onClose={() => setShowNeedModal(null)} onConfirm={submitNeed} confirmLabel="Publicar">
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
            Sector: <strong>{sectores.find(s => s.id === showNeedModal)?.nombre}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">Tipo de necesidad <span className="req">*</span></label>
            <select className="form-select" value={nForm.tipo} onChange={e => setNForm(p => ({ ...p, tipo: e.target.value }))}>
              {TIPOS_NECESIDAD.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cantidad estimada</label>
            <input className="form-input" value={nForm.cantidad} onChange={e => setNForm(p => ({ ...p, cantidad: e.target.value }))} placeholder="Ej. 20 familias" />
          </div>
          <div className="form-group">
            <label className="form-label">Prioridad</label>
            <select className="form-select" value={nForm.prioridad} onChange={e => setNForm(p => ({ ...p, prioridad: e.target.value as any }))}>
              <option value="alta">🔴 Alta</option>
              <option value="media">🟡 Media</option>
              <option value="baja">🟢 Baja</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Detalles</label>
            <textarea className="form-input" value={nForm.detalles} onChange={e => setNForm(p => ({ ...p, detalles: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tu nombre <span className="req">*</span></label>
            <input className="form-input" value={nForm.reportado_por} onChange={e => setNForm(p => ({ ...p, reportado_por: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tu teléfono <span className="req">*</span></label>
            <input className="form-input" type="tel" value={nForm.telefono} onChange={e => setNForm(p => ({ ...p, telefono: e.target.value }))} />
          </div>
        </Modal>
      )}

      {/* Help modal */}
      {showHelpModal && (() => {
        const need = necesidades.find(n => n.id === showHelpModal)!
        return (
          <Modal title="🙋 Yo puedo ayudar con esto" onClose={() => setShowHelpModal(null)} onConfirm={submitHelp} confirmLabel="Confirmar">
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
              <strong>{need.tipo}</strong> — {need.cantidad}<br />
              Solo necesitamos tu teléfono: te enviaremos por WhatsApp la información de quien necesita ayuda
              (su teléfono y la ubicación).
            </p>
            <div className="form-group">
              <label className="form-label">Tu teléfono (WhatsApp) <span className="req">*</span></label>
              <input className="form-input" type="tel" value={hForm.telefono} onChange={e => setHForm(p => ({ ...p, telefono: e.target.value }))} placeholder="300 123 4567" />
            </div>
          </Modal>
        )
      })()}

      {/* Update need modal */}
      {showUpdateModal && (() => {
        const need = necesidades.find(n => n.id === showUpdateModal)!
        return (
          <Modal title="✎ Actualizar necesidad" onClose={() => setShowUpdateModal(null)} onConfirm={submitUpdate} confirmLabel="Guardar cambios">
            <div className="form-group">
              <label className="form-label">Nueva cantidad</label>
              <input className="form-input" value={uForm.cantidad} placeholder={need.cantidad} onChange={e => setUForm(p => ({ ...p, cantidad: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" value={uForm.estado} onChange={e => setUForm(p => ({ ...p, estado: e.target.value as any }))}>
                <option value="requiere">Aún se requiere ayuda</option>
                <option value="atendida">Ya fue resuelta / atendida</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Detalles actualizados</label>
              <textarea className="form-input" value={uForm.detalles} placeholder={need.descripcion} onChange={e => setUForm(p => ({ ...p, detalles: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Código de edición (PIN o llave de admin) <span className="req">*</span></label>
              <input className="form-input" value={uForm.pin} onChange={e => setUForm(p => ({ ...p, pin: e.target.value }))} maxLength={32} placeholder="····" style={{ letterSpacing: 8, fontSize: 20 }} />
            </div>
          </Modal>
        )
      })()}

      {pinResult || radicadoResult ? <PinModal pin={pinResult ?? undefined} radicado={radicadoResult ?? undefined} onClose={() => { setPinResult(null); setRadicadoResult(null) }} /> : null}

      {/* Popup temporal de confirmación (se autodespide a los 4s) */}
      {toast && (
        <div className={`map-toast ${toast.tone === 'error' ? 'map-toast-error' : ''}`}>
          {toast.msg}
        </div>
      )}

      {/* Chatbot Ibanaska — popup flotante del bot (pantalla completa en móvil) */}
      <ChatbotWidget ciudad={ciudad} />
    </div>
  )
}
