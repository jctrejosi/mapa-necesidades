import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Store } from '../store'
import { compressImage } from '../store'
import Modal from '../components/Modal'
import PinModal from '../components/PinModal'
import { ICONO_PUNTO_APOYO } from '../data/mock'
import { uploadImage } from '../api'

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CITY_CENTER: Record<string, [number, number]> = {
  Colombia: [4.5709, -74.2973],
  Manizales: [5.0689, -75.5174],
  Pereira: [4.8133, -75.6961],
  Cali: [3.4516, -76.532],
  Quibdó: [5.6947, -76.661],
  'Norte del Valle': [4.4, -76.1],
  Armenia: [4.5339, -75.6811],
}

/** Mini-mapa con un marcador arrastrable para ubicar el evento. */
function MiniMap({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInst = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
      .setView([lat, lng], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map)
    const mk = L.marker([lat, lng], { draggable: true }).addTo(map)
    mk.on('dragend', () => {
      const p = mk.getLatLng()
      onChange(p.lat, p.lng)
    })
    map.on('click', (e: L.LeafletMouseEvent) => {
      mk.setLatLng(e.latlng)
      onChange(e.latlng.lat, e.latlng.lng)
    })
    mapInst.current = map
    markerRef.current = mk
    return () => { map.remove(); mapInst.current = null; markerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mapInst.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
      mapInst.current.setView([lat, lng])
    }
  }, [lat, lng])

  return <div ref={mapRef} style={{ height: 220, width: '100%', borderRadius: 10, border: '1px solid #e1e4e9', marginTop: 8, zIndex: 1 }} />
}

/** ISO → valor para <input type="datetime-local">. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fromLocalInput = (s: string) => {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** +N horas desde ahora, para el período por defecto. */
const defaultInicio = () => toLocalInput(new Date().toISOString())
const defaultFin = () => toLocalInput(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString())

interface Props { store: Store }

