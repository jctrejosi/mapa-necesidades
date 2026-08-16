import { useStore } from './store'
import AdminPage from './pages/AdminPage'

/**
 * Interfaz de ADMINISTRACIÓN (separada del cliente público).
 * Solo monta el panel administrativo; el selector de ciudad vive dentro del panel.
 */
export default function App() {
  const store = useStore()

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: '#fff', boxShadow: '0 1px 0 #e1e4e9', zIndex: 200,
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}
      >
        <span style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 800, fontSize: 15, color: '#003893' }}>
          🔐 todos ayudamos · Administración
        </span>
        <div style={{ flex: 1 }} />
        <a href="/" style={{ fontSize: 13, color: '#003893', fontWeight: 600, textDecoration: 'none' }}>
          ← Ver sitio público
        </a>
      </header>
      <div className="tricolor-band" />
      <AdminPage store={store} />
    </div>
  )
}
