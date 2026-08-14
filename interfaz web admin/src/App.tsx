import { useStore } from './store'
import AdminPage from './pages/AdminPage'
import { CITIES } from './api'

/**
 * Interfaz de ADMINISTRACIÓN (separada del cliente público).
 * Solo monta el panel administrativo + un selector de ciudad.
 */
export default function App() {
  const store = useStore()

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7' }}>
      <header
        style={{
          background: '#fff', boxShadow: '0 1px 0 #e1e4e9', position: 'sticky', top: 0, zIndex: 200,
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}
      >
        <span style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 800, fontSize: 16, color: '#003893' }}>
          🔐 SolidaridadCO · Administración
        </span>
        <div style={{ flex: 1 }} />

        <select
          className="form-select"
          style={{ width: 'auto', fontSize: 13, padding: '5px 8px', maxWidth: 160 }}
          value={store.ciudad}
          onChange={e => store.setCiudad(e.target.value)}
          aria-label="Ciudad"
        >
          {CITIES.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
        </select>

        <a href="/" style={{ fontSize: 13, color: '#003893', fontWeight: 600, textDecoration: 'none' }}>
          ← Volver al mapa
        </a>
      </header>

      <AdminPage store={store} />
    </div>
  )
}
