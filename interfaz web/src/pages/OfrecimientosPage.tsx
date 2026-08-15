import { useState } from 'react'
import type { Store } from '../store'
import { fmtFecha } from '../store'
import { CATEGORIAS_OFRECIMIENTO } from '../data/mock'
import Modal from '../components/Modal'
import PinModal from '../components/PinModal'
import ImageInput from '../components/ImageInput'

interface Props { store: Store }

export default function OfrecimientosPage({ store }: Props) {
  const { ciudad, ofrecimientos, addOfrecimiento, updateOfrecimiento } = store
  const matchesCiudad = (c: string) => ciudad === 'Colombia' || c === ciudad
  const [catFilter, setCatFilter] = useState('Todas')
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [showPublicar, setShowPublicar] = useState(false)
  const [showReservar, setShowReservar] = useState<number | null>(null)
  const [showUpdate, setShowUpdate] = useState<number | null>(null)
  const [pinResult, setPinResult] = useState<string | null>(null)

  const [pForm, setPForm] = useState({
    tipo: 'Comida y agua', cantidad: '', descripcion: '', nombre: '', telefono: '',
    imagen: null as string | null
  })
  const [rForm, setRForm] = useState({ nombre: '', telefono: '' })
  const [uForm, setUForm] = useState<{ cantidad: string; descripcion: string; estado: 'disponible' | 'entregado'; pin: string; cancelReserva: boolean }>({ cantidad: '', descripcion: '', estado: 'disponible', pin: '', cancelReserva: false })

  const items = ofrecimientos
    .filter(o => matchesCiudad(o.ciudad))
    .filter(o => catFilter === 'Todas' || o.tipo === catFilter)
    .filter(o => {
      if (estadoFilter === 'todos') return true
      const reservado = !!o.reservado_por && o.estado === 'disponible'
      if (estadoFilter === 'disponible') return o.estado === 'disponible' && !reservado
      if (estadoFilter === 'reservado') return reservado
      if (estadoFilter === 'entregado') return o.estado === 'entregado'
      return true
    })
    .filter(o => !search || [o.tipo, o.descripcion, o.nombre_ofrece].join(' ').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const order: Record<string, number> = { disponible: 0, reservado: 1, entregado: 2 }
      const getOrder = (o: typeof a) => {
        if (o.estado === 'entregado') return 2
        if (o.reservado_por) return 1
        return 0
      }
      return getOrder(a) - getOrder(b)
    })

  const getTag = (o: typeof items[0]) => {
    if (o.estado === 'entregado') return <span className="tag tag-gray">✅ Entregado</span>
    if (o.reservado_por) return <span className="tag tag-orange">🟠 Reservado</span>
    return <span className="tag tag-green">🟢 Disponible</span>
  }

  const submitPublicar = async () => {
    if (!pForm.nombre.trim()) { alert('Tu nombre es obligatorio'); return }
    if (!pForm.telefono.trim()) { alert('Tu teléfono es obligatorio'); return }
    const pin = await addOfrecimiento({
      ciudad, tipo: pForm.tipo, descripcion: pForm.descripcion,
      cantidad: pForm.cantidad, nombre_ofrece: pForm.nombre,
      telefono_ofrece: pForm.telefono, fecha: new Date().toISOString(),
      imagen: pForm.imagen, estado: 'disponible', reservado_por: null
    })
    if (!pin) return
    setShowPublicar(false)
    setPinResult(pin)
    setPForm({ tipo: 'Comida y agua', cantidad: '', descripcion: '', nombre: '', telefono: '', imagen: null })
  }

  const submitReservar = async () => {
    if (!showReservar) return
    if (!rForm.nombre.trim()) { alert('Tu nombre es obligatorio'); return }
    if (!rForm.telefono.trim()) { alert('Tu teléfono es obligatorio'); return }
    const r = await updateOfrecimiento(showReservar, {
      reservado_por: { nombre: rForm.nombre, telefono: rForm.telefono, fecha: new Date().toISOString() }
    })
    if (!r) return
    setShowReservar(null)
    setRForm({ nombre: '', telefono: '' })
    alert('✅ Coordinación registrada. El ofrecimiento quedó marcado como reservado.')
  }

  const submitUpdate = async () => {
    if (!showUpdate) return
    const o = ofrecimientos.find(x => x.id === showUpdate)!
    if (o.pin && uForm.pin !== o.pin) { alert('Código incorrecto'); return }
    const r = await updateOfrecimiento(showUpdate, {
      cantidad: uForm.cantidad || o.cantidad,
      descripcion: uForm.descripcion || o.descripcion,
      estado: uForm.estado === 'entregado' ? 'entregado' : 'disponible',
      reservado_por: uForm.cancelReserva ? null : o.reservado_por,
      pin: uForm.pin,
    })
    if (!r) return
    setShowUpdate(null)
    alert('✅ Ofrecimiento actualizado.')
  }

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2430', margin: 0 }}>🤝 Ofrecimientos de ayuda</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
              Ayuda que la comunidad ofrece en {ciudad}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowPublicar(true)}>+ Publicar ofrecimiento</button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 14 }}>
          <input
            className="form-input"
            placeholder="🔍 Buscar por tipo, descripción o nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {['Todas', ...CATEGORIAS_OFRECIMIENTO].map(c => (
            <button key={c} className={`chip ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)}>
              {c}
            </button>
          ))}
        </div>

        {/* Status chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'disponible', label: '🟢 Disponibles' },
            { id: 'reservado', label: '🟠 Reservados' },
            { id: 'entregado', label: '✅ Entregados' },
          ].map(f => (
            <button key={f.id} className={`chip ${estadoFilter === f.id ? 'active' : ''}`} onClick={() => setEstadoFilter(f.id)}>{f.label}</button>
          ))}
        </div>

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            <p style={{ fontSize: 32 }}>🤝</p>
            <p>No hay ofrecimientos con este filtro en {ciudad}.</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {items.map(o => {
            const isEntregado = o.estado === 'entregado'
            const isReservado = !!o.reservado_por && !isEntregado
            return (
              <div key={o.id} className="card card-hover" style={{ opacity: isEntregado ? 0.6 : 1 }}>
                {o.imagen && (
                  <a href={o.imagen} target="_blank" rel="noreferrer">
                    <img src={o.imagen} alt="Foto" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                  </a>
                )}
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{o.tipo} — {o.cantidad}</h3>
                    {getTag(o)}
                  </div>
                  {o.descripcion && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>{o.descripcion}</p>}
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>
                    📞 Ofrece: <strong>{o.nombre_ofrece}</strong> · {o.telefono_ofrece} · {fmtFecha(o.fecha)}
                  </p>
                  {isReservado && o.reservado_por && (
                    <div className="alert-yellow" style={{ marginBottom: 10, fontSize: 12 }}>
                      🙋 Coordina: <strong>{o.reservado_por.nombre}</strong> · 📞 {o.reservado_por.telefono}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!isEntregado && !isReservado && (
                      <button className="btn btn-primary btn-sm" onClick={() => setShowReservar(o.id)}>Coordinar / reservar</button>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => {
                      setUForm({ cantidad: o.cantidad, descripcion: o.descripcion, estado: o.estado as any, pin: '', cancelReserva: false })
                      setShowUpdate(o.id)
                    }}>✎ Actualizar</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showPublicar && (
        <Modal title="🤝 Publicar ofrecimiento" onClose={() => setShowPublicar(false)} onConfirm={submitPublicar} confirmLabel="Publicar">
          <div className="form-group">
            <label className="form-label">Tipo <span className="req">*</span></label>
            <select className="form-select" value={pForm.tipo} onChange={e => setPForm(p => ({ ...p, tipo: e.target.value }))}>
              {CATEGORIAS_OFRECIMIENTO.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cantidad</label>
            <input className="form-input" value={pForm.cantidad} onChange={e => setPForm(p => ({ ...p, cantidad: e.target.value }))} placeholder="Ej. 50 porciones" />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-input" value={pForm.descripcion} onChange={e => setPForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Detalles del ofrecimiento..." />
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

      {showReservar && (
        <Modal title="📞 Coordinar / reservar" onClose={() => setShowReservar(null)} onConfirm={submitReservar} confirmLabel="Confirmar">
          <div className="alert-yellow" style={{ marginBottom: 12 }}>
            Tu nombre y teléfono quedarán visibles para coordinar directamente con quien ofrece.
          </div>
          <div className="form-group">
            <label className="form-label">Tu nombre <span className="req">*</span></label>
            <input className="form-input" value={rForm.nombre} onChange={e => setRForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tu teléfono <span className="req">*</span></label>
            <input className="form-input" type="tel" value={rForm.telefono} onChange={e => setRForm(p => ({ ...p, telefono: e.target.value }))} />
          </div>
        </Modal>
      )}

      {showUpdate && (() => {
        const o = ofrecimientos.find(x => x.id === showUpdate)!
        return (
          <Modal title="✎ Actualizar ofrecimiento" onClose={() => setShowUpdate(null)} onConfirm={submitUpdate} confirmLabel="Guardar cambios">
            <div className="form-group">
              <label className="form-label">Cantidad actualizada</label>
              <input className="form-input" value={uForm.cantidad} onChange={e => setUForm(p => ({ ...p, cantidad: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" value={uForm.estado} onChange={e => setUForm(p => ({ ...p, estado: e.target.value as any }))}>
                <option value="disponible">Disponible</option>
                <option value="entregado">Ya se entregó</option>
              </select>
            </div>
            {o.reservado_por && (
              <div className="form-group">
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={uForm.cancelReserva} onChange={e => setUForm(p => ({ ...p, cancelReserva: e.target.checked }))} />
                  Cancelar esta reserva
                </label>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Código de edición (4 dígitos) <span className="req">*</span></label>
              <input className="form-input" value={uForm.pin} onChange={e => setUForm(p => ({ ...p, pin: e.target.value }))} maxLength={4} style={{ letterSpacing: 8, fontSize: 20 }} />
            </div>
          </Modal>
        )
      })()}

      {pinResult && <PinModal pin={pinResult} onClose={() => setPinResult(null)} />}
    </div>
  )
}
