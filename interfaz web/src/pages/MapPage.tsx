import { useState, useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Store } from '../store'
import { TIPOS_NECESIDAD } from '../data/mock'
import Modal from '../components/Modal'
import PinModal from '../components/PinModal'
import ImageInput from '../components/ImageInput'

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Props { store: Store; setPage: (p: string) => void }

function getStatusColor(estado: string) {
  if (estado === 'requiere') return '#CE1126'
  if (estado === 'en_proceso') return '#E08E00'
  if (estado === 'atendido') return '#2E9E5B'
  return '#9AA0AC'
}

/** Ícono según el tipo de necesidad reportada. */
const NEED_TYPES = [
  { key: 'agua', icon: '💧', label: '💧 Agua' },
  { key: 'alimentos', icon: '🍞', label: '🍞 Alimentos' },
  { key: 'refugio', icon: '⛺', label: '⛺ Refugio' },
  { key: 'medicamentos', icon: '💊', label: '💊 Medicamentos' },
  { key: 'salud', icon: '🩺', label: '🩺 Atención médica' },
  { key: 'ropa', icon: '🧥', label: '🧥 Ropa / Cobijas' },
  { key: 'maquinaria', icon: '🚜', label: '🚜 Maquinaria' },
  { key: 'mascotas', icon: '🐾', label: '🐾 Mascotas' },
  { key: 'otro', icon: '🆘', label: '🆘 Otro' },
]

/** Clave de categoría según el tipo de necesidad reportada. */
function needKey(tipo: string) {
  const t = (tipo || '').toLowerCase()
  if (t.includes('agua')) return 'agua'
  if (t.includes('aliment') || t.includes('comida')) return 'alimentos'
  if (t.includes('refugio') || t.includes('carpa')) return 'refugio'
  if (t.includes('medicament')) return 'medicamentos'
  if (t.includes('médica') || t.includes('medica') || t.includes('salud') || t.includes('psicol')) return 'salud'
  if (t.includes('ropa') || t.includes('cobija') || t.includes('abrigo')) return 'ropa'
  if (t.includes('maquinaria') || t.includes('rescate') || t.includes('herramienta')) return 'maquinaria'
  if (t.includes('mascota')) return 'mascotas'
  return 'otro'
}

/** Ícono según el tipo de necesidad reportada. */
function needIcon(tipo: string) {
  return NEED_TYPES.find(t => t.key === needKey(tipo))?.icon ?? '🆘'
}


