import { useEffect, useState } from 'react'
import { useStore } from './store'
import Header from './components/Header'
import Footer from './components/Footer'
import NotificationToasts from './components/NotificationToasts'
import MapPage from './pages/MapPage'
import OfrecimientosPage from './pages/OfrecimientosPage'
import MascotasPage from './pages/MascotasPage'
import NoticiasPage from './pages/NoticiasPage'
import ViviendaPage from './pages/ViviendaPage'
import DanosPage from './pages/DanosPage'
import DashboardPage from './pages/DashboardPage'
import AyudaPage from './pages/AyudaPage'

const MAP_PAGES = new Set(['mapa'])

// Ruta por tab. `dashboard` usa `/estadisticas`; `/dashboard` queda como alias.
const PAGE_ROUTES: Record<string, string> = {
  mapa: '/mapa',
  ofrecimientos: '/ofrecimientos',
  mascotas: '/mascotas',
  noticias: '/noticias',
  vivienda: '/vivienda',
  danos: '/danos',
  dashboard: '/estadisticas',
  ayuda: '/ayuda',
}
const ROUTE_TO_PAGE: Record<string, string> = Object.fromEntries(
  Object.entries(PAGE_ROUTES).map(([page, route]) => [route, page]),
)

function pathToPage(pathname: string): string {
  if (ROUTE_TO_PAGE[pathname]) return ROUTE_TO_PAGE[pathname]
  if (pathname === '/dashboard') return 'dashboard' // alias del nombre anterior
  return 'mapa'
}

// Bottom tabs shown on mobile
const BOTTOM_TABS = [
  { id: 'mapa',          icon: '🗺️', label: 'Mapa' },
  { id: 'ofrecimientos', icon: '🤝', label: 'Ofrece' },
  { id: 'mascotas',      icon: '🐾', label: 'Mascotas' },
  { id: 'noticias',      icon: '📰', label: 'Noticias' },
  { id: '__more__',      icon: '☰',  label: 'Más' },
]

const ALL_NAV = [
  { id: 'mapa',          icon: '🗺️', label: 'Mapa' },
  { id: 'reportes',      icon: '📋', label: 'Reportes' },
  { id: 'ofrecimientos', icon: '🤝', label: 'Ofrecimientos' },
  { id: 'mascotas',      icon: '🐾', label: 'Mascotas' },
  { id: 'noticias',      icon: '📰', label: 'Noticias' },
  { id: 'vivienda',      icon: '🏠', label: 'Vivienda' },
  { id: 'danos',         icon: '🏚️', label: 'Daños (Manizales)' },
  { id: 'dashboard',     icon: '📊', label: 'Estadísticas' },
  { id: 'ayuda',         icon: '❓', label: 'Cómo usar' },
]

export default function App() {
  const [page, setPage] = useState(() => pathToPage(window.location.pathname))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [reportesSignal, setReportesSignal] = useState(0)
  const store = useStore()
  const isMapPage = MAP_PAGES.has(page)

  const navigate = (id: string) => {
    if (id === '__more__') { setDrawerOpen(true); return }
    if (id === 'reportes') {
      // Va al mapa y abre el modal de reportes
      setPage('mapa')
      setDrawerOpen(false)
      window.scrollTo(0, 0)
      setReportesSignal(s => s + 1)
      if (window.location.pathname !== '/mapa') window.history.pushState(null, '', '/mapa')
      return
    }
    setPage(id)
    setDrawerOpen(false)
    window.scrollTo(0, 0)
    const route = PAGE_ROUTES[id] ?? '/mapa'
    if (window.location.pathname !== route) {
      window.history.pushState(null, '', route)
    }
  }

  // Navegar con los botones atrás/adelante del navegador
  useEffect(() => {
    const onPop = () => setPage(pathToPage(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100svh', background: '#f4f5f7' }}>
      <Header currentPage={page} setPage={navigate} ciudad={store.ciudad} setCiudad={store.setCiudad} />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: isMapPage ? 'hidden' : 'auto',
      }}>
        {page === 'mapa'          && <MapPage store={store} setPage={navigate} reportesSignal={reportesSignal} />}
        {page === 'ofrecimientos' && <OfrecimientosPage store={store} />}
        {page === 'mascotas'      && <MascotasPage store={store} />}
        {page === 'noticias'      && <NoticiasPage store={store} />}
        {page === 'vivienda'      && <ViviendaPage store={store} />}
        {page === 'danos'         && <DanosPage store={store} />}
        {page === 'dashboard'     && <DashboardPage store={store} />}
        {page === 'ayuda'         && <AyudaPage setPage={navigate} />}
      </main>

      {/* Footer solo en la página de ayuda */}
      {page === 'ayuda' && <Footer />}

      {/* ── Mobile bottom tab bar ── */}
      <nav className="bottom-tab-bar">
        {BOTTOM_TABS.map(tab => {
          const isActive = tab.id !== '__more__' && page === tab.id
          const isMore = tab.id === '__more__'
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={`bottom-tab${isActive ? ' active' : ''}${isMore && drawerOpen ? ' active' : ''}`}
            >
              <span className="bottom-tab-icon">{tab.icon}</span>
              <span className="bottom-tab-label">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* ── Mobile nav drawer (from "Más" tab) ── */}
      {drawerOpen && (
        <div className="nav-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <nav className="nav-drawer" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 20px 10px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 800, fontSize: 16, color: '#003893' }}>🇨🇴 SolidaridadCO</div>
                <div style={{ fontSize: 11, color: '#9AA0AC', marginTop: 2 }}>Ciudad: {store.ciudad}</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }} aria-label="Cerrar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>
            <div style={{ padding: '8px 0 20px' }}>
              {ALL_NAV.map(n => (
                <button
                  key={n.id}
                  onClick={() => navigate(n.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', textAlign: 'left',
                    background: page === n.id ? '#e8eeff' : 'none',
                    color: page === n.id ? '#003893' : '#1f2430',
                    border: 'none',
                    borderLeft: page === n.id ? '3px solid #003893' : '3px solid transparent',
                    padding: '13px 20px',
                    fontSize: 15, fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{n.icon}</span>
                  {n.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
      {/* Popups de notificaciones en tiempo real */}
      {store.toasts.length > 0 && (
        <NotificationToasts toasts={store.toasts} onDismiss={store.dismissToast} />
      )}
    </div>
  )
}
