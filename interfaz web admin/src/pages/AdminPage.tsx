import { useState } from 'react'
import type { Store } from '../store'
import { fmtFecha } from '../store'
import Modal from '../components/Modal'
import { restablecerPin, cityId } from '../api'

interface Props { store: Store }

function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminPage({ store }: Props) {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('cr_admin') === '1')
  const [loginError, setLoginError] = useState(false)

  const {
    ciudad, sectores, necesidades, ofrecimientos, mascotas, centros, noticias, viviendas, danos,
    updateSector, deleteSector, updateNecesidad, deleteNecesidad,
    updateOfrecimiento, deleteOfrecimiento, deleteMascota,
    addCentro, updateCentro, deleteCentro,
    addNoticia, updateNoticia, deleteNoticia,
    deleteVivienda, updateDano, deleteDano, setSectores, loginAdmin, logoutAdmin
  } = store

  const [showPinModal, setShowPinModal] = useState<{ pin: string | null; id: number; type: string } | null>(null)
  const [showCentroForm, setShowCentroForm] = useState<any>(null)
  const [showNoticiaForm, setShowNoticiaForm] = useState<any>(null)
  const [showDanoGestionar, setShowDanoGestionar] = useState<any>(null)
  const [showAddNeed, setShowAddNeed] = useState<number | null>(null)
  const [newNeedForm, setNewNeedForm] = useState({ tipo: 'Agua potable', cantidad: '', prioridad: 'alta' as const, descripcion: '', reportado_por: '', telefono_reporta: '' })
  const [centroForm, setCentroForm] = useState<{ nombre: string; organizacion: string; es_acopio: boolean; es_sangre: boolean; es_alojamiento: boolean; que_recibe: string; direccion: string; telefono: string; horario: string; lat: number; lng: number; estado: 'abierto' | 'cerrado'; imagen: string | null }>({ nombre: '', organizacion: '', es_acopio: true, es_sangre: false, es_alojamiento: false, que_recibe: '', direccion: '', telefono: '', horario: '', lat: 5.07, lng: -75.51, estado: 'abierto', imagen: null })
  const [noticiaForm, setNoticiaForm] = useState({ titulo: '', contenido: '', autor: '', ciudad_noticia: '' as string | null })
  const [danoForm, setDanoForm] = useState<{ estado: 'pendiente' | 'visita_programada' | 'visitado'; fecha_visita: string; resultado_visita: string; notas_admin: string }>({ estado: 'pendiente', fecha_visita: '', resultado_visita: '', notas_admin: '' })

  const handleLogin = async () => {
    const ok = await loginAdmin(password)
    if (ok) {
      sessionStorage.setItem('cr_admin', '1')
      setAuthed(true)
    } else {
      setLoginError(true)
    }
  }

  const handleLogout = async () => {
    sessionStorage.removeItem('cr_admin')
    await logoutAdmin()
    setAuthed(false)
  }

  if (!authed) {
    return (
      <div style={{ background: '#f4f5f7', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Acceso administrador</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Ingresa la contraseña de administración</p>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Contraseña</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setLoginError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ textAlign: 'center', letterSpacing: 4 }}
            />
            {loginError && <p style={{ color: '#CE1126', fontSize: 12, margin: '4px 0 0' }}>Contraseña incorrecta.</p>}
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleLogin}>Ingresar</button>
        </div>
      </div>
    )
  }

  // Filtered by city
  const cSectores = sectores.filter(s => s.ciudad === ciudad)
  const cOfrecimientos = ofrecimientos.filter(o => o.ciudad === ciudad)
  const cMascotas = mascotas.filter(m => m.ciudad === ciudad)
  const cCentros = centros.filter(c => c.ciudad === ciudad)
  const cNoticias = noticias.filter(n => n.ciudad === null || n.ciudad === ciudad)
  const cViviendas = viviendas.filter(v => v.ciudad === ciudad)
  const cDanos = danos.filter(d => d.ciudad === ciudad)

  const Section = ({ title, count, children, onExport }: { title: string; count: number; children: React.ReactNode; onExport?: () => void }) => (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e1e4e9', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, flex: 1 }}>{title}</h2>
        <span style={{ background: '#e8eeff', color: '#003893', fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 999 }}>{count}</span>
        {onExport && <button className="btn btn-outline btn-xs" onClick={onExport}>⬇ Exportar CSV</button>}
      </div>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  )

  const Td = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <td style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 13, verticalAlign: 'top', ...style }}>{children}</td>
  )
  const Th = ({ children }: { children: React.ReactNode }) => (
    <th style={{ padding: '8px 14px', background: '#f8f9fb', borderBottom: '1px solid #e1e4e9', fontSize: 12, fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>{children}</th>
  )

  const showPin = (pin: string | null, id: number, type: string) => setShowPinModal({ pin, id, type })
  const resetPin = async (id: number, type: string) => {
    const tabla = type === 'necesidad' ? 'necesidades' : type === 'ofrecimiento' ? 'ofrecimientos' : type === 'mascota' ? 'mascotas_perdidas' : 'viviendas'
    const { pin } = await restablecerPin(tabla, id)
    setShowPinModal(prev => prev ? { ...prev, pin } : null)
  }

  const submitCentro = async () => {
    const r = showCentroForm?.id
      ? await updateCentro(showCentroForm.id, centroForm)
      : await addCentro({ ...centroForm, ciudad })
    if (!r) return
    setShowCentroForm(null)
  }

  const submitNoticia = async () => {
    if (!noticiaForm.titulo.trim()) { alert('El título es obligatorio'); return }
    const ciudadIdNoticia = noticiaForm.ciudad_noticia ? cityId(noticiaForm.ciudad_noticia) : null
    const r = showNoticiaForm?.id
      ? await updateNoticia(showNoticiaForm.id, {
          titulo: noticiaForm.titulo, contenido: noticiaForm.contenido,
          autor: noticiaForm.autor, ciudad: ciudadIdNoticia
        })
      : await addNoticia({
          titulo: noticiaForm.titulo, contenido: noticiaForm.contenido,
          autor: noticiaForm.autor, ciudad: ciudadIdNoticia,
          imagen: null, fecha: new Date().toISOString()
        })
    if (!r) return
    setShowNoticiaForm(null)
  }

  const submitDanoGestionar = async () => {
    if (!showDanoGestionar) return
    const r = await updateDano(showDanoGestionar.id, {
      estado: danoForm.estado,
      fecha_visita: danoForm.fecha_visita || null,
      resultado_visita: danoForm.resultado_visita || null,
      notas_admin: danoForm.notas_admin || null,
    })
    if (!r) return
    setShowDanoGestionar(null)
  }

  const submitAddNeed = async () => {
    if (!showAddNeed) return
    if (!newNeedForm.reportado_por.trim()) { alert('El nombre es obligatorio'); return }
    const pin = await store.addNecesidad({
      sector_id: showAddNeed, tipo: newNeedForm.tipo, descripcion: newNeedForm.descripcion,
      cantidad: newNeedForm.cantidad, prioridad: newNeedForm.prioridad, estado: 'requiere',
      responsable: null, reportado_por: newNeedForm.reportado_por,
      telefono_reporta: newNeedForm.telefono_reporta, fecha: new Date().toISOString(), imagen: null
    })
    if (!pin) return
    setShowAddNeed(null)
    setNewNeedForm({ tipo: 'Agua potable', cantidad: '', prioridad: 'alta', descripcion: '', reportado_por: '', telefono_reporta: '' })
  }

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2430', margin: 0 }}>🛠️ Panel de administración</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Ciudad: <strong>{ciudad}</strong></p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>Cerrar sesión</button>
        </div>

        {/* Sectores */}
        <Section title="📍 Sectores" count={cSectores.length}
          onExport={() => exportCSV(
            cSectores.flatMap(s => necesidades.filter(n => n.sector_id === s.id).map(n => ({
              sector: s.nombre, barrio: s.barrio, nivel: s.nivel_afectacion,
              necesidad: n.tipo, cantidad: n.cantidad, prioridad: n.prioridad,
              estado: n.estado, responsable: n.responsable?.nombre || '', fecha: n.fecha
            }))),
            `sectores-${ciudad}.csv`
          )}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Sector</Th><Th>Nivel</Th><Th>Estado</Th><Th>Necesidades</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {cSectores.map(s => {
                const ns = necesidades.filter(n => n.sector_id === s.id)
                return (
                  <tr key={s.id}>
                    <Td><span style={{ fontWeight: 600 }}>{s.nombre}</span><br/><span style={{ color: '#6b7280', fontSize: 12 }}>{s.barrio}</span></Td>
                    <Td><span className={`tag ${s.nivel_afectacion === 'severo' ? 'tag-red' : s.nivel_afectacion === 'moderado' ? 'tag-orange' : 'tag-gray'}`}>{s.nivel_afectacion.toUpperCase()}</span></Td>
                    <Td><span className={`tag ${s.estado === 'activo' ? 'tag-green' : 'tag-gray'}`}>{s.estado}</span></Td>
                    <Td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {ns.map(n => (
                          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <span style={{ flex: 1 }}>{n.tipo} ({n.estado})</span>
                            <label>
                              <input type="checkbox" checked={n.estado === 'atendida'} onChange={e => updateNecesidad(n.id, { estado: e.target.checked ? 'atendida' : 'requiere' })} />
                              {' '}atendida
                            </label>
                            <button className="btn btn-xs" style={{ background: '#e8eeff', color: '#003893' }} onClick={() => showPin(n.pin, n.id, 'necesidad')}>🔑</button>
                            {n.responsable && <button className="btn btn-xs btn-outline" onClick={() => updateNecesidad(n.id, { responsable: null })}>Liberar</button>}
                            <button className="btn btn-xs btn-red" onClick={() => { if (confirm('¿Eliminar necesidad?')) deleteNecesidad(n.id) }}>✕</button>
                          </div>
                        ))}
                        <button className="btn btn-xs btn-outline" style={{ marginTop: 4, width: 'fit-content' }} onClick={() => setShowAddNeed(s.id)}>+ Agregar necesidad</button>
                      </div>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="btn btn-xs btn-outline" onClick={() => {
                          const name = prompt('Nuevo nombre del sector:', s.nombre)
                          if (name) updateSector(s.id, { nombre: name })
                        }}>✎</button>
                        <button className="btn btn-xs" style={{ background: '#f0f4ff', color: '#003893' }} onClick={() => updateSector(s.id, { estado: s.estado === 'activo' ? 'cerrado' : 'activo' })}>
                          {s.estado === 'activo' ? 'Cerrar' : 'Reactivar'}
                        </button>
                        <button className="btn btn-xs btn-red" onClick={() => { if (confirm('¿Eliminar sector y sus necesidades?')) deleteSector(s.id) }}>✕</button>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>

        {/* Ofrecimientos */}
        <Section title="🤝 Ofrecimientos" count={cOfrecimientos.length}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Estado</Th><Th>Tipo</Th><Th>Ofrece</Th><Th>Reservado por</Th><Th>Fecha</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {cOfrecimientos.map(o => (
                <tr key={o.id}>
                  <Td><span className={`tag ${o.estado === 'entregado' ? 'tag-gray' : o.reservado_por ? 'tag-orange' : 'tag-green'}`}>{o.estado === 'entregado' ? 'entregado' : o.reservado_por ? 'reservado' : 'disponible'}</span></Td>
                  <Td>{o.tipo}<br/><span style={{ color: '#6b7280', fontSize: 12 }}>{o.cantidad}</span></Td>
                  <Td>{o.nombre_ofrece}<br/><span style={{ color: '#6b7280', fontSize: 12 }}>{o.telefono_ofrece}</span></Td>
                  <Td>{o.reservado_por ? <span>{o.reservado_por.nombre}<br/><span style={{ color: '#6b7280', fontSize: 12 }}>{o.reservado_por.telefono}</span></span> : '—'}</Td>
                  <Td>{fmtFecha(o.fecha)}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {o.reservado_por && <button className="btn btn-xs btn-outline" onClick={() => updateOfrecimiento(o.id, { reservado_por: null })}>Liberar</button>}
                      <button className="btn btn-xs" style={{ background: '#e8eeff', color: '#003893' }} onClick={() => showPin(o.pin, o.id, 'ofrecimiento')}>🔑</button>
                      <button className="btn btn-xs btn-red" onClick={() => { if (confirm('¿Eliminar?')) deleteOfrecimiento(o.id) }}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Mascotas */}
        <Section title="🐾 Mascotas" count={cMascotas.length}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Estado</Th><Th>Animal</Th><Th>Señas</Th><Th>Reporta</Th><Th>Avistado por</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {cMascotas.map(m => (
                <tr key={m.id}>
                  <Td><span className={`tag ${m.estado === 'perdido' ? 'tag-red' : 'tag-green'}`}>{m.estado}</span></Td>
                  <Td>{m.tipo_animal} — {m.nombre || 'S/N'}</Td>
                  <Td style={{ maxWidth: 180 }}><span style={{ fontSize: 12, color: '#6b7280' }}>{m.senas.slice(0, 60)}</span></Td>
                  <Td>{m.nombre_reporta}<br/><span style={{ fontSize: 12, color: '#6b7280' }}>{m.telefono_reporta}</span></Td>
                  <Td>{m.avistado_por ? `${m.avistado_por.nombre}` : '—'}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-xs" style={{ background: '#e8eeff', color: '#003893' }} onClick={() => showPin(m.pin, m.id, 'mascota')}>🔑</button>
                      <button className="btn btn-xs btn-red" onClick={() => { if (confirm('¿Eliminar?')) deleteMascota(m.id) }}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Centros de acopio */}
        <Section title="📦 Centros de acopio" count={cCentros.length}>
          <div style={{ padding: '10px 16px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setCentroForm({ nombre: '', organizacion: '', es_acopio: true, es_sangre: false, es_alojamiento: false, que_recibe: '', direccion: '', telefono: '', horario: '', lat: 5.07, lng: -75.51, estado: 'abierto', imagen: null })
              setShowCentroForm({})
            }}>+ Agregar centro</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Estado</Th><Th>Nombre</Th><Th>Tipos</Th><Th>Recibe</Th><Th>Dirección</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {cCentros.map(c => (
                <tr key={c.id}>
                  <Td><span className={`tag ${c.estado === 'abierto' ? 'tag-green' : 'tag-gray'}`}>{c.estado}</span></Td>
                  <Td><span style={{ fontWeight: 600 }}>{c.nombre}</span><br/><span style={{ fontSize: 12, color: '#6b7280' }}>{c.organizacion}</span></Td>
                  <Td>{[c.es_acopio && '📦', c.es_sangre && '🩸', c.es_alojamiento && '🏠'].filter(Boolean).join(' ')}</Td>
                  <Td style={{ maxWidth: 160 }}><span style={{ fontSize: 12 }}>{c.que_recibe.slice(0, 50)}</span></Td>
                  <Td style={{ fontSize: 12 }}>{c.direccion}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-xs btn-outline" onClick={() => { setCentroForm({ ...c }); setShowCentroForm(c) }}>✎</button>
                      <button className="btn btn-xs btn-red" onClick={() => { if (confirm('¿Eliminar centro?')) deleteCentro(c.id) }}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Noticias */}
        <Section title="📰 Noticias" count={cNoticias.length}>
          <div style={{ padding: '10px 16px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setNoticiaForm({ titulo: '', contenido: '', autor: '', ciudad_noticia: ciudad })
              setShowNoticiaForm({})
            }}>+ Publicar noticia</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Título</Th><Th>Visible en</Th><Th>Autor</Th><Th>Fecha</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {cNoticias.map(n => (
                <tr key={n.id}>
                  <Td style={{ maxWidth: 240 }}><span style={{ fontWeight: 600 }}>{n.titulo.slice(0, 60)}</span></Td>
                  <Td>{n.ciudad === null ? <span className="tag tag-yellow">Todas</span> : n.ciudad}</Td>
                  <Td>{n.autor}</Td>
                  <Td>{fmtFecha(n.fecha)}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-xs btn-outline" onClick={() => { setNoticiaForm({ titulo: n.titulo, contenido: n.contenido, autor: n.autor, ciudad_noticia: n.ciudad }); setShowNoticiaForm(n) }}>✎</button>
                      <button className="btn btn-xs btn-red" onClick={() => { if (confirm('¿Eliminar noticia?')) deleteNoticia(n.id) }}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Viviendas */}
        <Section title="🏠 Viviendas" count={cViviendas.length}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Estado</Th><Th>Tipo</Th><Th>Sector</Th><Th>Ofrece</Th><Th>Interesado</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {cViviendas.map(v => (
                <tr key={v.id}>
                  <Td><span className={`tag ${v.estado === 'disponible' ? (v.tipo === 'alquiler' ? 'tag-orange' : 'tag-green') : 'tag-gray'}`}>{v.estado}</span></Td>
                  <Td>{v.tipo === 'alquiler' ? `💰 ${v.precio}` : '🏠 Gratis'}</Td>
                  <Td>{v.sector_referencia}</Td>
                  <Td>{v.nombre_ofrece}<br/><span style={{ fontSize: 12, color: '#6b7280' }}>{v.telefono_ofrece}</span></Td>
                  <Td>{v.interesado ? `${v.interesado.nombre}` : '—'}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-xs" style={{ background: '#e8eeff', color: '#003893' }} onClick={() => showPin(v.pin, v.id, 'vivienda')}>🔑</button>
                      <button className="btn btn-xs btn-red" onClick={() => { if (confirm('¿Eliminar?')) deleteVivienda(v.id) }}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Reportes de daños */}
        <Section title="🏚️ Reportes de daños" count={cDanos.length}
          onExport={() => exportCSV(
            cDanos.map(d => ({
              radicado: d.radicado, tipo: d.tipo_inmueble, direccion: d.direccion,
              nivel: d.nivel_percibido, habitado: d.habitado, estado: d.estado,
              nombre: d.nombre_reportante, telefono: d.telefono_reportante, cedula: d.cedula || '',
              fecha: d.fecha, fecha_visita: d.fecha_visita || '', resultado: d.resultado_visita || ''
            })),
            `danos-${ciudad}.csv`
          )}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Estado</Th><Th>Radicado</Th><Th>Inmueble</Th><Th>Nivel</Th><Th>Reportante</Th><Th>Fecha</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {cDanos.map(d => (
                <tr key={d.id}>
                  <Td><span className={`tag ${d.estado === 'pendiente' ? 'tag-red' : d.estado === 'visita_programada' ? 'tag-orange' : 'tag-green'}`}>{d.estado.replace('_', ' ')}</span></Td>
                  <Td><code style={{ fontSize: 12 }}>{d.radicado}</code></Td>
                  <Td>{d.tipo_inmueble}<br/><span style={{ fontSize: 12, color: '#6b7280' }}>{d.direccion.slice(0, 40)}</span></Td>
                  <Td><span className={`tag ${d.nivel_percibido === 'colapso' || d.nivel_percibido === 'severo' ? 'tag-red' : d.nivel_percibido === 'moderado' ? 'tag-orange' : 'tag-gray'}`}>{d.nivel_percibido}</span></Td>
                  <Td>{d.nombre_reportante}<br/><span style={{ fontSize: 12, color: '#6b7280' }}>{d.telefono_reportante}</span>{d.cedula && <span style={{ fontSize: 11, color: '#9AA0AC', display: 'block' }}>CC: {d.cedula}</span>}</Td>
                  <Td>{fmtFecha(d.fecha)}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-xs btn-outline" onClick={() => {
                        setDanoForm({ estado: d.estado, fecha_visita: d.fecha_visita || '', resultado_visita: d.resultado_visita || '', notas_admin: d.notas_admin || '' })
                        setShowDanoGestionar(d)
                      }}>✎ Gestionar</button>
                      <button className="btn btn-xs btn-red" onClick={() => { if (confirm('¿Eliminar reporte?')) deleteDano(d.id) }}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      {/* PIN modal */}
      {showPinModal && (
        <Modal title="🔑 Código de edición" onClose={() => setShowPinModal(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ background: '#e8eeff', border: '2px dashed #003893', borderRadius: 10, padding: '16px 24px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: '#003893', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Código actual</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: '#003893', letterSpacing: 10, margin: 0 }}>{showPinModal.pin}</p>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Restablecer genera un código nuevo — el anterior deja de funcionar.</p>
            <button className="btn btn-outline btn-sm" onClick={() => resetPin(showPinModal.id, showPinModal.type)}>🔄 Restablecer código</button>
          </div>
        </Modal>
      )}

      {/* Centro form */}
      {showCentroForm !== null && (
        <Modal title={showCentroForm.id ? '✎ Editar centro' : '+ Agregar centro de acopio'} onClose={() => setShowCentroForm(null)} onConfirm={submitCentro} confirmLabel="Guardar" wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nombre <span className="req">*</span></label>
              <input className="form-input" value={centroForm.nombre} onChange={e => setCentroForm(p => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Organización</label>
              <input className="form-input" value={centroForm.organizacion} onChange={e => setCentroForm(p => ({ ...p, organizacion: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" value={centroForm.estado} onChange={e => setCentroForm(p => ({ ...p, estado: e.target.value as any }))}>
                <option value="abierto">Abierto</option>
                <option value="cerrado">Cerrado temporalmente</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Tipo</label>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[{ field: 'es_acopio', label: '📦 Acopio' }, { field: 'es_sangre', label: '🩸 Sangre' }, { field: 'es_alojamiento', label: '🏠 Alojamiento' }].map(t => (
                  <label key={t.field} style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={(centroForm as any)[t.field]} onChange={e => setCentroForm(p => ({ ...p, [t.field]: e.target.checked }))} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Qué recibe</label>
              <textarea className="form-input" value={centroForm.que_recibe} onChange={e => setCentroForm(p => ({ ...p, que_recibe: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Dirección</label>
              <input className="form-input" value={centroForm.direccion} onChange={e => setCentroForm(p => ({ ...p, direccion: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" value={centroForm.telefono} onChange={e => setCentroForm(p => ({ ...p, telefono: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Horario</label>
              <input className="form-input" value={centroForm.horario} onChange={e => setCentroForm(p => ({ ...p, horario: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Latitud</label>
              <input className="form-input" type="number" value={centroForm.lat} onChange={e => setCentroForm(p => ({ ...p, lat: parseFloat(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Longitud</label>
              <input className="form-input" type="number" value={centroForm.lng} onChange={e => setCentroForm(p => ({ ...p, lng: parseFloat(e.target.value) }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Noticia form */}
      {showNoticiaForm !== null && (
        <Modal title={showNoticiaForm.id ? '✎ Editar noticia' : '+ Publicar noticia'} onClose={() => setShowNoticiaForm(null)} onConfirm={submitNoticia} confirmLabel="Publicar" wide>
          <div className="form-group">
            <label className="form-label">Título <span className="req">*</span></label>
            <input className="form-input" value={noticiaForm.titulo} onChange={e => setNoticiaForm(p => ({ ...p, titulo: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Visible en</label>
            <select className="form-select" value={noticiaForm.ciudad_noticia ?? ''} onChange={e => setNoticiaForm(p => ({ ...p, ciudad_noticia: e.target.value || null }))}>
              <option value="">📢 Todas las ciudades</option>
              {['Manizales','Pereira','Cali','Quibdó','Norte del Valle','Armenia'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Contenido</label>
            <textarea className="form-input" style={{ minHeight: 140 }} value={noticiaForm.contenido} onChange={e => setNoticiaForm(p => ({ ...p, contenido: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Autor</label>
            <input className="form-input" value={noticiaForm.autor} onChange={e => setNoticiaForm(p => ({ ...p, autor: e.target.value }))} />
          </div>
        </Modal>
      )}

      {/* Gestionar daño */}
      {showDanoGestionar && (
        <Modal title={`✎ Gestionar reporte ${showDanoGestionar.radicado}`} onClose={() => setShowDanoGestionar(null)} onConfirm={submitDanoGestionar} confirmLabel="Guardar">
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={danoForm.estado} onChange={e => setDanoForm(p => ({ ...p, estado: e.target.value as any }))}>
              <option value="pendiente">🔴 Pendiente</option>
              <option value="visita_programada">🟠 Visita programada</option>
              <option value="visitado">✅ Visitado</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha de visita</label>
            <input className="form-input" type="date" value={danoForm.fecha_visita} onChange={e => setDanoForm(p => ({ ...p, fecha_visita: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Resultado de la visita</label>
            <textarea className="form-input" value={danoForm.resultado_visita} onChange={e => setDanoForm(p => ({ ...p, resultado_visita: e.target.value }))} placeholder="Resultado del ingeniero..." />
          </div>
          <div className="form-group">
            <label className="form-label">Notas internas</label>
            <textarea className="form-input" value={danoForm.notas_admin} onChange={e => setDanoForm(p => ({ ...p, notas_admin: e.target.value }))} />
          </div>
        </Modal>
      )}

      {/* Add need */}
      {showAddNeed && (
        <Modal title="+ Agregar necesidad" onClose={() => setShowAddNeed(null)} onConfirm={submitAddNeed} confirmLabel="Agregar">
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-select" value={newNeedForm.tipo} onChange={e => setNewNeedForm(p => ({ ...p, tipo: e.target.value }))}>
              {['Agua potable','Alimentos','Refugio/Carpas','Medicamentos','Atención médica','Ropa/Cobijas','Maquinaria/Rescate','Mascotas','Otro'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cantidad</label>
            <input className="form-input" value={newNeedForm.cantidad} onChange={e => setNewNeedForm(p => ({ ...p, cantidad: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-input" value={newNeedForm.descripcion} onChange={e => setNewNeedForm(p => ({ ...p, descripcion: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Reportado por <span className="req">*</span></label>
            <input className="form-input" value={newNeedForm.reportado_por} onChange={e => setNewNeedForm(p => ({ ...p, reportado_por: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input className="form-input" type="tel" value={newNeedForm.telefono_reporta} onChange={e => setNewNeedForm(p => ({ ...p, telefono_reporta: e.target.value }))} />
          </div>
        </Modal>
      )}
    </div>
  )
}