export default function MapPage({ store, setPage }: Props) {
  const { ciudad, sectores, necesidades, centros, mascotas, danos, noticias, ofrecimientos, viviendas,
    notificaciones, markAllRead,
    addSector, addNecesidad, updateNecesidad, getSectorEstado } = store

  const mapRef = useRef<any>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const centroMarkersRef = useRef<any[]>([])
  const mascotaMarkersRef = useRef<any[]>([])
  const danoMarkersRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [layers, setLayers] = useState<Record<string, boolean>>(() => ({
    ...Object.fromEntries(NEED_TYPES.map(t => [t.key, true])),
    centros: true,
    mascotas: true,
    danos: true,
  }))
  const toggleLayer = (key: string) => setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  // Mobile UX
  const [sheetState, setSheetState] = useState<'collapsed' | 'peek' | 'full'>('collapsed')
  const [pickingLocation, setPickingLocation] = useState(false)
  const [pickedLatLng, setPickedLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showNeedModal, setShowNeedModal] = useState<number | null>(null) // sector_id
  const [showHelpModal, setShowHelpModal] = useState<number | null>(null) // need_id
  const [showUpdateModal, setShowUpdateModal] = useState<number | null>(null) // need_id
  const [pinResult, setPinResult] = useState<string | null>(null)

  // Centro de reportes (panel de notificaciones por secciones)
  const [openSection, setOpenSection] = useState<string | null>('actividad')
  const [nFilter, setNFilter] = useState('urgentes')
  const [oFilter, setOFilter] = useState('disponibles')
  const [mFilter, setMFilter] = useState('perdidas')
  const [dFilter, setDFilter] = useState('pendientes')
  const [vFilter, setVFilter] = useState('disponibles')

  // Report form state
  const [rForm, setRForm] = useState({
    nombre: '', barrio: '', tipo: 'Agua potable', cantidad: '', prioridad: 'alta' as const,
    detalles: '', contactoNombre: '', contactoTel: '',
    nivel: 'leve' as const, descripcion: '', imagen: null as string | null
  })
  // Need form
  const [nForm, setNForm] = useState({
    tipo: 'Agua potable', cantidad: '', prioridad: 'alta' as const,
    detalles: '', reportado_por: '', telefono: '', imagen: null as string | null
  })
  // Help form
  const [hForm, setHForm] = useState({ nombre: '', telefono: '' })
  // Update form
  const [uForm, setUForm] = useState({
    cantidad: '', prioridad: 'alta' as const, detalles: '', estado: 'requiere' as const,
    imagen: null as string | null, pin: ''
  })

  const ciudadSectores = sectores.filter(s => s.ciudad === ciudad && s.estado === 'activo')
  const unreadCount = notificaciones.filter(n => !n.leida).length


  // Default map center by city
  const cityCenter: Record<string, [number, number]> = {
    'Manizales': [5.0703, -75.5138],
    'Pereira': [4.8133, -75.6961],
    'Cali': [3.4516, -76.5320],
    'Quibdó': [5.6942, -76.6583],
    'Norte del Valle': [3.9000, -76.0000],
    'Armenia': [4.5339, -75.6811],
  }
  const center = cityCenter[ciudad] || [4.8133, -75.6961]

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const map = L.map(mapRef.current, { zoomControl: true }).setView(center, 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)
    map.on('click', (e: any) => {
      if (pickingLocationRef.current) {
        setPickedLatLng({ lat: e.latlng.lat, lng: e.latlng.lng })
        setPickingLocation(false)
        setShowReportModal(true)
      }
    })
    mapInstance.current = map
    setMapReady(true)
    return () => {
      map.remove()
      mapInstance.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickingLocationRef = useRef(false)
  useEffect(() => { pickingLocationRef.current = pickingLocation }, [pickingLocation])

  // Invalidate map size when the bottom sheet changes so tiles fill correctly
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current?.invalidateSize(), 50)
    }
  }, [sheetState])

  const renderMarkers = useCallback(() => {
    if (!mapInstance.current) return

    // — Sector markers (always shown)
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    const curSectores = sectores.filter(s => s.ciudad === ciudad && s.estado === 'activo')
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
        ? ns.slice(0, 4).map(n => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;gap:6px">
              <span style="font-size:12px;font-weight:600;color:#1f2430;flex:1">${needIcon(n.tipo)} ${n.tipo}${n.cantidad ? ' — ' + n.cantidad : ''}</span>
              ${!n.responsable ? `<button onclick="window.__helpNeed('${n.id}')" style="background:#003893;color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:Nunito,sans-serif">🙋 Yo ayudo</button>` : '<span style="font-size:11px;color:#2E9E5B;white-space:nowrap">🙋 En proceso</span>'}
            </div>`).join('')
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

    // — Centro de acopio markers
    centroMarkersRef.current.forEach(m => m.remove())
    centroMarkersRef.current = []
    if (layers.centros) {
      const curCentros = centros.filter(c => c.ciudad === ciudad)
      curCentros.forEach(c => {
        const emoji = c.es_sangre ? '🩸' : c.es_alojamiento ? '🏠' : '📦'
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;border-radius:50%;background:#003893;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px">${emoji}</div>`,
          iconSize: [28, 28], iconAnchor: [14, 14],
        })
        const m = L.marker([c.lat, c.lng], { icon }).addTo(mapInstance.current)
        m.bindPopup(`
          <div style="min-width:180px">
            <div style="margin-bottom:6px"><span style="background:#e6f5ec;color:#2E9E5B;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">${c.estado === 'abierto' ? '🟢 ABIERTO' : '⚪ CERRADO'}</span></div>
            <h4 style="margin:0 0 4px;font-size:14px;font-weight:700">${c.nombre}</h4>
            <p style="font-size:12px;color:#6b7280;margin:0 0 6px">${c.organizacion}</p>
            <p style="font-size:12px;margin:0 0 4px"><strong>Recibe:</strong> ${c.que_recibe}</p>
            <p style="font-size:12px;margin:0 0 4px">📍 ${c.direccion}</p>
            <p style="font-size:12px;margin:0 0 4px">🕒 ${c.horario}</p>
            <a href="https://maps.google.com/?q=${c.lat},${c.lng}" target="_blank" style="display:block;text-align:center;margin-top:8px;background:#003893;color:#fff;border-radius:6px;padding:6px;font-size:12px;text-decoration:none;font-weight:600">🗺️ Cómo llegar</a>
          </div>
        `)
        centroMarkersRef.current.push(m)
      })
    }

    // — Mascota markers
    mascotaMarkersRef.current.forEach(m => m.remove())
    mascotaMarkersRef.current = []
    if (layers.mascotas) {
      mascotas.filter(m => m.ciudad === ciudad && m.estado === 'perdido').forEach(m => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:24px;height:24px;border-radius:50%;background:#7C3AED;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px">🐾</div>`,
          iconSize: [24, 24], iconAnchor: [12, 12],
        })
        const mk = L.marker([m.lat, m.lng], { icon }).addTo(mapInstance.current)
        mk.bindPopup(`
          <div style="min-width:180px">
            <span style="background:#f3e8ff;color:#7C3AED;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">🐾 PERDIDA</span>
            <h4 style="margin:6px 0 4px;font-size:14px;font-weight:700">${m.nombre || m.tipo_animal}</h4>
            <p style="font-size:12px;color:#6b7280;margin:0 0 4px">${m.senas}</p>
            <p style="font-size:12px;margin:0 0 4px">📍 ${m.lugar_visto}</p>
            <p style="font-size:12px;margin:0">📞 ${m.nombre_reporta} · ${m.telefono_reporta}</p>
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
      danos.filter(d => d.ciudad === ciudad).forEach(d => {
        const color = nivelColor[d.nivel_percibido] || '#CE1126'
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:22px;height:22px;border-radius:4px;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:11px">🏚</div>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        })
        const mk = L.marker([d.lat, d.lng], { icon }).addTo(mapInstance.current)
        mk.bindPopup(`
          <div style="min-width:180px">
            <span style="background:#fde8eb;color:#CE1126;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">🏚 ${d.nivel_percibido.toUpperCase()}</span>
            <h4 style="margin:6px 0 4px;font-size:14px;font-weight:700">${d.tipo_inmueble}</h4>
            <p style="font-size:12px;color:#6b7280;margin:0 0 4px">📍 ${d.direccion}</p>
            <p style="font-size:12px;margin:0 0 2px">Radicado: <strong>${d.radicado}</strong></p>
            <p style="font-size:12px;color:#6b7280;margin:0">${d.descripcion}</p>
          </div>
        `)
        danoMarkersRef.current.push(mk)
      })
    }
  }, [sectores, necesidades, centros, mascotas, danos, ciudad, getSectorEstado, layers])

  useEffect(() => {
    renderMarkers()
  }, [renderMarkers])

  // Wire global callbacks for popup buttons
  useEffect(() => {
    (window as any).__helpNeed = (needId: string) => {
      setShowHelpModal(Number(needId))
      if (mapInstance.current) mapInstance.current.closePopup()
    }
    return () => { delete (window as any).__helpNeed }
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => renderMarkers(), 30000)
    return () => clearInterval(interval)
  }, [renderMarkers])

  const handlePickLocation = () => {
    setPickingLocation(true)
    if (mapInstance.current) mapInstance.current.getContainer().style.cursor = 'crosshair'
  }

  const cancelPick = () => {
    setPickingLocation(false)
    if (mapInstance.current) mapInstance.current.getContainer().style.cursor = ''
  }

  const submitReport = async () => {
    if (!pickedLatLng) return
    if (!rForm.nombre.trim()) { alert('El nombre del sector es obligatorio'); return }
    if (!rForm.contactoNombre.trim()) { alert('El nombre del contacto es obligatorio'); return }
    if (!rForm.tipo.trim()) { alert('El tipo de necesidad es obligatorio'); return }

    const sector = await addSector({
      ciudad, nombre: rForm.nombre, barrio: rForm.barrio,
      lat: pickedLatLng.lat, lng: pickedLatLng.lng,
      descripcion: rForm.descripcion, nivel_afectacion: rForm.nivel, estado: 'activo',
      contactos: rForm.contactoNombre ? [{ id: 0, nombre: rForm.contactoNombre, telefono: rForm.contactoTel, rol: 'Coordinador' }] : []
    })
    if (!sector) return
    const pin = await addNecesidad({
      sector_id: sector.id, tipo: rForm.tipo, descripcion: rForm.detalles,
      cantidad: rForm.cantidad, prioridad: rForm.prioridad, estado: 'requiere',
      responsable: null, reportado_por: rForm.contactoNombre,
      telefono_reporta: rForm.contactoTel, fecha: new Date().toISOString(), imagen: rForm.imagen
    })
    if (!pin) return
    setShowReportModal(false)
    setPinResult(pin)
    setRForm({ nombre: '', barrio: '', tipo: 'Agua potable', cantidad: '', prioridad: 'alta', detalles: '', contactoNombre: '', contactoTel: '', nivel: 'leve', descripcion: '', imagen: null })
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
    if (!hForm.nombre.trim()) { alert('Tu nombre es obligatorio'); return }
    if (!hForm.telefono.trim()) { alert('Tu teléfono es obligatorio'); return }
    const r = await updateNecesidad(showHelpModal, {
      responsable: { nombre: hForm.nombre, telefono: hForm.telefono, fecha: new Date().toISOString() }
    })
    if (!r) return
    setShowHelpModal(null)
    setHForm({ nombre: '', telefono: '' })
    alert('¡Gracias! Quedaste registrado como responsable de esta necesidad.')
  }

  const submitUpdate = async () => {
    if (!showUpdateModal) return
    const need = necesidades.find(n => n.id === showUpdateModal)
    if (!need) return
    if (need.pin && uForm.pin !== need.pin) { alert('Código incorrecto. Inténtalo de nuevo.'); return }
    const r = await updateNecesidad(showUpdateModal, {
      cantidad: uForm.cantidad || need.cantidad,
      prioridad: uForm.prioridad,
      descripcion: uForm.detalles || need.descripcion,
      estado: uForm.estado,
      imagen: uForm.imagen || need.imagen,
      pin: uForm.pin,
    })
    if (!r) return
    setShowUpdateModal(null)
    alert('✅ Necesidad actualizada correctamente.')
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
    mapInstance.current.setView([lat, lng], 15)
    if (sheetState === 'full') setSheetState('peek')
  }

  const timeAgo = (iso: string) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return 'ahora'
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`
    if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
    return `hace ${Math.max(1, Math.floor(s / 86400))} d`
  }

  const NOTIF_ICONS: Record<string, string> = {
    sector: '📍', necesidad: '🆘', ofrecimiento: '🤝', mascota: '🐾',
    noticia: '📰', vivienda: '🏠', dano: '🏚️', centro: '📦',
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
      .filter(o => o.ciudad === ciudad)
      .filter(o =>
        oFilter === 'disponibles' ? (o.estado === 'disponible' && !o.reservado_por)
        : oFilter === 'reservados' ? (o.estado === 'disponible' && o.reservado_por)
        : oFilter === 'entregados' ? o.estado === 'entregado'
        : true)

    const ms = mascotas
      .filter(m => m.ciudad === ciudad)
      .filter(m => mFilter === 'perdidas' ? m.estado === 'perdido' : mFilter === 'encontradas' ? m.estado === 'encontrado' : true)

    const ds = danos
      .filter(d => d.ciudad === ciudad)
      .filter(d =>
        dFilter === 'pendientes' ? d.estado === 'pendiente'
        : dFilter === 'visita' ? d.estado === 'visita_programada'
        : dFilter === 'visitados' ? d.estado === 'visitado'
        : true)

    const vs = viviendas
      .filter(v => v.ciudad === ciudad)
      .filter(v => vFilter === 'disponibles' ? v.estado === 'disponible' : vFilter === 'ocupadas' ? v.estado === 'ocupado' : true)

    const nsNoticias = noticias.filter(n => n.ciudad === null || n.ciudad === ciudad)

    return (
      <div>
        {/* 🔔 Actividad reciente — notificaciones en tiempo real */}
        <ReportSection id="actividad" icon="🔔" title="Actividad reciente" count={notificaciones.length}
          badge={unread > 0 ? <span className="tag tag-red" style={{ fontSize: 10 }}>{unread} nuevas</span> : null}>
          {notificaciones.length === 0 ? (
            <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0' }}>
              Sin actividad todavía. Cuando alguien reporte una necesidad, una mascota, un ofrecimiento,
              una vivienda o un daño —o se publique una noticia— aparecerá aquí en tiempo real.
            </p>
          ) : (
            notificaciones.slice(0, 20).map(n => (
              <div key={n.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16 }}>{NOTIF_ICONS[n.type] ?? '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: '#1f2430' }}>{n.mensaje}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9AA0AC' }}>{n.ciudad ?? 'Todas las ciudades'} · {timeAgo(n.at)}</p>
                </div>
                {!n.leida && <span style={{ width: 8, height: 8, borderRadius: 999, background: '#CE1126', flexShrink: 0, marginTop: 4 }} />}
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
              <div key={n.id} onClick={() => sector && centerOnSector(sector.id)} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
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
        <ReportSection id="ofrecimientos" icon="🤝" title="Ofrecimientos" count={ofrecimientos.filter(o => o.ciudad === ciudad).length}>
          <Chips value={oFilter} onChange={setOFilter} options={[
            { id: 'disponibles', label: '🟢 Disponibles' },
            { id: 'reservados', label: '🟠 Reservados' },
            { id: 'entregados', label: '✅ Entregados' },
            { id: 'todos', label: 'Todos' },
          ]} />
          {ofs.length === 0 && <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0' }}>Sin ofrecimientos con este filtro.</p>}
          {ofs.map(o => (
            <div key={o.id} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
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
        <ReportSection id="mascotas" icon="🐾" title="Mascotas" count={mascotas.filter(m => m.ciudad === ciudad).length}>
          <Chips value={mFilter} onChange={setMFilter} options={[
            { id: 'perdidas', label: '🔴 Perdidas' },
            { id: 'encontradas', label: '✅ Encontradas' },
            { id: 'todos', label: 'Todas' },
          ]} />
          {ms.length === 0 && <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0' }}>Sin mascotas con este filtro.</p>}
          {ms.map(m => (
            <div key={m.id} onClick={() => centerOn(m.lat, m.lng)} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
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
        <ReportSection id="viviendas" icon="🏠" title="Viviendas" count={viviendas.filter(v => v.ciudad === ciudad).length}>
          <Chips value={vFilter} onChange={setVFilter} options={[
            { id: 'disponibles', label: '🟢 Disponibles' },
            { id: 'ocupadas', label: '⚪ Ocupadas' },
            { id: 'todos', label: 'Todas' },
          ]} />
          {vs.length === 0 && <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0' }}>Sin ofertas con este filtro.</p>}
          {vs.map(v => (
            <div key={v.id} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
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

        {/* 🏚️ Daños (solo Manizales) */}
        {ciudad === 'Manizales' && (
          <ReportSection id="danos" icon="🏚️" title="Daños estructurales" count={danos.filter(d => d.ciudad === ciudad).length}>
            <Chips value={dFilter} onChange={setDFilter} options={[
              { id: 'pendientes', label: '🔴 Pendientes' },
              { id: 'visita', label: '🟠 Con visita' },
              { id: 'visitados', label: '✅ Visitados' },
              { id: 'todos', label: 'Todos' },
            ]} />
            {ds.length === 0 && <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0' }}>Sin reportes con este filtro.</p>}
            {ds.map(d => (
              <div key={d.id} onClick={() => centerOn(d.lat, d.lng)} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2430' }}>{d.tipo_inmueble} — {d.direccion}</span>
                  <span className={d.estado === 'pendiente' ? 'tag tag-red' : d.estado === 'visita_programada' ? 'tag tag-orange' : 'tag tag-green'} style={{ fontSize: 10, flexShrink: 0 }}>
                    {d.estado === 'pendiente' ? '🔴 Pendiente' : d.estado === 'visita_programada' ? '🟠 Visita' : '✅ Visitado'}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9AA0AC' }}>Radicado: {d.radicado} · {d.nivel_percibido}</p>
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
      ...NEED_TYPES.filter(t => t.key !== 'mascotas').map(t => ({
        key: t.key,
        icon: t.icon,
        label: t.label.split(' ').slice(1).join(' ') || t.label,
      })),
      { key: 'centros', icon: '📦', label: 'Centros' },
      { key: 'mascotas', icon: '🐾', label: 'Mascotas perdidas' },
      { key: 'danos', icon: '🏚️', label: 'Daños' },
    ]
    const allOn = buttons.every(b => layers[b.key])

    const chipStyle = (active: boolean) => compact
      ? {
          pointerEvents: 'auto',
          background: active ? '#003893' : 'rgba(255,255,255,0.92)',
          color: active ? '#fff' : '#374151',
          border: '1px solid ' + (active ? '#003893' : '#d1d5db'),
          borderRadius: 18, width: 34, height: 34, padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, lineHeight: 1, cursor: 'pointer',
          boxShadow: '0 1px 5px rgba(0,0,0,0.18)', backdropFilter: 'blur(4px)',
          fontFamily: 'Nunito, sans-serif', opacity: active ? 1 : 0.82,
        }
      : {
          pointerEvents: 'auto',
          background: active ? '#003893' : 'rgba(255,255,255,0.92)',
          color: active ? '#fff' : '#374151',
          border: '1px solid ' + (active ? '#003893' : '#d1d5db'),
          borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 1px 5px rgba(0,0,0,0.18)', backdropFilter: 'blur(4px)',
          fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap', opacity: active ? 1 : 0.82,
        }

    return (
      <>
        <div style={{ position: 'absolute', bottom: bottomOffset, left: 10, zIndex: 400, display: 'flex', flexDirection: 'column', gap: compact ? 4 : 5, maxHeight: 'calc(100% - 90px)', overflowY: 'auto', paddingRight: 2, pointerEvents: 'none' }}>
          <button
            onClick={() => setLayers(prev => Object.fromEntries(Object.keys(prev).map(k => [k, true])))}
            disabled={allOn}
            title="Mostrar todas las capas"
            style={{
              pointerEvents: 'auto',
              background: allOn ? '#e8eeff' : '#003893',
              color: allOn ? '#9AA0AC' : '#fff',
              border: '1px solid ' + (allOn ? '#c9d6f2' : '#003893'),
              borderRadius: compact ? 18 : 20,
              width: compact ? 34 : undefined, height: compact ? 34 : undefined, padding: compact ? 0 : '4px 10px',
              display: compact ? 'flex' : undefined, alignItems: compact ? 'center' : undefined, justifyContent: compact ? 'center' : undefined,
              fontSize: compact ? 16 : 11, lineHeight: compact ? 1 : undefined, fontWeight: 800,
              cursor: allOn ? 'default' : 'pointer',
              boxShadow: '0 1px 5px rgba(0,0,0,0.18)', backdropFilter: 'blur(4px)',
              fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap', opacity: allOn ? 0.6 : 1,
            }}
          >
            {compact ? '👁️' : '👁️ Ver todos'}
          </button>
          {buttons.map(btn => {
            const active = layers[btn.key]
            return (
              <button key={btn.key} onClick={() => toggleLayer(btn.key)} title={btn.label} style={chipStyle(active)}>
                {compact ? btn.icon : `${btn.icon} ${btn.label}`}
              </button>
            )
          })}

          {/* + Reportar necesidad — móvil: dentro de la columna, debajo de las capas */}
          {compact && (
            <button
              onClick={handlePickLocation}
              style={{
                pointerEvents: 'auto',
                background: '#CE1126',
                color: '#fff',
                border: '1px solid #CE1126',
                borderRadius: 20, padding: '7px 12px', fontSize: 11, fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(206,17,38,0.45)', backdropFilter: 'blur(4px)',
                fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap', marginTop: 4,
              }}
            >
              + Reportar necesidad
            </button>
          )}
        </div>

        {/* + Reportar necesidad — desktop: a la derecha, bajo la campana y al mismo nivel que las capas */}
        {!compact && (
          <button
            onClick={handlePickLocation}
            style={{
              position: 'absolute', bottom: bottomOffset, right: 10, zIndex: 400,
              background: '#CE1126', color: '#fff', border: '1px solid #CE1126',
              borderRadius: 20, padding: '8px 14px', fontSize: 12, fontWeight: 800,
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(206,17,38,0.45)', backdropFilter: 'blur(4px)',
              fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap',
            }}
          >
            + Reportar necesidad
          </button>
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
      {/* Picking location banner */}
      {pickingLocation && (
        <div style={{ background: '#003893', color: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13, fontWeight: 600, flexShrink: 0, zIndex: 1 }}>
          <span>📍</span>
          <span style={{ flex: 1 }}>Haz clic en el mapa donde está el sector afectado</span>
          <button onClick={cancelPick} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}>Cancelar</button>
        </div>
      )}

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
              onClick={() => { setOpenSection('actividad'); markAllRead(); setSheetState('full') }}
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

      {/* Report sector + need modal */}
      {showReportModal && (
        <Modal title="📍 Reportar sector y necesidad" onClose={() => setShowReportModal(false)} onConfirm={submitReport} confirmLabel="Publicar y generar código">
          <div className="alert-yellow" style={{ marginBottom: 16 }}>
            Ubicación marcada en el mapa. Completa la información del sector.
          </div>
          <div className="form-group">
            <label className="form-label">Nombre del sector <span className="req">*</span></label>
            <input className="form-input" value={rForm.nombre} onChange={e => setRForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Barrio La Enea" />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de necesidad <span className="req">*</span></label>
            <select className="form-select" value={rForm.tipo} onChange={e => setRForm(p => ({ ...p, tipo: e.target.value }))}>
              {TIPOS_NECESIDAD.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cantidad estimada</label>
            <input className="form-input" value={rForm.cantidad} onChange={e => setRForm(p => ({ ...p, cantidad: e.target.value }))} placeholder="Ej. 50 familias" />
          </div>
          <div className="form-group">
            <label className="form-label">Prioridad</label>
            <select className="form-select" value={rForm.prioridad} onChange={e => setRForm(p => ({ ...p, prioridad: e.target.value as any }))}>
              <option value="alta">🔴 Alta</option>
              <option value="media">🟡 Media</option>
              <option value="baja">🟢 Baja</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción / detalles</label>
            <textarea className="form-input" value={rForm.detalles} onChange={e => setRForm(p => ({ ...p, detalles: e.target.value }))} placeholder="Describe la situación..." />
          </div>
          <div className="form-group">
            <label className="form-label">Persona para coordinar <span className="req">*</span></label>
            <input className="form-input" value={rForm.contactoNombre} onChange={e => setRForm(p => ({ ...p, contactoNombre: e.target.value }))} placeholder="Tu nombre" />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input className="form-input" type="tel" value={rForm.contactoTel} onChange={e => setRForm(p => ({ ...p, contactoTel: e.target.value }))} placeholder="300 123 4567" />
          </div>
          <div className="form-group">
            <label className="form-label">Foto (opcional)</label>
            <ImageInput value={rForm.imagen ?? undefined} onChange={v => setRForm(p => ({ ...p, imagen: v ?? null }))} />
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
              Tu nombre y teléfono quedarán visibles para coordinar la ayuda.
            </p>
            <div className="form-group">
              <label className="form-label">Tu nombre <span className="req">*</span></label>
              <input className="form-input" value={hForm.nombre} onChange={e => setHForm(p => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tu teléfono <span className="req">*</span></label>
              <input className="form-input" type="tel" value={hForm.telefono} onChange={e => setHForm(p => ({ ...p, telefono: e.target.value }))} />
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
              <label className="form-label">Código de edición (4 dígitos) <span className="req">*</span></label>
              <input className="form-input" value={uForm.pin} onChange={e => setUForm(p => ({ ...p, pin: e.target.value }))} maxLength={4} placeholder="····" style={{ letterSpacing: 8, fontSize: 20 }} />
            </div>
          </Modal>
        )
      })()}

      {pinResult && <PinModal pin={pinResult} onClose={() => setPinResult(null)} />}
    </div>
  )
}
