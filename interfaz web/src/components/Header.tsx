import { useState } from 'react'
import Modal from './Modal'
import { CITIES } from '../data/mock'

interface Props {
  currentPage: string
  setPage: (p: string) => void
  ciudad: string
  setCiudad: (c: string) => void
}

const NAV = [
  { id: 'mapa',          label: '🗺️ Mapa' },
  { id: 'reportes',      label: '📋 Reportes' },
  { id: 'puntos',        label: '🏪 Puntos de apoyo' },
  { id: 'eventos',       label: '📅 Eventos' },
  { id: 'ofrecimientos', label: '🤝 Ofrecimientos' },
  { id: 'mascotas',      label: '🐾 Mascotas perdidas' },
  { id: 'vivienda',      label: '🏠 Vivienda' },
  { id: 'danos',         label: '🏚️ Daños' },
  { id: 'dashboard',     label: '📊 Impacto' },
  { id: 'noticias',      label: '📰 Noticias' },
  { id: 'ayuda',         label: '❓ Cómo usar' },
  { id: 'contacto',      label: '📞 Contáctanos' },
]

export default function Header({ currentPage, setPage, ciudad, setCiudad }: Props) {
  const [cityOpen, setCityOpen] = useState(false)

  return (
    <header style={{ background: '#fff', boxShadow: '0 1px 0 #e1e4e9', position: 'sticky', top: 0, zIndex: 200, flexShrink: 0 }}>
      <div className="tricolor-band" />

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', flexWrap: 'nowrap', overflow: 'hidden' }}>
        <button
          onClick={() => setPage('mapa')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}
        >
          <span style={{ fontSize: 20, flexShrink: 0 }}>🇨🇴</span>
          <span className="header-logo-name" style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 800, fontSize: 17, color: '#003893', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Estamos contigo
          </span>
        </button>

        <span className="hide-on-mobile" style={{ fontSize: 11, color: '#CE1126', fontWeight: 700, background: '#fde8eb', padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>
          ⚠️ Terremoto 10/08/26
        </span>

        <div style={{ flex: 1, minWidth: 0 }} />

        {/* Selector de ciudad: <select> nativo en escritorio… */}
        <select
          className="form-select header-city-native"
          style={{ width: 'auto', fontSize: 13, padding: '5px 8px', maxWidth: 130, flexShrink: 0 }}
          value={ciudad}
          onChange={e => setCiudad(e.target.value)}
          aria-label="Ciudad"
        >
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* …y botón con modal en móvil (el select nativo se corta en pantallas estrechas) */}
        <button
          className="header-city-btn"
          onClick={() => setCityOpen(true)}
          aria-label="Cambiar ciudad"
        >
          📍 {ciudad}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 3.5 L5 6.5 L8 3.5" />
          </svg>
        </button>
      </div>

      {/* Desktop nav */}
      <nav className="nav-desktop" style={{ display: 'flex', gap: 2, padding: '0 12px 8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {NAV.map(n => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            style={{
              background: currentPage === n.id ? '#003893' : 'none',
              color: currentPage === n.id ? '#fff' : '#374151',
              border: 'none', borderRadius: 6,
              padding: '5px 10px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Nunito', sans-serif", whiteSpace: 'nowrap',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { if (currentPage !== n.id) (e.currentTarget as HTMLButtonElement).style.background = '#f0f4ff' }}
            onMouseLeave={e => { if (currentPage !== n.id) (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
          >
            {n.label}
          </button>
        ))}
      </nav>

      {/* Modal de ciudad (móvil) */}
      {cityOpen && (
        <Modal title="📍 Ciudad" onClose={() => setCityOpen(false)} hideCancel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CITIES.map(c => (
              <button
                key={c}
                onClick={() => { setCiudad(c); setCityOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', textAlign: 'left', padding: '12px 14px', fontSize: 14, fontWeight: 600,
                  fontFamily: "'Nunito', sans-serif", color: c === ciudad ? '#003893' : '#1f2430',
                  background: c === ciudad ? '#e8eeff' : '#fff',
                  border: c === ciudad ? '1.5px solid #003893' : '1.5px solid #e1e4e9',
                  borderRadius: 10, cursor: 'pointer',
                }}
              >
                <span>{c}</span>
                {c === ciudad && <span style={{ fontSize: 15 }}>✅</span>}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </header>
  )
}
