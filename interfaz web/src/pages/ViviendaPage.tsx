import { useState } from 'react'
import type { Store } from '../store'
import Modal from '../components/Modal'
import PinModal from '../components/PinModal'
import ImageInput from '../components/ImageInput'

interface Props { store: Store }

export default function ViviendaPage({ store }: Props) {
  const { ciudad, viviendas, addVivienda, updateVivienda } = store
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [estadoFilter, setEstadoFilter] = useState('disponible')
  const [search, setSearch] = useState('')
  const [showPublicar, setShowPublicar] = useState(false)
  const [showInteres, setShowInteres] = useState<number | null>(null)
  const [showUpdate, setShowUpdate] = useState<number | null>(null)
  const [pinResult, setPinResult] = useState<string | null>(null)

  const [pForm, setPForm] = useState<{
    tipo: 'gratis' | 'alquiler'; precio: string; capacidad: string; tiempo_disponible: string;
    sector_referencia: string; descripcion: string; nombre: string; telefono: string;
    imagen: string | null;
  }>({
    tipo: 'gratis', precio: '', capacidad: '', tiempo_disponible: '',
    sector_referencia: '', descripcion: '', nombre: '', telefono: '',
    imagen: null
  })
  const [iForm, setIForm] = useState({ nombre: '', telefono: '' })
  const [uForm, setUForm] = useState<{ estado: 'disponible' | 'ocupado'; pin: string }>({ estado: 'disponible', pin: '' })

  const items = viviendas
    .filter(v => v.ciudad === ciudad)
    .filter(v => tipoFilter === 'todos' || v.tipo === tipoFilter)
    .filter(v => estadoFilter === 'todos' || v.estado === estadoFilter)
    .filter(v => !search || [v.sector_referencia, v.descripcion, v.nombre_ofrece].join(' ').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.estado === 'disponible' ? -1 : 1)

  const submitPublicar = async () => {
    if (!pForm.nombre.trim()) { alert('Tu nombre es obligatorio'); return }
    if (!pForm.telefono.trim()) { alert('Tu teléfono es obligatorio'); return }
    const pin = await addVivienda({
      ciudad, tipo: pForm.tipo,
      precio: pForm.tipo === 'alquiler' ? pForm.precio : null,
      capacidad: pForm.capacidad, tiempo_disponible: pForm.tiempo_disponible,
      sector_referencia: pForm.sector_referencia, descripcion: pForm.descripcion,
      imagen: pForm.imagen, estado: 'disponible',
      nombre_ofrece: pForm.nombre, telefono_ofrece: pForm.telefono, interesado: null
    })
    if (!pin) return
    setShowPublicar(false)
    setPinResult(pin)
  }

  const submitInteres = async () => {
    if (!showInteres) return
    if (!iForm.nombre.trim()) { alert('Tu nombre es obligatorio'); return }
    if (!iForm.telefono.trim()) { alert('Tu teléfono es obligatorio'); return }
    const r = await updateVivienda(showInteres, {
      interesado: { nombre: iForm.nombre, telefono: iForm.telefono, fecha: new Date().toISOString() }
    })
    if (!r) return
    setShowInteres(null)
    setIForm({ nombre: '', telefono: '' })
    alert('✅ Tu interés fue registrado. Coordina directamente con quien ofrece. Verifica bien con quién hablas antes de compartir datos personales.')
  }

  const submitUpdate = async () => {
    if (!showUpdate) return
    const v = viviendas.find(x => x.id === showUpdate)!
    if (v.pin && uForm.pin !== v.pin) { alert('Código incorrecto'); return }
    const r = await updateVivienda(showUpdate, { estado: uForm.estado, pin: uForm.pin })
    if (!r) return
    setShowUpdate(null)
    alert('✅ Vivienda actualizada.')
  }

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2430', margin: 0 }}>🏠 Vivienda y alojamiento</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>Ofertas comunitarias de alojamiento en {ciudad}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowPublicar(true)}>+ Publicar oferta</button>
        </div>

        <div className="alert-yellow" style={{ marginBottom: 16 }}>
          🔒 Por seguridad, no se publica la dirección exacta. Coordina el encuentro directamente con quien ofrece.
        </div>

        <div style={{ marginBottom: 14 }}>
          <input className="form-input" placeholder="🔍 Buscar por sector, descripción o precio..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {[{ id: 'todos', label: 'Todos' }, { id: 'gratis', label: '🏠 Gratis' }, { id: 'alquiler', label: '💰 Alquiler' }].map(f => (
            <button key={f.id} className={`chip ${tipoFilter === f.id ? 'active' : ''}`} onClick={() => setTipoFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {[{ id: 'todos', label: 'Todos' }, { id: 'disponible', label: '🟢 Disponibles' }, { id: 'ocupado', label: '⚪ Ocupados' }].map(f => (
            <button key={f.id} className={`chip ${estadoFilter === f.id ? 'active' : ''}`} onClick={() => setEstadoFilter(f.id)}>{f.label}</button>
          ))}
        </div>

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            <p style={{ fontSize: 32 }}>🏠</p>
            <p>No hay ofertas de vivienda con este filtro en {ciudad}.</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {items.map(v => {
            const isOcupado = v.estado === 'ocupado'
            return (
              <div key={v.id} className="card card-hover" style={{ opacity: isOcupado ? 0.6 : 1 }}>
                {v.imagen && (
                  <a href={v.imagen} target="_blank" rel="noreferrer">
                    <img src={v.imagen} alt="Foto" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                  </a>
                )}
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className={`tag ${isOcupado ? 'tag-gray' : v.tipo === 'alquiler' ? 'tag-orange' : 'tag-green'}`}>
                      {isOcupado ? '⚪ Ocupado' : v.tipo === 'alquiler' ? '💰 Alquiler' : '🏠 Gratis, disponible'}
                    </span>
                    {v.tipo === 'alquiler' && v.precio && !isOcupado && (
                      <span style={{ fontWeight: 800, color: '#003893', fontSize: 15 }}>{v.precio}</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>📍 {v.sector_referencia}</h3>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>
                    👥 {v.capacidad} · 🕒 {v.tiempo_disponible}
                  </p>
                  {v.descripcion && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>{v.descripcion}</p>}
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>
                    📞 Ofrece: <strong>{v.nombre_ofrece}</strong> · {v.telefono_ofrece}
                  </p>
                  {v.interesado && !isOcupado && (
                    <div className="alert-yellow" style={{ marginBottom: 10, fontSize: 12 }}>
                      🙋 Interesado: <strong>{v.interesado.nombre}</strong> · 📞 {v.interesado.telefono}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!isOcupado && !v.interesado && (
                      <button className="btn btn-primary btn-sm" onClick={() => setShowInteres(v.id)}>Estoy interesado</button>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => {
                      setUForm({ estado: v.estado as any, pin: '' })
                      setShowUpdate(v.id)
                    }}>✎ Actualizar</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showPublicar && (
        <Modal title="🏠 Publicar oferta de vivienda" onClose={() => setShowPublicar(false)} onConfirm={submitPublicar} confirmLabel="Publicar">
          <div className="alert-yellow" style={{ marginBottom: 12, fontSize: 12 }}>
            🔒 No se publicará tu dirección exacta. Solo el sector de referencia.
          </div>
          <div className="form-group">
            <label className="form-label">Tipo <span className="req">*</span></label>
            <select className="form-select" value={pForm.tipo} onChange={e => setPForm(p => ({ ...p, tipo: e.target.value as any }))}>
              <option value="gratis">🏠 Gratis</option>
              <option value="alquiler">💰 Alquiler</option>
            </select>
          </div>
          {pForm.tipo === 'alquiler' && (
            <div className="form-group">
              <label className="form-label">Precio</label>
              <input className="form-input" value={pForm.precio} onChange={e => setPForm(p => ({ ...p, precio: e.target.value }))} placeholder="Ej. $500.000/mes" />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Sector de referencia</label>
            <input className="form-input" value={pForm.sector_referencia} onChange={e => setPForm(p => ({ ...p, sector_referencia: e.target.value }))} placeholder="Ej. Palogrande" />
          </div>
          <div className="form-group">
            <label className="form-label">Capacidad</label>
            <input className="form-input" value={pForm.capacidad} onChange={e => setPForm(p => ({ ...p, capacidad: e.target.value }))} placeholder="Ej. 4 personas" />
          </div>
          <div className="form-group">
            <label className="form-label">Tiempo disponible</label>
            <input className="form-input" value={pForm.tiempo_disponible} onChange={e => setPForm(p => ({ ...p, tiempo_disponible: e.target.value }))} placeholder="Ej. 2 semanas" />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-input" value={pForm.descripcion} onChange={e => setPForm(p => ({ ...p, descripcion: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tu nombre <span className="req">*</span></label>
            <input className="form-input" value={pForm.nombre} onChange={e => setPForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tu teléfono <span className="req">*</span></label>
            <input className="form-input" type="tel" value={pForm.telefono} onChange={e => setPForm(p => ({ ...p, telefono: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Foto (opcional)</label>
            <ImageInput value={pForm.imagen ?? undefined} onChange={v => setPForm(p => ({ ...p, imagen: v ?? null }))} />
          </div>
        </Modal>
      )}

      {showInteres && (
        <Modal title="🏠 Estoy interesado" onClose={() => setShowInteres(null)} onConfirm={submitInteres} confirmLabel="Registrar interés">
          <div className="alert-red" style={{ marginBottom: 12 }}>
            ⚠️ Verifica bien con quién hablas antes de compartir datos personales o acudir a un lugar.
          </div>
          <div className="form-group">
            <label className="form-label">Tu nombre <span className="req">*</span></label>
            <input className="form-input" value={iForm.nombre} onChange={e => setIForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tu teléfono <span className="req">*</span></label>
            <input className="form-input" type="tel" value={iForm.telefono} onChange={e => setIForm(p => ({ ...p, telefono: e.target.value }))} />
          </div>
        </Modal>
      )}

      {showUpdate && (
        <Modal title="✎ Actualizar vivienda" onClose={() => setShowUpdate(null)} onConfirm={submitUpdate} confirmLabel="Guardar">
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={uForm.estado} onChange={e => setUForm(p => ({ ...p, estado: e.target.value as any }))}>
              <option value="disponible">Disponible</option>
              <option value="ocupado">Ya se ocupó / alquiló</option>
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
