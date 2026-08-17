import { Component, type ReactNode } from 'react'
import { useStore } from './store'
import AdminPage from './pages/AdminPage'

/**
 * Interfaz de ADMINISTRACIÓN (separada del cliente público).
 * Solo monta el panel administrativo; el selector de ciudad vive dentro del panel.
 */

/** Muestra el error en pantalla en vez de quedar en blanco si algo falla al renderizar. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[admin] Error de render:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'Nunito, sans-serif', maxWidth: 720, margin: '0 auto' }}>
          <p style={{ fontSize: 26 }}>😵</p>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#CE1126', margin: '0 0 8px' }}>Ocurrió un error al mostrar el panel</h1>
          <pre style={{ background: '#fde8eb', color: '#7f1d1d', padding: 14, borderRadius: 10, fontSize: 12.5, whiteSpace: 'pre-wrap', overflow: 'auto' }}>
            {String(this.state.error?.stack ?? this.state.error?.message ?? this.state.error)}
          </pre>
          <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>Reintentar</button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const store = useStore()

  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh', background: '#f4f5f7', display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            background: '#fff', boxShadow: '0 1px 0 #e1e4e9', zIndex: 200,
            padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}
        >
          <span style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 800, fontSize: 15, color: '#003893' }}>
            🔐 Estamos contigo · Administración
          </span>
          <div style={{ flex: 1 }} />
          <a href="/" style={{ fontSize: 13, color: '#003893', fontWeight: 600, textDecoration: 'none' }}>
            ← Ver sitio público
          </a>
        </header>
        <div className="tricolor-band" />
        <AdminPage store={store} />
      </div>
    </ErrorBoundary>
  )
}
