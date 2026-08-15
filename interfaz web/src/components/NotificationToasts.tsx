import { useEffect } from 'react'
import type { Notificacion } from '../store'

const ICONS: Record<string, string> = {
  sector: '📍',
  necesidad: '🆘',
  ofrecimiento: '🤝',
  mascota: '🐾',
  noticia: '📰',
  vivienda: '🏠',
  dano: '🏚️',
  centro: '📦',
}

interface Props {
  toasts: Notificacion[]
  onDismiss: (id: string) => void
}

/**
 * Popups flotantes (modales) de notificaciones en tiempo real.
 * Aparecen abajo a la derecha y se cierran solos a los 8 s.
 */
export default function NotificationToasts({ toasts, onDismiss }: Props) {
  return (
    <div className="notif-toasts" style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 340, width: 'calc(100% - 32px)', pointerEvents: 'none',
    }}>
      {toasts.map(t => <Toast key={t.id} t={t} onDismiss={onDismiss} />)}
    </div>
  )
}

function Toast({ t, onDismiss }: { t: Notificacion; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), 8000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id])

  return (
    <div className="card" style={{
      padding: '12px 14px', borderLeft: '4px solid #003893',
      boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
      display: 'flex', gap: 10, alignItems: 'flex-start',
      pointerEvents: 'auto', animation: 'toast-in 0.25s ease',
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{ICONS[t.type] ?? '🔔'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1f2430' }}>{t.mensaje}</p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9AA0AC' }}>
          {t.ciudad ?? 'Todas las ciudades'} · {new Date(t.at).toLocaleTimeString()}
        </p>
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9AA0AC', fontSize: 14, padding: 0, lineHeight: 1 }}
        aria-label="Cerrar notificación"
      >✕</button>
    </div>
  )
}
