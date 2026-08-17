import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Store } from '../store'
import { TIPOS_PUNTO_APOYO, ICONO_PUNTO_APOYO } from '../data/mock'
import Modal from '../components/Modal'
import ImageInput from '../components/ImageInput'
import PinModal from '../components/PinModal'

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Props { store: Store }

/**
 * Mini-mapa para ubicar el punto de apoyo: marcador arrastrable y clic para
 * moverlo. Las coordenadas se sincronizan con el formulario.
 */
function MiniMap({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInst = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return
    const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)
    const mk = L.marker([lat, lng], { draggable: true }).addTo(map)
    mk.on('dragend', () => { const p = mk.getLatLng(); onChange(p.lat, p.lng) })
    map.on('click', (e: L.LeafletMouseEvent) => { mk.setLatLng(e.latlng); onChange(e.latlng.lat, e.latlng.lng) })
    markerRef.current = mk
    mapInst.current = map
    setTimeout(() => map.invalidateSize(), 120)
    return () => { map.remove(); mapInst.current = null; markerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sincroniza el marcador cuando el formulario cambia lat/lng (p. ej. geocodificación)
  useEffect(() => {
    if (!mapInst.current || !markerRef.current) return
    const p = markerRef.current.getLatLng()
    if (Math.abs(p.lat - lat) > 1e-6 || Math.abs(p.lng - lng) > 1e-6) {
      markerRef.current.setLatLng([lat, lng])
      mapInst.current.setView([lat, lng], Math.max(mapInst.current.getZoom(), 14))
    }
  }, [lat, lng])

  return <div ref={mapRef} style={{ height: 230, width: '100%', borderRadius: 10, border: '1.5px solid #e1e4e9', marginTop: 4 }} />
}

/** Mapa con los marcadores de todos los puntos de apoyo (imagen, color e info al tocar). */
function MapaPuntos({ puntos }: { puntos: any[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInst = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return
    const p0 = puntos[0]
    const map = L.map(mapRef.current, { zoomControl: true })
      .setView(p0 ? [Number(p0.lat), Number(p0.lng)] : [5.0703, -75.5138], p0 ? 13 : 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    const bounds: [number, number][] = []
    puntos.forEach(p => {
      const lat = Number(p.lat)
      const lng = Number(p.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      const img = p.imagen
      const emoji = ICONO_PUNTO_APOYO[p.tipo] ?? '🏪'
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:38px;height:38px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);background:${p.color || '#003893'} url('${img}') center/cover no-repeat;display:flex;align-items:center;justify-content:center;font-size:16px">${img ? '' : emoji}</div>`,
        iconSize: [38, 38], iconAnchor: [19, 19],
      })
      L.marker([lat, lng], { icon }).addTo(map).bindPopup(`
        <div style="min-width:200px;max-width:260px">
          <h4 style="margin:0 0 4px;font-size:14px;font-weight:700">${emoji} ${p.nombre}</h4>
          <p style="font-size:12px;color:#6b7280;margin:0 0 4px">${p.tipo}</p>
          <p style="font-size:12px;color:#6b7280;margin:0 0 4px">📍 ${p.direccion}</p>
          ${p.telefono ? `<p style="font-size:12px;margin:0">📞 ${p.telefono}</p>` : ''}
        </div>
      `, { maxWidth: 280 })
      bounds.push([lat, lng])
    })
    if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] })
    mapInst.current = map
    setTimeout(() => map.invalidateSize(), 120)
    return () => { map.remove(); mapInst.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ border: '1.5px solid #e1e4e9', borderRadius: 10, overflow: 'hidden' }}>
      <div ref={mapRef} style={{ height: 420, width: '100%' }} />
    </div>
  )
}

const CITY_CENTER: Record<string, [number, number]> = {
  'Colombia': [4.2, -74.0],
  'Manizales': [5.0703, -75.5138],
  'Pereira': [4.8133, -75.6961],
  'Cali': [3.4516, -76.5320],
  'Quibdó': [5.6942, -76.6583],
  'Norte del Valle': [3.9, -76.0],
  'Armenia': [4.5339, -75.6811],
}

/** Paleta de colores agradables para los marcadores; se elige uno al azar por defecto. */
const MARKER_COLORS = [
  '#003893', '#CE1126', '#E08E00', '#2E9E5B', '#7C3AED',
  '#DB2777', '#0891B2', '#65A30D', '#EA580C', '#4338CA',
  '#0D9488', '#BE123C',
]
const randomColor = () => MARKER_COLORS[Math.floor(Math.random() * MARKER_COLORS.length)]

