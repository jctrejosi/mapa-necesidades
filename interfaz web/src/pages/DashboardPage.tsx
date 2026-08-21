import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { Store, Necesidad } from '../store'
import type { PuntoApoyo, Sector, Evento } from '../api/types'
import { TIPOS_NECESIDAD, needLabel, needIcon } from '../data/mock'
import Modal from '../components/Modal'

interface Props { store: Store }

/**
 * Mapa con los marcadores de las necesidades asignadas a un punto de apoyo.
 * Colores por estado: rojo = pendiente, amarillo = en proceso, verde = atendida.
 * Los pendientes y en proceso TITILAN (animación CSS).
 */
function PuntoMapa({ punto, necesidades, eventos, sectores }: { punto: PuntoApoyo; necesidades: Necesidad[]; eventos: Evento[]; sectores: Sector[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInst = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return
    const map = L.map(mapRef.current, { center: [punto.lat, punto.lng], zoom: 13, scrollWheelZoom: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map)
    // Marcador del punto de apoyo
    const iconP = punto.imagen
      ? L.divIcon({
        className: '',
        html: `<img src="${punto.imagen}" style="width:36px;height:36px;border-radius:50%;border:3px solid #fff;object-fit:cover;box-shadow:0 2px 8px rgba(0,0,0,.4)"/>`,
        iconSize: [36, 36], iconAnchor: [18, 18],
      })
      : L.divIcon({
        className: '',
        html: '<div style="width:32px;height:32px;border-radius:50%;background:#003893;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:15px">🏪</div>',
        iconSize: [32, 32], iconAnchor: [16, 16],
      })
    L.marker([punto.lat, punto.lng], { icon: iconP }).addTo(map).bindPopup(`<b>${punto.nombre}</b>`)
    mapInst.current = map
    setTimeout(() => map.invalidateSize(), 120)
    return () => { map.remove(); mapInst.current = null }
  }, [punto])

  useEffect(() => {
    const map = mapInst.current
    if (!map) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    for (const n of necesidades) {
      const s = sectores.find(x => x.id === n.sector_id)
      if (!s) continue
      const atendida = n.estado === 'atendida'
      const enProceso = n.estado === 'requiere' && !!n.responsable
      const color = atendida ? '#2E9E5B' : enProceso ? '#EAB308' : '#CE1126'
      const blink = atendida ? '' : ' marker-blink'
      const icon = L.divIcon({
        className: '',
        html: `<div class="marker-dot${blink}" style="background:${color}"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8],
      })
      const label = atendida ? '✅ Atendida' : enProceso ? '🟠 En proceso' : '🔴 Pendiente'
      const mk = L.marker([s.lat, s.lng], { icon }).addTo(map)
      mk.bindPopup(`<b>${n.tipo}</b> — ${label}<br>${(n.descripcion || '').slice(0, 120)}`)
      markersRef.current.push(mk)
    }
    // Eventos del punto: azul = activo (titila), gris = terminado.
    for (const ev of eventos) {
      const color = ev.activo ? '#2563EB' : '#9AA0AC'
      const blink = ev.activo ? ' marker-blink' : ''
      const icon = L.divIcon({
        className: '',
        html: `<div class="marker-square${blink}" style="background:${color}"></div>`,
        iconSize: [15, 15], iconAnchor: [7.5, 7.5],
      })
      const label = ev.activo ? '🟦 Evento activo' : '⚪ Evento terminado'
      const mk = L.marker([ev.lat, ev.lng], { icon }).addTo(map)
      mk.bindPopup(`<b>${ev.titulo}</b> — ${label}<br>${(ev.descripcion || '').slice(0, 120)}`)
      markersRef.current.push(mk)
    }
    // Ajusta el mapa para que se vean todos los marcadores (reportes + eventos + punto).
    const pts: [number, number][] = [[punto.lat, punto.lng], ...markersRef.current.map(m => [m.getLatLng().lat, m.getLatLng().lng] as [number, number])]
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 15 })
    }
  }, [necesidades, eventos, sectores, punto])

  return <div ref={mapRef} style={{ height: 340, width: '100%', borderRadius: 10 }} />
}

export default function DashboardPage({ store }: Props) {
  const { ciudad, sectores, necesidades, ofrecimientos, puntosApoyo, eventos } = store
  const matchesCiudad = (c: string) => ciudad === 'Colombia' || c === ciudad
  const [tick, setTick] = useState(0)
  const [listModal, setListModal] = useState<{ title: string; items: { titulo: string; subtitulo?: string; need?: Necesidad }[] } | null>(null)
  const [detailNeed, setDetailNeed] = useState<Necesidad | null>(null)
  const [mapPunto, setMapPunto] = useState<PuntoApoyo | null>(null)
  const [puntoModal, setPuntoModal] = useState<PuntoApoyo | null>(null)

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const ciudadSectores = sectores.filter(s => matchesCiudad(s.ciudad) && s.estado === 'activo')
  const ciudadNecesidades = necesidades.filter(n => ciudadSectores.some(s => s.id === n.sector_id))
  const ciudadOfrecimientos = ofrecimientos.filter(o => matchesCiudad(o.ciudad) && o.estado === 'disponible' && !o.reservado_por)

  const total = ciudadNecesidades.length
  const atendidas = ciudadNecesidades.filter(n => n.estado === 'atendida').length
  const enProceso = ciudadNecesidades.filter(n => n.estado === 'requiere' && n.responsable).length
  const sinAsignar = ciudadNecesidades.filter(n => n.estado === 'requiere' && !n.responsable).length
  const pct = total > 0 ? Math.round((atendidas / total) * 100) : 0

  const pieData = [
    { name: 'Atendidas', value: atendidas, color: '#2E9E5B' },
    { name: 'En proceso', value: enProceso, color: '#E08E00' },
    { name: 'Sin asignar', value: sinAsignar, color: '#CE1126' },
  ].filter(d => d.value > 0)

  const stats = [
    { key: 'sectores', icon: '📍', label: 'Sectores activos', value: ciudadSectores.length, color: '#003893' },
    { key: 'necesidades', icon: '📋', label: 'Necesidades reportadas', value: total, color: '#1f2430' },
    { key: 'sin_asignar', icon: '🟥', label: 'Sin asignar', value: sinAsignar, color: '#CE1126' },
    { key: 'en_proceso', icon: '🟧', label: 'En proceso', value: enProceso, color: '#E08E00' },
    { key: 'atendidas', icon: '✅', label: 'Atendidas', value: atendidas, color: '#2E9E5B' },
    { key: 'ofrecimientos', icon: '🤝', label: 'Ofrecimientos disponibles', value: ciudadOfrecimientos.length, color: '#003893' },
  ]

  const sectorNombre = (id: number) => sectores.find(s => s.id === id)?.nombre ?? 'Sector'
  const needItem = (n: Necesidad) => ({
    titulo: `${needIcon(n.tipo)} ${n.tipo}`,
    subtitulo: `${(n.descripcion || 'Sin descripción').slice(0, 90)} · ${sectorNombre(n.sector_id)}`,
    need: n,
  })

  /** Abre el modal con los reportes de un fragmento de la gráfica de progreso. */
  const openGrupo = (name: string) => {
    let title = ''
    let items: { titulo: string; subtitulo?: string; need?: Necesidad }[] = []
    if (name === 'Sin asignar') {
      title = '🟥 Sin asignar'
      items = ciudadNecesidades.filter(n => n.estado === 'requiere' && !n.responsable).map(needItem)
    } else if (name === 'En proceso') {
      title = '🟧 En proceso'
      items = ciudadNecesidades.filter(n => n.estado === 'requiere' && n.responsable).map(needItem)
    } else if (name === 'Atendidas') {
      title = '✅ Atendidas'
      items = ciudadNecesidades.filter(n => n.estado === 'atendida').map(needItem)
    }
    setListModal({ title, items })
  }

  /** Abre el modal con el listado de reportes de la tarjeta tocada. */
  const openStat = (key: string) => {
    let title = ''
    let items: { titulo: string; subtitulo?: string }[] = []
    if (key === 'sectores') {
      title = '📍 Sectores activos'
      items = ciudadSectores.map(s => ({ titulo: s.nombre, subtitulo: s.nivel_afectacion ? `Nivel de afectación: ${s.nivel_afectacion}` : undefined }))
    } else if (key === 'necesidades') {
      title = '📋 Necesidades reportadas'
      items = ciudadNecesidades.map(needItem)
    } else if (key === 'sin_asignar') {
      title = '🟥 Sin asignar'
      items = ciudadNecesidades.filter(n => n.estado === 'requiere' && !n.responsable).map(needItem)
    } else if (key === 'en_proceso') {
      title = '🟧 En proceso'
      items = ciudadNecesidades.filter(n => n.estado === 'requiere' && n.responsable).map(needItem)
    } else if (key === 'atendidas') {
      title = '✅ Atendidas'
      items = ciudadNecesidades.filter(n => n.estado === 'atendida').map(needItem)
    } else if (key === 'ofrecimientos') {
      title = '🤝 Ofrecimientos disponibles'
      items = ciudadOfrecimientos.map(o => ({ titulo: o.tipo, subtitulo: `${o.nombre_ofrece}${o.telefono_ofrece ? ` · ${o.telefono_ofrece}` : ''}` }))
    }
    setListModal({ title, items })
  }

  // By type (agrupa tipos legacy y nuevos en las categorías canónicas)
  const byType = TIPOS_NECESIDAD.map(tipo => {
    const ns = ciudadNecesidades.filter(n => needLabel(n.tipo) === tipo)
    return {
      tipo, total: ns.length,
      sinAsignar: ns.filter(n => n.estado === 'requiere' && !n.responsable).length,
      enProceso: ns.filter(n => n.estado === 'requiere' && n.responsable).length,
      atendidas: ns.filter(n => n.estado === 'atendida').length,
    }
  }).filter(t => t.total > 0).sort((a, b) => b.sinAsignar - a.sinAsignar)

  // By sector
  const bySector = ciudadSectores.map(s => {
    const ns = ciudadNecesidades.filter(n => n.sector_id === s.id)
    return {
      id: s.id, nombre: s.nombre, total: ns.length,
      sinAsignar: ns.filter(n => n.estado === 'requiere' && !n.responsable).length,
      enProceso: ns.filter(n => n.estado === 'requiere' && n.responsable).length,
      atendidas: ns.filter(n => n.estado === 'atendida').length,
    }
  }).filter(s => s.total > 0).sort((a, b) => b.sinAsignar - a.sinAsignar)

  // Métricas por punto de apoyo (una tarjeta por punto).
  const ciudadPuntos = puntosApoyo
    .filter(p => matchesCiudad(p.ciudad))
    .map(p => {
      const ns = necesidades.filter(n => n.ayuda_punto_apoyo_id === p.id)
      return {
        p,
        total: ns.length,
        sinAsignar: ns.filter(n => n.estado === 'requiere' && !n.responsable).length,
        enProceso: ns.filter(n => n.estado === 'requiere' && n.responsable).length,
        atendidas: ns.filter(n => n.estado === 'atendida').length,
        eventos: eventos.filter(e => e.punto?.id === p.id).length,
      }
    })

  /** Abre el modal con las necesidades de un tipo específico. */
  const openTipo = (tipo: string) => {
    const ns = ciudadNecesidades.filter(n => needLabel(n.tipo) === tipo)
    setListModal({ title: `Necesidades — ${tipo}`, items: ns.map(needItem) })
  }

  /** Abre el modal con las necesidades de un sector específico. */
  const openSector = (sectorId: number) => {
    const s = sectores.find(x => x.id === sectorId)
    const ns = ciudadNecesidades.filter(n => n.sector_id === sectorId)
    setListModal({ title: `Sector: ${s?.nombre ?? 'Sector'}`, items: ns.map(needItem) })
  }

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
      <div className="page-container-wide">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2430', margin: 0 }}>📊 Impacto — {ciudad}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9AA0AC' }}>Actualiza automáticamente cada 30 segundos</p>
        </div>

        {total === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <p style={{ fontSize: 32 }}>📊</p>
            <p>Todavía no hay necesidades reportadas en {ciudad}.</p>
          </div>
        )}

        {total > 0 && (
          <>
            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
              {stats.map(s => (
                <div key={s.label} className="stat-card" onClick={() => openStat(s.key)} title={`Ver ${s.label}`} style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: s.color, fontFamily: "'Work Sans', sans-serif", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Donut + legend */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Progreso general</h2>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
                <div style={{ position: 'relative', width: 200, height: 200, flexShrink: 0 }}>
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={pieData} cx={95} cy={95} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270} cursor="pointer" onClick={(data: any) => openGrupo(data?.payload?.name)}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: '#003893', fontFamily: "'Work Sans', sans-serif" }}>{pct}%</span>
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>atendido</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Atendidas', value: atendidas, color: '#2E9E5B' },
                    { label: 'En proceso', value: enProceso, color: '#E08E00' },
                    { label: 'Sin asignar', value: sinAsignar, color: '#CE1126' },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => openGrupo(item.label)}
                      title={`Ver reportes: ${item.label}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                        background: '#fff', border: `1.5px solid ${item.color}`,
                        fontFamily: "'Nunito', sans-serif", textAlign: 'left',
                        transition: 'box-shadow .15s, transform .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 3px 10px ${item.color}40`; e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
                    >
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: '#1f2430', flex: 1, fontWeight: 700 }}>{item.label}</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: item.color }}>{item.value}</span>
                      <span style={{ fontSize: 12, color: '#9AA0AC', fontWeight: 600 }}>({total > 0 ? Math.round((item.value / total) * 100) : 0}%)</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Puntos de apoyo: una tarjeta por punto con métricas + mapa */}
            {ciudadPuntos.length > 0 && (
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🏪 Puntos de apoyo — informe por punto</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                  {ciudadPuntos.map(({ p, total, sinAsignar, enProceso, atendidas, eventos: evs }) => (
                    <div
                      key={p.id}
                      className="card"
                      onClick={() => setPuntoModal(p)}
                      title="Ver reportes atendidos y eventos del punto"
                      style={{ padding: 14, border: '1px solid #e1e4e9', cursor: 'pointer', transition: 'box-shadow .15s, transform .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,56,147,0.15)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.imagen
                          ? <img src={p.imagen} alt={p.nombre} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e1e4e9', flexShrink: 0 }} />
                          : <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e8eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏪</div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#1f2430', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                          <div style={{ fontSize: 11.5, color: '#6b7280' }}>{p.tipo || 'Punto de apoyo'}</div>
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={e => { e.stopPropagation(); setMapPunto(p) }} title="Ver mapa de reportes del punto">🗺️ Mapa</button>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12.5, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div>📋 Necesidades asignadas: <strong style={{ color: '#1f2430' }}>{total}</strong></div>
                        <div>🔴 Pendientes: <strong style={{ color: '#CE1126' }}>{sinAsignar}</strong> · 🟠 En proceso: <strong style={{ color: '#E08E00' }}>{enProceso}</strong> · ✅ Atendidas: <strong style={{ color: '#2E9E5B' }}>{atendidas}</strong></div>
                        <div>📅 Eventos: <strong style={{ color: '#1f2430' }}>{evs}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By type */}
            {byType.length > 0 && (
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Avance por tipo de necesidad</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {byType.map(t => (
                    <div key={t.tipo} onClick={() => openTipo(t.tipo)} title={`Ver reportes de ${t.tipo}`} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{t.tipo}</span>
                        {t.sinAsignar > 0 && <span className="tag tag-red">{t.sinAsignar} sin asignar</span>}
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{t.atendidas}/{t.total} atendidas</span>
                      </div>
                      <div style={{ height: 10, borderRadius: 999, background: '#f0f0f0', overflow: 'hidden', display: 'flex' }}>
                        {t.atendidas > 0 && <div style={{ width: `${(t.atendidas / t.total) * 100}%`, background: '#2E9E5B', transition: 'width 0.3s' }} />}
                        {t.enProceso > 0 && <div style={{ width: `${(t.enProceso / t.total) * 100}%`, background: '#E08E00' }} />}
                        {t.sinAsignar > 0 && <div style={{ width: `${(t.sinAsignar / t.total) * 100}%`, background: '#CE1126' }} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By sector */}
            {bySector.length > 0 && (
              <div className="card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Avance por sector — lo más urgente primero</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {bySector.map(s => (
                    <div key={s.id} onClick={() => openSector(s.id)} title={`Ver reportes de ${s.nombre}`} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{s.nombre}</span>
                        {s.sinAsignar > 0 && <span className="tag tag-red">{s.sinAsignar} sin asignar</span>}
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{s.atendidas}/{s.total}</span>
                      </div>
                      <div style={{ height: 10, borderRadius: 999, background: '#f0f0f0', overflow: 'hidden', display: 'flex' }}>
                        {s.atendidas > 0 && <div style={{ width: `${(s.atendidas / s.total) * 100}%`, background: '#2E9E5B' }} />}
                        {s.enProceso > 0 && <div style={{ width: `${(s.enProceso / s.total) * 100}%`, background: '#E08E00' }} />}
                        {s.sinAsignar > 0 && <div style={{ width: `${(s.sinAsignar / s.total) * 100}%`, background: '#CE1126' }} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal con el listado de la tarjeta seleccionada */}
        {listModal && (
          <Modal title={listModal.title} onClose={() => setListModal(null)} hideCancel>
            {listModal.items.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>No hay registros.</p>
            ) : (
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {listModal.items.map((it, i) => (
                  <div
                    key={i}
                    onClick={() => it.need && setDetailNeed(it.need)}
                    title={it.need ? 'Ver detalle del reporte' : undefined}
                    style={{ padding: '9px 0', borderBottom: '1px solid #f0f0f0', cursor: it.need ? 'pointer' : 'default' }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1f2430' }}>{it.titulo}</div>
                    {it.subtitulo && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{it.subtitulo}</div>}
                  </div>
                ))}
              </div>
            )}
          </Modal>
        )}
        {/* Modal con el detalle completo de un reporte */}
        {detailNeed && (() => {
          const det = detailNeed
          const detSector = sectores.find(s => s.id === det.sector_id)
          const detEstado = det.estado === 'atendida'
            ? { label: '✅ Atendida', cls: 'tag tag-green' }
            : det.responsable ? { label: '🟠 En proceso', cls: 'tag tag-orange' }
            : { label: '🔴 Sin asignar', cls: 'tag tag-red' }
          const detPrioridad = det.prioridad === 'alta' ? '🔴 Alta' : det.prioridad === 'baja' ? '🟢 Baja' : '🟠 Media'
          return (
            <Modal title={`📋 ${needLabel(det.tipo)}`} onClose={() => setDetailNeed(null)} hideCancel confirmLabel="Cerrar" onConfirm={() => setDetailNeed(null)} wide>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className={detEstado.cls} style={{ fontSize: 11 }}>{detEstado.label}</span>
                  <span className="tag tag-gray" style={{ fontSize: 11 }}>Prioridad: {detPrioridad}</span>
                </div>

                {det.imagen && (
                  <a href={det.imagen} target="_blank" rel="noreferrer">
                    <img src={det.imagen} alt="Foto del reporte" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} />
                  </a>
                )}

                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#9AA0AC', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Descripción</div>
                  <p style={{ margin: '2px 0 0', fontSize: 14, color: '#1f2430' }}>{det.descripcion || 'Sin descripción'}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#9AA0AC', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Sector</div>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1f2430' }}>📍 {detSector?.nombre ?? 'Sector'}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#9AA0AC', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Reportado el</div>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1f2430' }}>{det.fecha || '—'}</p>
                  </div>
                </div>

                {det.responsable && (
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#9A6A00', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🙋 En proceso con</div>
                    <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#1f2430' }}>{det.responsable.nombre}{det.responsable.telefono ? ` · 📞 ${det.responsable.telefono}` : ''}</p>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#9AA0AC', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Reportado por</div>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1f2430' }}>{det.reportado_por || '—'}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#9AA0AC', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Teléfono de contacto</div>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1f2430' }}>{det.telefono_reporta ? `📞 ${det.telefono_reporta}` : '—'}</p>
                  </div>
                </div>

                {det.evidencias && det.evidencias.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#9AA0AC', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Evidencias</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {det.evidencias.map((ev, i) => (
                        <a key={i} href={ev.url} target="_blank" rel="noreferrer">
                          <img src={ev.url} alt={ev.descripcion || 'Evidencia'} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Modal>
          )
        })()}
        {/* Modal con el mapa de los reportes asignados al punto de apoyo */}
        {mapPunto && (
          <Modal title={`🗺️ Mapa — ${mapPunto.nombre}`} onClose={() => setMapPunto(null)} hideCancel confirmLabel="Cerrar" onConfirm={() => setMapPunto(null)} wide>
            <PuntoMapa punto={mapPunto} necesidades={necesidades.filter(n => n.ayuda_punto_apoyo_id === mapPunto.id)} eventos={eventos.filter(e => e.punto?.id === mapPunto.id)} sectores={sectores} />
            <p style={{ fontSize: 12, color: '#9AA0AC', margin: '10px 0 0' }}>🔴 Pendiente · 🟠 En proceso (titilan) · ✅ Atendida · 🟦 Evento activo (titila) · ⚪ Evento terminado</p>
          </Modal>
        )}
        {/* Modal con el detalle del punto de apoyo: reportes que atendió + eventos que hizo */}
        {puntoModal && (() => {
          const p = puntoModal
          const nsPunto = necesidades.filter(n => n.ayuda_punto_apoyo_id === p.id)
          const evsPunto = eventos.filter(e => e.punto?.id === p.id)
          return (
            <Modal title={`🏪 ${p.nombre}`} onClose={() => setPuntoModal(null)} hideCancel confirmLabel="Cerrar" onConfirm={() => setPuntoModal(null)} wide>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {p.imagen
                    ? <img src={p.imagen} alt={p.nombre} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e1e4e9', flexShrink: 0 }} />
                    : <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e8eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>🏪</div>}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1f2430' }}>{p.nombre}</div>
                    <div style={{ fontSize: 12.5, color: '#6b7280' }}>{p.tipo || 'Punto de apoyo'}{p.direccion ? ` · ${p.direccion}` : ''}</div>
                    {p.telefono && <div style={{ fontSize: 12.5, color: '#6b7280' }}>📞 {p.telefono}</div>}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#9AA0AC', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>📋 Reportes que atendió ({nsPunto.length})</div>
                  {nsPunto.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Este punto aún no tiene reportes asignados.</p>
                  ) : (
                    <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                      {nsPunto.map(n => {
                        const st = n.estado === 'atendida'
                          ? { label: '✅ Atendida', cls: 'tag tag-green' }
                          : n.responsable ? { label: '🟠 En proceso', cls: 'tag tag-orange' }
                          : { label: '🔴 Sin asignar', cls: 'tag tag-red' }
                        return (
                          <div
                            key={n.id}
                            onClick={() => { setPuntoModal(null); setDetailNeed(n) }}
                            title="Ver detalle del reporte"
                            style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
                          >
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1f2430', flex: 1, minWidth: 140 }}>{needIcon(n.tipo)} {needLabel(n.tipo)}</span>
                            <span className={st.cls} style={{ fontSize: 10.5 }}>{st.label}</span>
                            <span style={{ fontSize: 12, color: '#9AA0AC' }}>{sectorNombre(n.sector_id)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#9AA0AC', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>📅 Eventos que hizo ({evsPunto.length})</div>
                  {evsPunto.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Este punto aún no ha realizado eventos.</p>
                  ) : (
                    <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                      {evsPunto.map(ev => (
                        <div key={ev.id} style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1f2430' }}>{ev.titulo}{ev.activo ? '' : ' 🔒'}</div>
                          {ev.descripcion && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{ev.descripcion.slice(0, 140)}</div>}
                          <div style={{ fontSize: 11.5, color: '#9AA0AC', marginTop: 4 }}>
                            {ev.fecha_inicio ? `🗓️ ${new Date(ev.fecha_inicio).toLocaleDateString('es-CO')}` : ''}
                            {ev.direccion ? ` · 📍 ${ev.direccion}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Modal>
          )
        })()}
      </div>
    </div>
  )
}
