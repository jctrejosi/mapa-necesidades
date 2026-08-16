import { useState } from 'react'
import type { Store } from '../store'
import { fmtFecha } from '../store'
import * as api from '../api'
import Modal from '../components/Modal'
import PinModal from '../components/PinModal'
import ImageInput from '../components/ImageInput'

interface Props { store: Store }

const MANIZALES_CENTER: [number, number] = [5.0703, -75.5138]

export default function DanosPage({ store }: Props) {
  const { ciudad, danos, addDano } = store
  const [filter, setFilter] = useState('todos')
  const [showReportar, setShowReportar] = useState(false)
  const [showConsultar, setShowConsultar] = useState(false)
  const [radicadoResult, setRadicadoResult] = useState<string | null>(null)
  const [consultaRadicado, setConsultaRadicado] = useState('')
  const [consultaResult, setConsultaResult] = useState<any>(null)

  const [dForm, setDForm] = useState({
    tipo_inmueble: 'Casa', direccion: '', habitado: 'si' as const,
    nivel_percibido: 'leve' as const, descripcion: '', nombre: '', telefono: '', cedula: '',
    imagen: null as string | null,
  })

  const showDanos = ciudad === 'Colombia' || ciudad === 'Manizales'
  const ciudadDanos = danos.filter(d => ciudad === 'Colombia' || d.ciudad === ciudad)
  const filtered = ciudadDanos
    .filter(d => filter === 'todos' || d.estado === filter)
    .sort((a, b) => {
      const order: Record<string, number> = { pendiente: 0, visita_programada: 1, visitado: 2 }
      return (order[a.estado] ?? 0) - (order[b.estado] ?? 0)
    })

  const submitReportar = async () => {
    if (!dForm.direccion.trim()) { alert('La dirección es obligatoria'); return }
    if (!dForm.nombre.trim()) { alert('Tu nombre es obligatorio'); return }
    if (!dForm.telefono.trim()) { alert('Tu teléfono es obligatorio'); return }
    const [lat, lng] = MANIZALES_CENTER
    const radicado = await addDano({
      ciudad, tipo_inmueble: dForm.tipo_inmueble, direccion: dForm.direccion,
      lat: lat + (Math.random() - 0.5) * 0.015,
      lng: lng + (Math.random() - 0.5) * 0.015,
      habitado: dForm.habitado, nivel_percibido: dForm.nivel_percibido,
      descripcion: dForm.descripcion, imagen: dForm.imagen, estado: 'pendiente',
      nombre_reportante: dForm.nombre, telefono_reportante: dForm.telefono,
      cedula: dForm.cedula || null, fecha: new Date().toISOString(),
      fecha_visita: null, resultado_visita: null, notas_admin: null,
    })
    if (!radicado) return
    setShowReportar(false)
    setRadicadoResult(radicado)
    setDForm({ tipo_inmueble: 'Casa', direccion: '', habitado: 'si', nivel_percibido: 'leve', descripcion: '', nombre: '', telefono: '', cedula: '', imagen: null })
  }

  const handleConsultar = async () => {
    const rad = consultaRadicado.trim().toUpperCase()
    if (!rad) return
    try {
      const r = await api.consultarDano(rad)
      setConsultaResult(r)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se encontró un reporte con ese número de radicado.')
    }
  }

  if (!showDanos) {
    return (
      <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
        <div className="page-container" style={{ maxWidth: 600 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2430', marginBottom: 16 }}>🏚️ Reporte de daños (Manizales)</h1>
          <div className="alert-yellow">
            <strong>⚠️ Esta función solo está disponible en Manizales</strong>
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>
              El reporte de daños estructurales opera bajo convenio con la Alcaldía de Manizales.
              Selecciona Manizales en el selector de ciudad del encabezado para acceder.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const nivelColor: Record<string, string> = { leve: 'tag-orange', moderado: 'tag-red', severo: 'tag-red', colapso: 'tag-red' }

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
      <div className="alert-red" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
        <strong>⚠️ Esto NO es un canal de emergencia.</strong> Si hay riesgo de colapso o personas atrapadas, llama al <strong>📞 123</strong>.
      </div>

      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2430', margin: 0 }}>🏚️ Daños estructurales</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>{ciudad} · Los marcadores aparecen en la capa Daños del Mapa principal</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowConsultar(true)}>🔎 Consultar radicado</button>
            <button className="btn btn-primary" onClick={() => setShowReportar(true)}>+ Reportar daño</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {[{ id: 'todos', label: 'Todos' }, { id: 'pendiente', label: '🔴 Pendientes' }, { id: 'visita_programada', label: '🟠 Con visita' }, { id: 'visitado', label: '✅ Visitados' }].map(f => (
            <button key={f.id} className={`chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <p style={{ fontSize: 36 }}>🏚️</p>
            <p>No hay reportes con este filtro en {ciudad}.</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filtered.map(d => (
            <div key={d.id} className="card">
              {d.imagen && (
                <a href={d.imagen} target="_blank" rel="noreferrer">
                  <img src={d.imagen} alt="Foto daño" style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                </a>
              )}
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <span className={`tag ${d.estado === 'pendiente' ? 'tag-red' : d.estado === 'visita_programada' ? 'tag-orange' : 'tag-green'}`}>
                    {d.estado === 'pendiente' ? '🔴 Pendiente' : d.estado === 'visita_programada' ? '🟠 Visita prog.' : '✅ Visitado'}
                  </span>
                  <span className={`tag ${nivelColor[d.nivel_percibido] || 'tag-gray'}`} style={{ fontSize: 11 }}>
                    {d.nivel_percibido.toUpperCase()}
                  </span>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', color: '#1f2430' }}>{d.tipo_inmueble}</h3>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>📍 {d.direccion}</p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>
                  {d.habitado === 'si' ? '🏠 Habitado' : d.habitado === 'evacuado' ? '⚠️ Evacuado' : '🔒 Desocupado'} · {fmtFecha(d.fecha)}
                </p>
                {d.descripcion && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>{d.descripcion}</p>}
                {d.resultado_visita && (
                  <p style={{ fontSize: 12, color: '#2E9E5B', margin: '4px 0 0' }}>✅ {d.resultado_visita}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showReportar && (
        <Modal title="🏚️ Reportar daño estructural" onClose={() => setShowReportar(false)} onConfirm={submitReportar} confirmLabel="Enviar reporte">
          <div className="alert-red" style={{ marginBottom: 12, fontSize: 12 }}>
            🔒 Tus datos de contacto solo los ve el equipo de visitas técnicas.
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de inmueble <span className="req">*</span></label>
            <select className="form-select" value={dForm.tipo_inmueble} onChange={e => setDForm(p => ({ ...p, tipo_inmueble: e.target.value }))}>
              <option>Casa</option><option>Apartamento</option><option>Edificio</option>
              <option>Local comercial</option><option>Otro</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Dirección <span className="req">*</span></label>
            <input className="form-input" value={dForm.direccion} onChange={e => setDForm(p => ({ ...p, direccion: e.target.value }))} placeholder="Calle 12 # 5-34, Barrio..." />
          </div>
          <div className="form-group">
            <label className="form-label">¿El inmueble está habitado? <span className="req">*</span></label>
            <select className="form-select" value={dForm.habitado} onChange={e => setDForm(p => ({ ...p, habitado: e.target.value as any }))}>
              <option value="si">Sí, está habitado</option>
              <option value="evacuado">Fue evacuado</option>
              <option value="no">No, estaba desocupado</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nivel de daño percibido <span className="req">*</span></label>
            <select className="form-select" value={dForm.nivel_percibido} onChange={e => setDForm(p => ({ ...p, nivel_percibido: e.target.value as any }))}>
              <option value="leve">Leve (fisuras superficiales)</option>
              <option value="moderado">Moderado (grietas en muros)</option>
              <option value="severo">Severo (daño estructural)</option>
              <option value="colapso">⚠️ Riesgo de colapso</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción del daño</label>
            <textarea className="form-input" value={dForm.descripcion} onChange={e => setDForm(p => ({ ...p, descripcion: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tu nombre <span className="req">*</span></label>
            <input className="form-input" value={dForm.nombre} onChange={e => setDForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tu teléfono <span className="req">*</span></label>
            <input className="form-input" type="tel" value={dForm.telefono} onChange={e => setDForm(p => ({ ...p, telefono: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Cédula (opcional)</label>
            <input className="form-input" value={dForm.cedula} onChange={e => setDForm(p => ({ ...p, cedula: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Foto del daño (opcional)</label>
            <ImageInput value={dForm.imagen ?? undefined} onChange={v => setDForm(p => ({ ...p, imagen: v ?? null }))} />
          </div>
        </Modal>
      )}

      {showConsultar && (
        <Modal title="🔎 Consultar estado de reporte" onClose={() => { setShowConsultar(false); setConsultaResult(null) }}>
          <div className="form-group">
            <label className="form-label">Número de radicado</label>
            <input className="form-input" value={consultaRadicado} onChange={e => setConsultaRadicado(e.target.value)} placeholder="DA482913" style={{ fontFamily: 'monospace', fontSize: 16, letterSpacing: 2 }} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginBottom: 16 }} onClick={handleConsultar}>Consultar</button>
          {consultaResult && (
            <div style={{ background: '#f4f5f7', borderRadius: 8, padding: 14 }}>
              <span className={`tag ${consultaResult.estado === 'pendiente' ? 'tag-red' : consultaResult.estado === 'visita_programada' ? 'tag-orange' : 'tag-green'}`} style={{ marginBottom: 8, display: 'inline-block' }}>
                {consultaResult.estado === 'pendiente' ? '🔴 Pendiente' : consultaResult.estado === 'visita_programada' ? '🟠 Visita programada' : '✅ Visitado'}
              </span>
              <p style={{ fontSize: 14, margin: '8px 0 4px' }}><strong>{consultaResult.tipo_inmueble}</strong> — {consultaResult.direccion}</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>Nivel: {consultaResult.nivel_percibido} · {fmtFecha(consultaResult.fecha)}</p>
              {consultaResult.fecha_visita && (
                <p style={{ fontSize: 13, color: '#E08E00', margin: '0 0 4px' }}>📅 Visita: {consultaResult.fecha_visita}</p>
              )}
              {consultaResult.resultado_visita ? (
                <p style={{ fontSize: 13, color: '#2E9E5B', margin: 0 }}>✅ {consultaResult.resultado_visita}</p>
              ) : (
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Aún sin resultado de visita.</p>
              )}
            </div>
          )}
        </Modal>
      )}

      {radicadoResult && <PinModal radicado={radicadoResult} onClose={() => setRadicadoResult(null)} />}
    </div>
  )
}