export default function EventosPage({ store }: Props) {
  const { ciudad, eventos, addEvento, updateEvento, eliminarEvento } = store
  const matchesCiudad = (c: string) => ciudad === 'Colombia' || c === ciudad
  const defaultCenter = CITY_CENTER[ciudad] ?? CITY_CENTER.Manizales
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [puntoFilter, setPuntoFilter] = useState('todos')
  const [tick, setTick] = useState(0)

  // Grupos (por punto de apoyo) abiertos/cerrados. Sin estado guardado:
  // un grupo se abre por defecto si tiene eventos vigentes, o si se filtra por él.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const [showForm, setShowForm] = useState<any>(null)
  const [eForm, setEForm] = useState({
    titulo: '', descripcion: '', puntoPin: '', direccion: '',
    lat: defaultCenter[0], lng: defaultCenter[1],
    fechaInicio: defaultInicio(), fechaFin: defaultFin(),
    activo: true, pin: '',
    imagenes: [] as string[],
  })
  const geocodeTimer = useRef<number | null>(null)
  const evidenciaRef = useRef<HTMLInputElement>(null)

  const [pinResult, setPinResult] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deletePin, setDeletePin] = useState('')

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000)
    return () => clearInterval(t)
  }, [])

  // Al cambiar de ciudad se reinicia el filtro por punto de apoyo.
  useEffect(() => { setPuntoFilter('todos') }, [ciudad])

  // Al filtrar por un punto concreto, se abre su grupo para ver los eventos de inmediato.
  useEffect(() => {
    setOpenGroups({})
    if (puntoFilter !== 'todos') setOpenGroups({ [`p${puntoFilter}`]: true })
  }, [puntoFilter, ciudad])

  /** ¿Visible en el mapa ahora mismo? */
  const isVigente = (e: any) => {
    if (!e.activo) return false
    const now = Date.now()
    const ini = e.fecha_inicio ? new Date(e.fecha_inicio).getTime() : 0
    const fin = e.fecha_fin ? new Date(e.fecha_fin).getTime() : Infinity
    return now >= ini && now <= fin
  }

  // Puntos de apoyo de la ciudad, para el dropdown de filtro.
  const puntosDeCiudad = Array.from(
    new Map(
      eventos
        .filter(e => matchesCiudad(e.ciudad) && e.punto)
        .map(e => [e.punto.id, e.punto] as const),
    ).values(),
  )

  const items = eventos
    .filter(e => matchesCiudad(e.ciudad))
    .filter(e => puntoFilter === 'todos' || String(e.punto?.id ?? '') === puntoFilter)
    .filter(e => {
      if (estadoFilter === 'todos') return true
      const vigente = isVigente(e)
      if (estadoFilter === 'vigentes') return vigente
      if (estadoFilter === 'inactivos') return !vigente
      return true
    })
    .filter(e => !search || [e.titulo, e.descripcion, e.direccion, e.punto?.nombre ?? ''].join(' ').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (isVigente(a) === isVigente(b) ? 0 : isVigente(a) ? -1 : 1))

  const openAdd = () => {
    setEForm({
      titulo: '', descripcion: '', puntoPin: '', direccion: '',
      lat: defaultCenter[0], lng: defaultCenter[1],
      fechaInicio: defaultInicio(), fechaFin: defaultFin(),
      activo: true, pin: '', imagenes: [],
    })
    setShowForm({})
  }

  const openEdit = (e: any) => {
    setEForm({
      titulo: e.titulo, descripcion: e.descripcion, puntoPin: '',
      direccion: e.direccion, lat: e.lat, lng: e.lng,
      fechaInicio: toLocalInput(e.fecha_inicio), fechaFin: toLocalInput(e.fecha_fin),
      activo: e.activo, pin: '', imagenes: e.imagenes ?? [],
    })
    setShowForm(e)
  }

  /** Al mover el marcador en el mapa, actualiza la dirección (geocodificación inversa). */
  const onMapPick = (lat: number, lng: number) => {
    setEForm(p => ({ ...p, lat, lng }))
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`)
      .then(r => r.json())
      .then(d => {
        if (d?.display_name) setEForm(p => ({ ...p, direccion: d.display_name }))
      })
      .catch(() => { /* sin conexión */ })
  }

  /** Al editar la dirección, mueve el marcador (geocodificación con retardo). */
  const onAddressChange = (v: string) => {
    setEForm(p => ({ ...p, direccion: v }))
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current)
    if (v.trim().length < 5) return
    geocodeTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${v}, ${ciudad}`)}`)
        const data = await res.json()
        if (Array.isArray(data) && data.length) {
          setEForm(p => ({ ...p, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }))
        }
      } catch { /* sin conexión */ }
    }, 900)
  }

  /** Adjunta una evidencia a la galería (comprime y la agrega a eForm.imagenes). */
  const handleEvidencia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { alert('La imagen es demasiado grande (máx. 25MB)'); return }
    try {
      const b64 = await compressImage(file)
      if (b64.length > 6 * 1024 * 1024) { alert('La imagen sigue siendo muy pesada después de comprimirla. Intenta con otra foto.'); return }
      setEForm(p => ({ ...p, imagenes: [...p.imagenes, b64] }))
    } catch {
      alert('No se pudo procesar la imagen')
    }
    if (evidenciaRef.current) evidenciaRef.current.value = ''
  }

  const submit = async () => {
    if (!eForm.titulo.trim()) { alert('El título del evento es obligatorio'); return }
    const inicio = fromLocalInput(eForm.fechaInicio)
    const fin = fromLocalInput(eForm.fechaFin)
    if (!inicio) { alert('Indica la fecha de inicio del evento'); return }

    // Sube las evidencias nuevas (data:) a Cloudinary; las URLs ya guardadas se conservan.
    const imagenes = await Promise.all(
      eForm.imagenes.map(async (img) => (img.startsWith('data:') ? (await uploadImage(img)).path : img)),
    )

    if (showForm?.id) {
      if (!eForm.pin.trim()) { alert('Ingresa el código de 4 dígitos que se te dio al publicar el evento.'); return }
      const r = await updateEvento(showForm.id, {
        titulo: eForm.titulo, descripcion: eForm.descripcion, direccion: eForm.direccion,
        lat: eForm.lat, lng: eForm.lng, activo: eForm.activo,
        fecha_inicio: inicio, fecha_fin: fin, imagenes,
        pin: eForm.pin.trim(),
      })
      if (!r) return
      setShowForm(null)
      alert('✅ Evento actualizado.')
    } else {
      if (!eForm.puntoPin.trim()) { alert('Ingresa el PIN (código de 4 dígitos) del punto de apoyo al que se asocia este evento.'); return }
      const pin = await addEvento({
        titulo: eForm.titulo, descripcion: eForm.descripcion,
        lat: eForm.lat, lng: eForm.lng, direccion: eForm.direccion,
        activo: eForm.activo, fecha_inicio: inicio, fecha_fin: fin,
        punto_pin: eForm.puntoPin.trim(), imagenes,
      })
      if (!pin) return
      setShowForm(null)
      setPinResult(pin)
    }
  }

  const submitDelete = async () => {
    if (!deleteTarget) return
    if (!deletePin.trim()) { alert('Ingresa el código de 4 dígitos que se te dio al publicar el evento.'); return }
    const r = await eliminarEvento(deleteTarget.id, deletePin.trim())
    if (!r) return
    setDeleteTarget(null)
    setDeletePin('')
    alert('🗑 Evento eliminado.')
  }

  const fmtPeriodo = (e: any) => {
    const ini = e.fecha_inicio ? new Date(e.fecha_inicio) : null
    const fin = e.fecha_fin ? new Date(e.fecha_fin) : null
    const f = (d: Date) => `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    if (ini && fin) return `${f(ini)} → ${f(fin)}`
    if (ini) return `Desde ${f(ini)}`
    return 'Sin período'
  }

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2430', margin: 0 }}>📅 Eventos</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
              Actividades temporales de la red solidaria en {ciudad}. Para crearlos necesitas el PIN del punto de apoyo que los organiza.
            </p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Crear evento</button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            className="form-input"
            placeholder="🔍 Buscar por título, descripción, dirección o punto de apoyo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <select
            className="form-select"
            value={puntoFilter}
            onChange={e => setPuntoFilter(e.target.value)}
            style={{ width: 'auto', maxWidth: 280 }}
            aria-label="Filtrar por punto de apoyo"
          >
            <option value="todos">🏪 Todos los puntos de apoyo</option>
            {puntosDeCiudad.map(p => (
              <option key={p.id} value={p.id}>{ICONO_PUNTO_APOYO[p.tipo] ?? '🏪'} {p.nombre}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'vigentes', label: '🟢 Vigentes' },
            { id: 'inactivos', label: '⚪ Inactivos / finalizados' },
          ].map(f => (
            <button key={f.id} className={`chip ${estadoFilter === f.id ? 'active' : ''}`} onClick={() => setEstadoFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <p style={{ fontSize: 36 }}>📅</p>
            <p>No hay eventos registrados en {ciudad} todavía.</p>
          </div>
        )}

        {/* Eventos agrupados por punto de apoyo */}
        {(() => {
          const grupos = new Map<string, { punto: any; eventos: typeof items }>()
          for (const e of items) {
            const key = e.punto?.id ? `p${e.punto.id}` : 'sin_punto'
            const g = grupos.get(key)
            if (g) g.eventos.push(e)
            else grupos.set(key, { punto: e.punto ?? null, eventos: [e] })
          }
          const arr = Array.from(grupos.values())
          const todosAbiertos = arr.every(g => {
            const key = g.punto?.id ? `p${g.punto.id}` : 'sin_punto'
            return openGroups[key] ?? g.eventos.some(isVigente)
          })
          return (
            <>
              {arr.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setOpenGroups(Object.fromEntries(arr.map(g => [g.punto?.id ? `p${g.punto.id}` : 'sin_punto', !todosAbiertos])))}  
                    style={{ fontSize: 12 }}
                  >
                    {todosAbiertos ? '▴ Contraer todos' : '▾ Expandir todos'}
                  </button>
                </div>
              )}
              {arr.map(({ punto, eventos }) => {
                const key = punto?.id ? `p${punto.id}` : 'sin_punto'
                const abierto = openGroups[key] ?? eventos.some(isVigente)
                return (
                  <div key={key} style={{ marginBottom: 16 }}>
                    {/* Encabezado del punto de apoyo: al darle click despliega las tarjetas */}
                    <div
                      onClick={() => setOpenGroups(o => ({ ...o, [key]: !abierto }))}
                      role="button"
                      aria-expanded={abierto}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                        cursor: 'pointer', userSelect: 'none', padding: '10px 14px', borderRadius: 10,
                        background: abierto ? '#eef1f8' : '#fff', border: '1px solid #e1e4e9',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'background .15s',
                      }}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: punto?.color ?? '#003893', flexShrink: 0, border: '2px solid #fff', boxShadow: '0 0 0 1px #e1e4e9' }} />
                      <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1f2430', margin: 0, flex: 1 }}>
                        {punto ? `${ICONO_PUNTO_APOYO[punto.tipo] ?? '🏪'} ${punto.nombre}` : '🏪 Puntos de apoyo'}
                      </h2>
                      {punto?.tipo && (
                        <span className="tag tag-blue" style={{ fontSize: 10.5 }}>{ICONO_PUNTO_APOYO[punto.tipo] ?? '🏪'} {punto.tipo}</span>
                      )}
                      <span style={{ fontSize: 11.5, color: '#9AA0AC' }}>
                        {eventos.length} evento{eventos.length === 1 ? '' : 's'}
                      </span>
                      <span style={{ fontSize: 13, color: '#003893', transition: 'transform .15s', transform: abierto ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                    </div>
                    {abierto && (
                      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', marginTop: 12 }}>
                        {eventos.map(e => {
                          const vigente = isVigente(e)
                          return (
                            <div key={e.id} className="card card-hover">
                              <div style={{ padding: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#1f2430' }}>{e.titulo}</h3>
                                  <span className={`tag ${vigente ? 'tag-green' : 'tag-gray'}`} style={{ fontSize: 10.5 }}>
                                    {vigente ? '🟢 Vigente' : '⚪ Inactivo'}
                                  </span>
                                </div>
                                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>
                                  🕒 {fmtPeriodo(e)}
                                </p>
                                {e.descripcion && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>{e.descripcion}</p>}
                                {e.direccion && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 10px' }}>📍 {e.direccion}</p>}
                                {e.imagenes && e.imagenes.length > 0 && (
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0 0 10px' }}>
                                    {e.imagenes.map((img, i) => (
                                      <a key={i} href={img} target="_blank" rel="noreferrer" title={`Evidencia ${i + 1}`}>
                                        <img src={img} alt={`Evidencia ${i + 1}`} style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 6, border: '1px solid #e1e4e9' }} />
                                      </a>
                                    ))}
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <a
                                    className="btn btn-outline btn-sm"
                                    style={{ textDecoration: 'none' }}
                                    href={`https://maps.google.com/?q=${e.lat},${e.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    🗺️ Cómo llegar
                                  </a>
                                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(e)}>✎ Editar / activar</button>
                                  <button className="btn btn-red btn-sm" onClick={() => { setDeleteTarget(e); setDeletePin('') }}>🗑</button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )
        })()}   
      </div>

      {/* Formulario con mini-mapa para ubicar el evento */}
      {showForm !== null && (
        <Modal
          title={showForm.id ? '✎ Editar evento' : '+ Crear evento'}
          onClose={() => setShowForm(null)}
          onConfirm={submit}
          confirmLabel={showForm.id ? 'Guardar cambios' : 'Publicar evento'}
          wide
        >
          {!showForm.id && (
            <div className="alert-blue" style={{ marginBottom: 12, fontSize: 13 }}>
              🔑 Este evento quedará asociado al punto de apoyo cuyo <strong>PIN</strong> ingreses.
              El PIN es el código de 4 dígitos que se entregó al publicar el punto.
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Título del evento <span className="req">*</span></label>
            <input className="form-input" value={eForm.titulo} onChange={e => setEForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej. Jornada de vacunación de mascotas" />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-input" rows={3} value={eForm.descripcion} onChange={e => setEForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Detalles de la actividad: qué habrá, requisitos, horarios..." />
          </div>
          <div className="form-group">
            <label className="form-label">Evidencias (galería de imágenes)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {eForm.imagenes.map((img, i) => (
                <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={img} alt={`Evidencia ${i + 1}`} style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #e1e4e9' }} />
                  <button
                    type="button"
                    onClick={() => setEForm(p => ({ ...p, imagenes: p.imagenes.filter((_, j) => j !== i) }))}
                    style={{ position: 'absolute', top: -6, right: -6, background: '#CE1126', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer', lineHeight: 1 }}
                    aria-label={`Quitar evidencia ${i + 1}`}
                  >✕</button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => evidenciaRef.current?.click()}
                style={{ width: 96, height: 72, borderRadius: 8, borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                📷 Agregar
              </button>
            </div>
            <span style={{ fontSize: 11.5, color: '#9AA0AC', display: 'block', marginTop: 6 }}>
              JPG, PNG, WEBP — adjunta fotos de la actividad como evidencia.
            </span>
            <input ref={evidenciaRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleEvidencia} />
          </div>
          {!showForm.id && (
            <div className="form-group">
              <label className="form-label">PIN del punto de apoyo <span className="req">*</span></label>
              <input className="form-input" value={eForm.puntoPin} onChange={e => setEForm(p => ({ ...p, puntoPin: e.target.value }))} maxLength={10} placeholder="····" style={{ letterSpacing: 8, fontSize: 20 }} />
            </div>
          )}
          {showForm.id && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: showForm.punto?.color ?? '#003893', flexShrink: 0, border: '2px solid #fff', boxShadow: '0 0 0 1px #e1e4e9' }} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                {ICONO_PUNTO_APOYO[showForm.punto?.tipo ?? ''] ?? '🏪'} {showForm.punto?.nombre} · {showForm.punto?.tipo}
              </span>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Dirección del evento</label>
            <input className="form-input" value={eForm.direccion} onChange={e => onAddressChange(e.target.value)} placeholder="Ej. Carrera 23 # 45-67, Manizales" />
          </div>
          <div className="form-group">
            <label className="form-label">Ubicación en el mapa <span className="req">*</span></label>
            <span style={{ fontSize: 11.5, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              Arrastra el marcador o haz clic en el mapa donde ocurre el evento.
            </span>
            <MiniMap lat={eForm.lat} lng={eForm.lng} onChange={onMapPick} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Inicio <span className="req">*</span></label>
              <input className="form-input" type="datetime-local" value={eForm.fechaInicio} onChange={e => setEForm(p => ({ ...p, fechaInicio: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Fin (opcional)</label>
              <input className="form-input" type="datetime-local" value={eForm.fechaFin} onChange={e => setEForm(p => ({ ...p, fechaFin: e.target.value }))} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 4px', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1f2430' }}>
            <input type="checkbox" checked={eForm.activo} onChange={e => setEForm(p => ({ ...p, activo: e.target.checked }))} style={{ width: 18, height: 18 }} />
            Evento activo (visible en el mapa mientras esté dentro del período)
          </label>
          {showForm.id && (
            <div className="form-group">
              <label className="form-label">Código de edición del evento (PIN o llave de admin) <span className="req">*</span></label>
              <input className="form-input" value={eForm.pin} onChange={e => setEForm(p => ({ ...p, pin: e.target.value }))} maxLength={32} placeholder="····" style={{ letterSpacing: 8, fontSize: 20 }} />
            </div>
          )}
        </Modal>
      )}

      {/* Eliminar con PIN */}
      {deleteTarget && (
        <Modal title={`🗑 Eliminar evento: ${deleteTarget.titulo}`} onClose={() => setDeleteTarget(null)} onConfirm={submitDelete} confirmLabel="Eliminar definitivamente" confirmClass="btn btn-red">
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
            Ingresa el código de 4 dígitos que se te dio al publicar para eliminar este evento.
          </p>
          <div className="form-group">
            <label className="form-label">Código de edición <span className="req">*</span></label>
            <input className="form-input" value={deletePin} onChange={e => setDeletePin(e.target.value)} maxLength={32} placeholder="····" style={{ letterSpacing: 8, fontSize: 20 }} />
          </div>
        </Modal>
      )}

      {pinResult && <PinModal pin={pinResult} onClose={() => setPinResult(null)} />}
    </div>
  )
}
