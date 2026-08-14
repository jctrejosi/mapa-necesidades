import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { Store } from '../store'
import { TIPOS_NECESIDAD } from '../data/mock'

interface Props { store: Store }

export default function DashboardPage({ store }: Props) {
  const { ciudad, sectores, necesidades, ofrecimientos } = store
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const ciudadSectores = sectores.filter(s => s.ciudad === ciudad && s.estado === 'activo')
  const ciudadNecesidades = necesidades.filter(n => ciudadSectores.some(s => s.id === n.sector_id))
  const ciudadOfrecimientos = ofrecimientos.filter(o => o.ciudad === ciudad && o.estado === 'disponible' && !o.reservado_por)

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
    { icon: '📍', label: 'Sectores activos', value: ciudadSectores.length, color: '#003893' },
    { icon: '📋', label: 'Necesidades reportadas', value: total, color: '#1f2430' },
    { icon: '🟥', label: 'Sin asignar', value: sinAsignar, color: '#CE1126' },
    { icon: '🟧', label: 'En proceso', value: enProceso, color: '#E08E00' },
    { icon: '✅', label: 'Atendidas', value: atendidas, color: '#2E9E5B' },
    { icon: '🤝', label: 'Ofrecimientos disponibles', value: ciudadOfrecimientos.length, color: '#003893' },
  ]

  // By type
  const byType = TIPOS_NECESIDAD.map(tipo => {
    const ns = ciudadNecesidades.filter(n => n.tipo === tipo)
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
      nombre: s.nombre, total: ns.length,
      sinAsignar: ns.filter(n => n.estado === 'requiere' && !n.responsable).length,
      enProceso: ns.filter(n => n.estado === 'requiere' && n.responsable).length,
      atendidas: ns.filter(n => n.estado === 'atendida').length,
    }
  }).filter(s => s.total > 0).sort((a, b) => b.sinAsignar - a.sinAsignar)

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
      <div className="page-container-wide">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2430', margin: 0 }}>📊 Dashboard — {ciudad}</h1>
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
                <div key={s.label} className="stat-card">
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
                      <Pie data={pieData} cx={95} cy={95} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
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
                <div style={{ flex: 1, minWidth: 200 }}>
                  {[
                    { label: 'Atendidas', value: atendidas, color: '#2E9E5B' },
                    { label: 'En proceso', value: enProceso, color: '#E08E00' },
                    { label: 'Sin asignar', value: sinAsignar, color: '#CE1126' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: '#6b7280', flex: 1 }}>{item.label}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</span>
                      <span style={{ fontSize: 12, color: '#9AA0AC' }}>({total > 0 ? Math.round((item.value / total) * 100) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* By type */}
            {byType.length > 0 && (
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Avance por tipo de necesidad — lo más pendiente primero</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {byType.map(t => (
                    <div key={t.tipo}>
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
                    <div key={s.nombre}>
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
      </div>
    </div>
  )
}