export default function PuntosApoyoPage({ store }: Props) {
  const { ciudad, puntosApoyo, addPuntoApoyo, updatePuntoApoyo, eliminarPuntoApoyo } = store
  const matchesCiudad = (c: string) => ciudad === 'Colombia' || c === ciudad
  const defaultCenter = CITY_CENTER[ciudad] ?? CITY_CENTER.Manizales
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('Todas')

  const [showForm, setShowForm] = useState<any>(null)
  const [pForm, setPForm] = useState({ nombre: '', tipo: 'Centro de acopio', direccion: '', telefono: '', imagen: null as string | null, color: '#003893', lat: defaultCenter[0], lng: defaultCenter[1], pin: '' })
  const [geocoding, setGeocoding] = useState(false)
  const geocodeTimer = useRef<number | null>(null)

  const [pinResult, setPinResult] = useState<string | null>(null)
  const [showMapa, setShowMapa] = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [editPin, setEditPin] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deletePin, setDeletePin] = useState('')

  const items = puntosApoyo
    .filter(p => matchesCiudad(p.ciudad))
    .filter(p => tipoFilter === 'Todas' || p.tipo === tipoFilter)
    .filter(p => !search || [p.nombre, p.tipo, p.direccion, p.telefono].join(' ').toLowerCase().includes(search.toLowerCase()))

  const waNumber = (tel: string) => {
    const d = tel.replace(/\D/g, '')
    if (d.length === 10) return `57${d}`
    if (d.startsWith('57') && d.length === 12) return d
    return d
  }

  const openAdd = () => {
    setPForm({ nombre: '', tipo: 'Centro de acopio', direccion: '', telefono: '', imagen: null, color: randomColor(), lat: defaultCenter[0], lng: defaultCenter[1], pin: '' })
    setShowForm({})
  }

  /** Abre el formulario de edición ya con el PIN ingresado en el paso previo. */
  const openEdit = (p: any, pin: string) => {
    setPForm({ nombre: p.nombre, tipo: p.tipo || 'Otro', direccion: p.direccion, telefono: p.telefono, imagen: p.imagen, color: p.color || '#003893', lat: p.lat, lng: p.lng, pin })
    setShowForm(p)
  }

  /** Paso previo a la edición: pide el PIN antes de mostrar el formulario. */
  const confirmEditPin = () => {
    if (!editTarget) return
    const pin = editPin.trim()
    if (!pin) { alert('Ingresa el código de 4 dígitos que se te dio al publicar.'); return }
    openEdit(editTarget, pin)
    setEditTarget(null)
    setEditPin('')
  }

  /** Geocodifica la dirección y mueve el marcador del mini-mapa. */
  const geocode = async () => {
    const q = `${pForm.direccion}, ${ciudad}`.trim()
    if (!q) { alert('Escribe primero la dirección'); return }
    setGeocoding(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length) {
        setPForm(p => ({ ...p, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }))
      } else {
        alert('No se encontró esa dirección. Arrastra el marcador del mapa hasta el punto exacto.')
      }
    } catch {
      alert('No se pudo consultar el geocodificador. Arrastra el marcador del mapa hasta el punto exacto.')
    }
    setGeocoding(false)
  }

  /** Al mover el marcador en el mapa, actualiza la dirección (geocodificación inversa). */
  const onMapPick = (lat: number, lng: number) => {
    setPForm(p => ({ ...p, lat, lng }))
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`)
      .then(r => r.json())
      .then(d => {
        if (d?.display_name) setPForm(p => ({ ...p, direccion: d.display_name }))
      })
      .catch(() => { /* sin conexión */ })
  }

  /** Al editar la dirección, mueve el marcador (geocodificación con retardo). */
  const onAddressChange = (v: string) => {
    setPForm(p => ({ ...p, direccion: v }))
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current)
    if (v.trim().length < 5) return
    geocodeTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${v}, ${ciudad}`)}`)
        const data = await res.json()
        if (Array.isArray(data) && data.length) {
          setPForm(p => ({ ...p, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }))
        }
      } catch { /* sin conexión */ }
    }, 900)
  }

  const submit = async () => {
    if (!pForm.nombre.trim()) { alert('El nombre es obligatorio'); return }
    if (!pForm.direccion.trim()) { alert('La dirección es obligatoria'); return }

    if (showForm?.id) {
      if (!pForm.pin.trim()) { alert('Ingresa el código de 4 dígitos que se te dio al publicar.'); return }
      const r = await updatePuntoApoyo(showForm.id, { ...pForm, pin: pForm.pin.trim() })
      if (!r) return
      setShowForm(null)
      alert('✅ Punto de apoyo actualizado.')
    } else {
      const pin = await addPuntoApoyo({ ...pForm, ciudad })
      if (!pin) return
      setShowForm(null)
      setPinResult(pin)
    }
    setPForm({ nombre: '', tipo: 'Centro de acopio', direccion: '', telefono: '', imagen: null, color: '#003893', lat: defaultCenter[0], lng: defaultCenter[1], pin: '' })
  }

  const submitDelete = async () => {
    if (!deleteTarget) return
    if (!deletePin.trim()) { alert('Ingresa el código de 4 dígitos que se te dio al publicar.'); return }
    const r = await eliminarPuntoApoyo(deleteTarget.id, deletePin.trim())
    if (!r) return
    setDeleteTarget(null)
    setDeletePin('')
    alert('🗑 Punto de apoyo eliminado.')
  }

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2430', margin: 0 }}>🏪 Puntos de apoyo</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
              Lugares de la red solidaria donde puedes recibir o entregar ayuda en {ciudad}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => setShowMapa(true)}>🗺️ Ver mapa</button>
            <button className="btn btn-primary" onClick={openAdd}>+ Agregar punto de apoyo</button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            className="form-input"
            placeholder="🔍 Buscar por nombre, dirección o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {['Todas', ...TIPOS_PUNTO_APOYO].map(t => (
            <button key={t} className={`chip ${tipoFilter === t ? 'active' : ''}`} onClick={() => setTipoFilter(t)}>
              {t !== 'Todas' && <span style={{ marginRight: 4 }}>{ICONO_PUNTO_APOYO[t] ?? '🏪'}</span>}
              {t}
            </button>
          ))}
        </div>

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <p style={{ fontSize: 36 }}>🏪</p>
            <p>No hay puntos de apoyo registrados en {ciudad} todavía.</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {items.map(p => (
            <div key={p.id} className="card card-hover">
              {p.imagen ? (
                <img src={p.imagen} alt={p.nombre} style={{ width: '100%', height: 170, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: 170, background: '#e8eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42 }}>
                  {ICONO_PUNTO_APOYO[p.tipo] ?? '🏪'}
                </div>
              )}
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#1f2430' }}>{p.nombre}</h3>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.color || '#003893', border: '2px solid #fff', boxShadow: '0 0 0 1px #e1e4e9', flexShrink: 0 }} />
                    <span className="tag tag-blue" style={{ fontSize: 10.5 }}>
                      {ICONO_PUNTO_APOYO[p.tipo] ?? '🏪'} {p.tipo}
                    </span>
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>📍 {p.direccion}</p>
                {p.telefono && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 10px' }}>📞 {p.telefono}</p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a
                    className="btn btn-outline btn-sm"
                    style={{ textDecoration: 'none' }}
                    href={`https://maps.google.com/?q=${p.lat},${p.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    🗺️ Cómo llegar
                  </a>
                  {p.telefono && (
                    <a
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: 'none' }}
                      href={`https://wa.me/${waNumber(p.telefono)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📞 WhatsApp
                    </a>
                  )}
                  <button className="btn btn-outline btn-sm" onClick={() => { setEditTarget(p); setEditPin('') }}>✎ Editar</button>
                  <button className="btn btn-red btn-sm" onClick={() => { setDeleteTarget(p); setDeletePin('') }}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulario con mini-mapa para verificar la ubicación exacta */}
      {showForm !== null && (
        <Modal title={showForm.id ? '✎ Editar punto de apoyo' : '+ Agregar punto de apoyo'} onClose={() => setShowForm(null)} onConfirm={submit} confirmLabel="Guardar" wide>
          <div className="form-group">
            <label className="form-label">Nombre <span className="req">*</span></label>
            <input className="form-input" value={pForm.nombre} onChange={e => setPForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Punto solidario La Linda" />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo <span className="req">*</span></label>
            <select className="form-select" value={pForm.tipo} onChange={e => setPForm(p => ({ ...p, tipo: e.target.value }))}>
              {TIPOS_PUNTO_APOYO.map(t => <option key={t} value={t}>{ICONO_PUNTO_APOYO[t] ?? '🏪'} {t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Dirección <span className="req">*</span></label>
            <input className="form-input" value={pForm.direccion} onChange={e => onAddressChange(e.target.value)} placeholder="Ej. Carrera 23 # 45-67, Barrio La Linda" />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input className="form-input" type="tel" value={pForm.telefono} onChange={e => setPForm(p => ({ ...p, telefono: e.target.value }))} placeholder="300 123 4567" />
          </div>
          <div className="form-group">
            <label className="form-label">Imagen (aparece en el marcador del mapa)</label>
            <ImageInput value={pForm.imagen ?? undefined} onChange={v => setPForm(p => ({ ...p, imagen: v ?? null }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Color del marcador (se asigna al azar; puedes cambiarlo)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color"
                value={/^#[0-9a-fA-F]{3,8}$/.test(pForm.color) ? pForm.color : '#003893'}
                onChange={e => setPForm(p => ({ ...p, color: e.target.value }))}
                style={{ width: 46, height: 36, padding: 2, border: '1px solid #e1e4e9', borderRadius: 8, background: '#fff', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {pForm.color} — los eventos de este punto titilarán con este color en el mapa.
              </span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Ubicación exacta <span className="req">*</span></label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={geocode} disabled={geocoding}>
                {geocoding ? 'Buscando…' : '📍 Ubicar por la dirección'}
              </button>
              <span style={{ fontSize: 11.5, color: '#6b7280', alignSelf: 'center' }}>
                También puedes arrastrar el marcador o hacer clic en el mapa.
              </span>
            </div>
            <MiniMap lat={pForm.lat} lng={pForm.lng} onChange={onMapPick} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              <div>
                <label className="form-label">Latitud</label>
                <input className="form-input" type="number" step="any" value={pForm.lat} onChange={e => setPForm(p => ({ ...p, lat: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <label className="form-label">Longitud</label>
                <input className="form-input" type="number" step="any" value={pForm.lng} onChange={e => setPForm(p => ({ ...p, lng: parseFloat(e.target.value) }))} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Paso previo a la edición: pedir el PIN */}
      {editTarget && (
        <Modal title={`✎ Editar: ${editTarget.nombre}`} onClose={() => setEditTarget(null)} onConfirm={confirmEditPin} confirmLabel="Continuar">
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
            Ingresa el código de 4 dígitos que se te dio al publicar para poder editar este punto.
          </p>
          <div className="form-group">
            <label className="form-label">Código de edición <span className="req">*</span></label>
            <input
              className="form-input"
              autoFocus
              value={editPin}
              onChange={e => setEditPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && editPin.trim() && confirmEditPin()}
              maxLength={32}
              placeholder="····"
              style={{ letterSpacing: 8, fontSize: 20 }}
            />
          </div>
        </Modal>
      )}

      {/* Eliminar con PIN */}
      {deleteTarget && (
        <Modal title={`🗑 Eliminar: ${deleteTarget.nombre}`} onClose={() => setDeleteTarget(null)} onConfirm={submitDelete} confirmLabel="Eliminar definitivamente" confirmClass="btn btn-red">
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
            Ingresa el código de 4 dígitos que se te dio al publicar para eliminar este punto.
          </p>
          <div className="form-group">
            <label className="form-label">Código de edición <span className="req">*</span></label>
            <input className="form-input" value={deletePin} onChange={e => setDeletePin(e.target.value)} maxLength={32} placeholder="····" style={{ letterSpacing: 8, fontSize: 20 }} />
          </div>
        </Modal>
      )}

      {/* Mapa con los marcadores de los puntos de apoyo */}
      {showMapa && (
        <Modal title={`🗺️ Puntos de apoyo — ${ciudad}`} onClose={() => setShowMapa(false)} hideCancel wide>
          {items.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>No hay puntos de apoyo para mostrar con el filtro actual.</p>
          ) : (
            <>
              <MapaPuntos puntos={items} />
              <p style={{ fontSize: 11.5, color: '#9AA0AC', margin: '8px 0 0' }}>
                Toca un marcador para ver los datos del punto de apoyo.
              </p>
            </>
          )}
        </Modal>
      )}

      {pinResult && <PinModal pin={pinResult} onClose={() => setPinResult(null)} />}
    </div>
  )
}
