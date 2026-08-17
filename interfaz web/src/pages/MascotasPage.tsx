import { useState } from 'react'
import type { Store } from '../store'
import { fmtFecha } from '../store'
import Modal from '../components/Modal'
import PinModal from '../components/PinModal'
import ImageInput from '../components/ImageInput'
import MiniMapPicker from '../components/MiniMapPicker'
import { reverseGeocode } from '../api/geo'

interface Props { store: Store }

const CITY_CENTER: Record<string, [number, number]> = {
  'Manizales': [5.0703, -75.5138], 'Pereira': [4.8133, -75.6961],
  'Cali': [3.4516, -76.5320], 'Quibdó': [5.6942, -76.6583],
  'Norte del Valle': [3.9000, -76.0000], 'Armenia': [4.5339, -75.6811],
}

export default function MascotasPage({ store }: Props) {
  const { ciudad, mascotas, addMascota, updateMascota } = store
  const matchesCiudad = (c: string) => ciudad === 'Colombia' || c === ciudad
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [showReportarModal, setShowReportarModal] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [showAvistarModal, setShowAvistarModal] = useState<number | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState<number | null>(null)
  const [pinResult, setPinResult] = useState<string | null>(null)

  const [mForm, setMForm] = useState({
    tipo_animal: 'Perro', nombre: '', senas: '', lugar_visto: '',
    fecha_visto: '', nombre_reporta: '', telefono_reporta: '',
    imagen: null as string | null,
    lat: null as number | null,
    lng: null as number | null,
  })
  const [aForm, setAForm] = useState({ nombre: '', telefono: '' })
  const [uForm, setUForm] = useState<{ nombre: string; senas: string; estado: 'perdido' | 'encontrado'; pin: string; imagen: string | null }>({
    nombre: '', senas: '', estado: 'perdido', pin: '', imagen: null,
  })

  const ciudadMascotas = mascotas.filter(m => matchesCiudad(m.ciudad))
  const filtered = ciudadMascotas
    .filter(m => filter === 'todos' || m.estado === filter)
    .filter(m => !search || [m.nombre, m.tipo_animal, m.senas, m.lugar_visto].join(' ').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.estado === 'perdido' ? -1 : 1))

  const submitReportar = async () => {
    if (!mForm.senas.trim()) { alert('Las señas son obligatorias'); return }
    if (!mForm.nombre_reporta.trim()) { alert('Tu nombre es obligatorio'); return }
    if (!mForm.telefono_reporta.trim()) { alert('Tu teléfono es obligatorio'); return }
    if (!mForm.fecha_visto) { alert('La fecha es obligatoria'); return }
    const [baseLat, baseLng] = CITY_CENTER[ciudad] || [4.8133, -75.6961]
    const lat = mForm.lat ?? baseLat + (Math.random() - 0.5) * 0.01
    const lng = mForm.lng ?? baseLng + (Math.random() - 0.5) * 0.01
    const pin = await addMascota({
      ciudad, nombre: mForm.nombre, tipo_animal: mForm.tipo_animal,
      senas: mForm.senas, imagen: mForm.imagen,
      lat,
      lng,
      lugar_visto: mForm.lugar_visto, fecha_visto: mForm.fecha_visto,
      estado: 'perdido', nombre_reporta: mForm.nombre_reporta,
      telefono_reporta: mForm.telefono_reporta, avistado_por: null,
    })
    if (!pin) return
    setShowReportarModal(false)
    setShowMap(false)
    setPinResult(pin)
    setMForm({ tipo_animal: 'Perro', nombre: '', senas: '', lugar_visto: '', fecha_visto: '', nombre_reporta: '', telefono_reporta: '', imagen: null, lat: null, lng: null })
  }

  const submitAvistar = async () => {
    if (!showAvistarModal) return
    if (!aForm.nombre.trim()) { alert('Tu nombre es obligatorio'); return }
    if (!aForm.telefono.trim()) { alert('Tu teléfono es obligatorio'); return }
    const r = await updateMascota(showAvistarModal, {
      avistado_por: { nombre: aForm.nombre, telefono: aForm.telefono, fecha: new Date().toISOString() },
    })
    if (!r) return
    setShowAvistarModal(null)
    setAForm({ nombre: '', telefono: '' })
    alert('¡Gracias! El avistamiento quedó registrado.')
  }

  const submitUpdate = async () => {
    if (!showUpdateModal) return
    const m = mascotas.find(x => x.id === showUpdateModal)!
    if (m.pin && uForm.pin !== m.pin) { alert('Código incorrecto'); return }
    const r = await updateMascota(showUpdateModal, {
      nombre: uForm.nombre || m.nombre,
      senas: uForm.senas || m.senas,
      estado: uForm.estado,
      imagen: uForm.imagen || m.imagen,
      pin: uForm.pin,
    })
    if (!r) return
    setShowUpdateModal(null)
    alert('✅ Reporte actualizado.')
  }

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2430', margin: 0 }}>🐾 Mascotas perdidas</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>Reportes en {ciudad} · Los marcadores aparecen en el Mapa principal</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowReportarModal(true)}>🐾 Reportar mascota</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <input className="form-input" placeholder="🔍 Buscar por nombre, tipo, señas o lugar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {[{ id: 'todos', label: 'Todas' }, { id: 'perdido', label: '🔴 Perdidas' }, { id: 'encontrado', label: '✅ Encontradas' }].map(f => (
            <button key={f.id} className={`chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <p style={{ fontSize: 36 }}>🐾</p>
            <p>No hay mascotas con este filtro en {ciudad}.</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filtered.map(m => (
            <div key={m.id} className="card card-hover" style={{ opacity: m.estado === 'encontrado' ? 0.65 : 1 }}>
              {m.imagen && (
                <a href={m.imagen} target="_blank" rel="noreferrer">
                  <img src={m.imagen} alt="Foto mascota" style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                </a>
              )}
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className={`tag ${m.estado === 'perdido' ? 'tag-red' : 'tag-green'}`}>
                    {m.estado === 'perdido' ? '🔴 Perdida' : '✅ Encontrada'}
                  </span>
                  <span style={{ fontSize: 12, color: '#9AA0AC' }}>{fmtFecha(m.fecha_visto + 'T00:00:00Z')}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: '#1f2430' }}>
                  {m.tipo_animal}{m.nombre ? ` — ${m.nombre}` : ''}
                </h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>{m.senas}</p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>📍 {m.lugar_visto}</p>
                <p style={{ fontSize: 12, color: '#374151', margin: '0 0 10px' }}>
                  📞 <strong>{m.nombre_reporta}</strong> · {m.telefono_reporta}
                </p>
                {m.avistado_por && (
                  <div className="alert-yellow" style={{ marginBottom: 10, fontSize: 12 }}>
                    🙋 Avistada por: <strong>{m.avistado_por.nombre}</strong> · {m.avistado_por.telefono}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {m.estado === 'perdido' && !m.avistado_por && (
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAvistarModal(m.id)}>Yo la vi / la tengo</button>
                  )}
                  <button className="btn btn-outline btn-sm" onClick={() => {
                    setUForm({ nombre: m.nombre, senas: m.senas, estado: m.estado, pin: '', imagen: null })
                    setShowUpdateModal(m.id)
                  }}>✎ Actualizar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showReportarModal && (
        <Modal title="🐾 Reportar mascota perdida" onClose={() => setShowReportarModal(false)} onConfirm={submitReportar} confirmLabel="Publicar"
          footerExtra={
            <button type="button" className={`btn btn-sm ${showMap ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowMap(v => !v)}>
              {showMap ? '🗺️ Ocultar mapa' : '🗺️ Ubicación'}
            </button>
          }>
          <div className="alert-yellow" style={{ marginBottom: 12, fontSize: 12 }}>
            El marcador aparecerá en el mapa principal con la ubicación aproximada de {ciudad}.
          </div>
          {showMap && (
            <div className="form-group">
              <label className="form-label">Ubicación exacta en el mapa</label>
              <MiniMapPicker
                initial={mForm.lat && mForm.lng ? [mForm.lat, mForm.lng] : (CITY_CENTER[ciudad] || [4.8133, -75.6961])}
                onPick={(lat, lng) => {
                  setMForm(p => ({ ...p, lat, lng }))
                  if (!mForm.lugar_visto.trim()) {
                    reverseGeocode(lat, lng).then(addr => {
                      if (addr) setMForm(prev => (prev.lugar_visto.trim() ? prev : { ...prev, lugar_visto: addr }))
                    })
                  }
                }}
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Tipo <span className="req">*</span></label>
            <select className="form-select" value={mForm.tipo_animal} onChange={e => setMForm(p => ({ ...p, tipo_animal: e.target.value }))}>
              <option>Perro</option><option>Gato</option><option>Otro</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nombre (si lo sabe)</label>
            <input className="form-input" value={mForm.nombre} onChange={e => setMForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Señas <span className="req">*</span></label>
            <textarea className="form-input" value={mForm.senas} onChange={e => setMForm(p => ({ ...p, senas: e.target.value }))} placeholder="Color, tamaño, collar, características..." />
          </div>
          <div className="form-group">
            <label className="form-label">Lugar donde fue vista / se perdió</label>
            <input className="form-input" value={mForm.lugar_visto} onChange={e => setMForm(p => ({ ...p, lugar_visto: e.target.value }))} placeholder="Barrio, calle de referencia..." />
          </div>
          <div className="form-group">
            <label className="form-label">Fecha en que se perdió <span className="req">*</span></label>
            <input className="form-input" type="date" value={mForm.fecha_visto} onChange={e => setMForm(p => ({ ...p, fecha_visto: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tu nombre <span className="req">*</span></label>
            <input className="form-input" value={mForm.nombre_reporta} onChange={e => setMForm(p => ({ ...p, nombre_reporta: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tu teléfono <span className="req">*</span></label>
            <input className="form-input" type="tel" value={mForm.telefono_reporta} onChange={e => setMForm(p => ({ ...p, telefono_reporta: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Foto (opcional)</label>
            <ImageInput value={mForm.imagen ?? undefined} onChange={v => setMForm(p => ({ ...p, imagen: v ?? null }))} />
          </div>
        </Modal>
      )}

      {showAvistarModal && (
        <Modal title="🙋 Yo la vi / la tengo" onClose={() => setShowAvistarModal(null)} onConfirm={submitAvistar} confirmLabel="Registrar avistamiento">
          <div className="alert-yellow" style={{ marginBottom: 12 }}>
            Tu nombre y teléfono quedarán visibles para que el dueño pueda contactarte.
          </div>
          <div className="form-group">
            <label className="form-label">Tu nombre <span className="req">*</span></label>
            <input className="form-input" value={aForm.nombre} onChange={e => setAForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tu teléfono <span className="req">*</span></label>
            <input className="form-input" type="tel" value={aForm.telefono} onChange={e => setAForm(p => ({ ...p, telefono: e.target.value }))} />
          </div>
        </Modal>
      )}

      {showUpdateModal && (
        <Modal title="✎ Actualizar mascota" onClose={() => setShowUpdateModal(null)} onConfirm={submitUpdate} confirmLabel="Guardar">
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="form-input" value={uForm.nombre} onChange={e => setUForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Señas actualizadas</label>
            <textarea className="form-input" value={uForm.senas} onChange={e => setUForm(p => ({ ...p, senas: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={uForm.estado} onChange={e => setUForm(p => ({ ...p, estado: e.target.value as any }))}>
              <option value="perdido">Sigue perdida</option>
              <option value="encontrado">¡Ya apareció!</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Código de edición (4 dígitos) <span className="req">*</span></label>
            <input className="form-input" value={uForm.pin} onChange={e => setUForm(p => ({ ...p, pin: e.target.value }))} maxLength={4} style={{ letterSpacing: 8, fontSize: 20 }} />
          </div>
        </Modal>
      )}

      {pinResult && <PinModal pin={pinResult} onClose={() => setPinResult(null)} />}
    </div>
  )
}
