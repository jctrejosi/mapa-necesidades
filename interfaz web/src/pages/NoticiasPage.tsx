import type { Store } from '../store'
import { fmtFechaLarga } from '../store'

interface Props { store: Store }

export default function NoticiasPage({ store }: Props) {
  const { ciudad, noticias } = store
  const matchesCiudad = (c: string | null) => ciudad === 'Colombia' || c === ciudad
  const filtered = noticias.filter(n => n.ciudad === null || matchesCiudad(n.ciudad))

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px', width: '100%' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">📰 Noticias y comunicados</h1>
            <p className="page-subtitle">Comunicados oficiales del equipo coordinador · {ciudad}</p>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p>No hay comunicados publicados todavía.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {filtered.map((n, i) => (
            <article key={n.id} className="card" style={{ overflow: 'hidden' }}>
              {n.imagen && (
                <a href={n.imagen} target="_blank" rel="noreferrer">
                  <img src={n.imagen} alt="Foto" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                </a>
              )}
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {n.ciudad === null && (
                    <span className="tag tag-yellow">📢 TODAS LAS CIUDADES</span>
                  )}
                  {i === 0 && <span className="tag tag-blue">RECIENTE</span>}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2430', margin: '0 0 8px', lineHeight: 1.4 }}>{n.titulo}</h2>
                <p style={{ fontSize: 13, color: '#9AA0AC', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📅 {fmtFechaLarga(n.fecha)}</span>
                  <span style={{ color: '#e1e4e9' }}>·</span>
                  <span>✍️ {n.autor}</span>
                </p>
                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                  {n.contenido}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
