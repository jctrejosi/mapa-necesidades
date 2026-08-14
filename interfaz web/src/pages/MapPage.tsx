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

interface Props { store: Store }

function getStatusColor(estado: string) {
  if (estado === 'requiere') return '#CE1126'
  if (estado === 'en_proceso') return '#E08E00'
  if (estado === 'atendido') return '#2E9E5B'
  return '#9AA0AC'
}

function SectorStatus({ estado }: { estado: string }) {
  if (estado === 'requiere') return <span className="tag tag-red">🔴 Requiere ayuda</span>
  if (estado === 'en_proceso') return <span className="tag tag-orange">🟠 En proceso</span>
  if (estado === 'atendido') return <span className="tag tag-green">✅ Atendido</span>
  return <span className="tag tag-gray">⬜ Sin reportes</span>
}

export default function MapPage({ store }: Props) {
  const { ciudad, sectores, necesidades, centros, mascotas, danos, noticias,
    addSector, addNecesidad, updateNecesidad, getSectorEstado } = store

  const mapRef = useRef<any>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const centroMarkersRef = useRef<any[]>([])
  const mascotaMarkersRef = useRef<any[]>([])
  const danoMarkersRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [filter, setFilter] = useState('todos')
  const [showCentros, setShowCentros] = useState(true)
  const [showMascotas, setShowMascotas] = useState(false)
  const [showDanos, setShowDanos] = useState(false)
  const [selectedSector, setSelectedSector] = useState<number | null>(null)
  // Mobile UX
  const [sheetState, setSheetState] = useState<'collapsed' | 'peek' | 'full'>('collapsed')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pickingLocation, setPickingLocation] = useState(false)
  const [pickedLatLng, setPickedLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showNeedModal, setShowNeedModal] = useState<number | null>(null) // sector_id
  const [showHelpModal, setShowHelpModal] = useState<number | null>(null) // need_id
  const [showUpdateModal, setShowUpdateModal] = useState<number | null>(null) // need_id
  const [pinResult, setPinResult] = useState<string | null>(null)

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
  const latestNoticia = noticias.find(n => n.ciudad === null || n.ciudad === ciudad)

  // Filter sectors
  const filteredSectores = ciudadSectores.filter(s => {
    if (filter === 'todos') return true
    const estado = getSectorEstado(s.id)
    if (filter === 'requiere') return estado === 'requiere'
    if (filter === 'en_proceso') return estado === 'en_proceso'
    if (filter === 'atendido') return estado === 'atendido'
    if (filter === 'sin_reportes') return estado === 'sin_reportes'
    return true
  })

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

  // Invalidate map size after fullscreen toggle so tiles fill correctly
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current?.invalidateSize(), 50)
    }
  }, [isFullscreen])

  const renderMarkers = useCallback(() => {
    if (!mapInstance.current) return

    // — Sector markers (always shown)
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    const curSectores = sectores.filter(s => s.ciudad === ciudad && s.estado === 'activo')
    curSectores.forEach(sector => {
      const estado = getSectorEstado(sector.id)
      const color = getStatusColor(estado)
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10],
      })
      const marker = L.marker([sector.lat, sector.lng], { icon }).addTo(mapInstance.current)
      const ns = necesidades.filter(n => n.sector_id === sector.id && n.estado === 'requiere')
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
              <span style="font-size:12px;font-weight:600;color:#1f2430;flex:1">${n.tipo}${n.cantidad ? ' — ' + n.cantidad : ''}</span>
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
    if (showCentros) {
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
    if (showMascotas) {
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
    if (showDanos && ciudad === 'Manizales') {
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
  }, [sectores, necesidades, centros, mascotas, danos, ciudad, getSectorEstado, showCentros, showMascotas, showDanos])

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
    setSelectedSector(sectorId)
  }

  // Shared sector list (used both in sidebar and bottom sheet)
  const SectorList = () => (
    <>
      {filteredSectores.length === 0 && (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
          No hay sectores con este filtro en {ciudad}.
        </div>
      )}
      {filteredSectores.map(s => {
        const estado = getSectorEstado(s.id)
        const ns = necesidades.filter(n => n.sector_id === s.id)
        const urgentes = ns.filter(n => n.estado === 'requiere' && !n.responsable)
        const contacto = s.contactos[0]
        return (
          <div
            key={s.id}
            onClick={() => { centerOnSector(s.id); if (sheetState === 'full') setSheetState('peek') }}
            className="sector-card"
            style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: selectedSector === s.id ? '#f0f4ff' : 'transparent', transition: 'background 0.1s' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1f2430' }}>{s.nombre}</span>
              <SectorStatus estado={estado} />
            </div>
            {urgentes.length > 0 && (
              <p style={{ margin: '2px 0', fontSize: 12, color: '#CE1126', fontWeight: 600 }}>
                Requiere: {urgentes.slice(0, 2).map(n => n.tipo).join(', ')}{urgentes.length > 2 ? '...' : ''}
              </p>
            )}
            {contacto
              ? <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>📞 {contacto.nombre}</p>
              : <p style={{ margin: 0, fontSize: 12, color: '#E08E00' }}>⚠️ Sin contacto registrado</p>
            }
          </div>
        )
      })}
    </>
  )

  // Layer toggle buttons (shared between desktop and mobile)
  const LayerToggles = ({ bottomOffset = 60 }: { bottomOffset?: number }) => (
    <div style={{ position: 'absolute', bottom: bottomOffset, left: 10, zIndex: 400, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[
        { key: 'centros', label: '📦 Centros', active: showCentros, color: '#003893', toggle: () => setShowCentros(v => !v) },
        { key: 'mascotas', label: '🐾 Mascotas', active: showMascotas, color: '#7C3AED', toggle: () => setShowMascotas(v => !v) },
        ...(ciudad === 'Manizales' ? [{ key: 'danos', label: '🏚 Daños', active: showDanos, color: '#CE1126', toggle: () => setShowDanos(v => !v) }] : []),
      ].map(btn => (
        <button key={btn.key} onClick={btn.toggle} style={{
          background: btn.active ? btn.color : 'rgba(255,255,255,0.92)',
          color: btn.active ? '#fff' : '#374151',
          border: '1px solid ' + (btn.active ? btn.color : '#d1d5db'),
          borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 1px 5px rgba(0,0,0,0.18)', backdropFilter: 'blur(4px)',
          fontFamily: 'Nunito, sans-serif',
        }}>{btn.label}</button>
      ))}
    </div>
  )

  const sheetHeights: Record<string, string> = {
    collapsed: 'calc(100% - 58px)',  // only handle visible
    peek: '45%',
    full: '82%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* News banner */}
      {latestNoticia && !isFullscreen && (
        <div className="news-banner">
          <span>📰</span>
          <span style={{ flex: 1 }}>{latestNoticia.titulo}</span>
        </div>
      )}

      {/* Picking location banner */}
      {pickingLocation && (
        <div style={{ background: '#003893', color: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13, fontWeight: 600, flexShrink: 0, zIndex: isFullscreen ? 600 : 1 }}>
          <span>📍</span>
          <span style={{ flex: 1 }}>Haz clic en el mapa donde está el sector afectado</span>
          <button onClick={cancelPick} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}>Cancelar</button>
        </div>
      )}

      {/* Fullscreen wrapper */}
      <div style={isFullscreen
        ? { position: 'fixed', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column', background: '#000', overflow: 'hidden' }
        : { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative' }
      }>
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

            {/* Mobile layer toggles — above the bottom sheet handle */}
            <div className="map-toggles-mobile">
              <LayerToggles bottomOffset={sheetState === 'collapsed' ? 68 : sheetState === 'peek' ? 8 : 8} />
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(v => !v)}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              style={{
                position: 'absolute', top: 10, right: 10, zIndex: 400,
                background: 'rgba(255,255,255,0.92)', border: '1px solid #d1d5db',
                borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 5px rgba(0,0,0,0.18)', backdropFilter: 'blur(4px)',
                fontSize: 15,
              }}
            >
              {isFullscreen ? '✕' : '⛶'}
            </button>

            {/* Report button */}
            <button
              onClick={handlePickLocation}
              className="btn btn-primary"
              style={{ position: 'absolute', bottom: 20, right: 10, zIndex: 400, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
            >
              + Reportar necesidad
            </button>
          </div>

          {/* ── Desktop Sidebar ── */}
          <div className="map-sidebar">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e1e4e9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Sectores reportados</h2>
                <span style={{ background: '#e8eeff', color: '#003893', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                  {ciudadSectores.length}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'requiere', label: '🟥 Urgentes' },
                  { id: 'en_proceso', label: '🟧 En proceso' },
                  { id: 'atendido', label: '✅ Atendidos' },
                  { id: 'sin_reportes', label: '⬜ Sin reportes' },
                ].map(f => (
                  <button key={f.id} className={`chip ${filter === f.id ? 'active' : ''}`} style={{ fontSize: 12 }}
                    onClick={() => setFilter(f.id)}>{f.label}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <SectorList />
            </div>
          </div>
        </div>

        {/* ── Mobile Bottom Sheet ── */}
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
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2430' }}>
                  Sectores · <span style={{ color: '#003893' }}>{ciudadSectores.length}</span>
                </span>
                {ciudadSectores.filter(s => getSectorEstado(s.id) === 'requiere').length > 0 && (
                  <span className="tag tag-red" style={{ fontSize: 10 }}>
                    {ciudadSectores.filter(s => getSectorEstado(s.id) === 'requiere').length} urgentes
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {/* Quick filter chips on handle */}
                {[{ id: 'todos', label: 'Todos' }, { id: 'requiere', label: '🔴' }, { id: 'en_proceso', label: '🟠' }, { id: 'atendido', label: '✅' }].map(f => (
                  <button
                    key={f.id}
                    onClick={e => { e.stopPropagation(); setFilter(f.id) }}
                    style={{
                      background: filter === f.id ? '#003893' : '#f0f4ff',
                      color: filter === f.id ? '#fff' : '#374151',
                      border: 'none', borderRadius: 6,
                      padding: '3px 8px', fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                    }}
                  >{f.label}</button>
                ))}
                {/* Expand/collapse chevron */}
                <span style={{ color: '#9AA0AC', fontSize: 14, marginLeft: 4, userSelect: 'none' }}>
                  {sheetState === 'collapsed' ? '▲' : sheetState === 'full' ? '▼' : '⋯'}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable sector list */}
          <div style={{ flex: 1, overflow: 'auto', overscrollBehavior: 'contain' }}>
            <SectorList />
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
