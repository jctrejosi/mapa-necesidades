import { useEffect, useRef, useState } from 'react'
import botImg from '../../assets/bot.png'
import { request } from '../api/client'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

/** Acciones rápidas = las calling functions del bot, como botones seleccionables. */
const QUICK_ACTIONS: { label: string; message: string }[] = [
  { label: '📝 Reportar una necesidad', message: 'Quiero reportar una necesidad' },
  { label: '🤝 Buscar ayuda', message: 'Busco ayuda' },
]

function getSessionId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

interface Props {
  ciudad: string
}

/**
 * Chatbot "Anay" de SolidaridadCO.
 * - Botón flotante con el ícono del bot sobre el mapa.
 * - En escritorio abre un panel flotante; en móvil el chat ocupa TODA la pantalla.
 * - El backend del bot tiene 2 funciones: realizar_reporte y buscar_ayuda.
 */
export default function ChatbotWidget({ ciudad }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<string>(getSessionId())
  const historyRef = useRef<{ role: string; content: string }[]>([])

  // Bienvenida del bot al abrir por primera vez
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: '¡Hola! Soy Anay, tu asistente solidaria 😊 ¿Necesitas reportar algo o buscas quién te ayude?' }])
      historyRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, open])

  const send = async (raw: string) => {
    const text = raw.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    historyRef.current.push({ role: 'user', content: text })
    setLoading(true)
    try {
      const data = await request<{ reply: string; session_id?: string; payload?: unknown }>('/bot/chat', {
        method: 'POST',
        body: {
          message: text,
          session_id: sessionRef.current,
          history: historyRef.current.slice(-12),
          contexto: { ciudad },
        },
      })
      if (data.session_id) sessionRef.current = data.session_id
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      historyRef.current.push({ role: 'assistant', content: data.reply })
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, no pude conectar con el asistente. Inténtalo de nuevo en unos segundos.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const openWidget = () => {
    setShowHint(false)
    setOpen(true)
  }

  return (
    <>
      {/* ── Botón flotante del bot ── */}
      {!open && (
        <button
          onClick={openWidget}
          className="bot-fab"
          aria-label="Abrir chat con Anay"
        >
          <img src={botImg} alt="Anay" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        </button>
      )}

      {/* ── Burbuja de atención ── */}
      {showHint && !open && (
        <div className="bot-hint" onClick={openWidget}>
          ¡Hola! Soy Anay 😊 ¿Necesitas ayuda?
        </div>
      )}

      {/* ── Chat (móvil: pantalla completa; desktop: panel flotante) ── */}
      {open && (
        <div className="bot-overlay" onClick={() => setOpen(false)}>
          <div className="bot-panel" onClick={e => e.stopPropagation()}>
            <div className="bot-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={botImg} alt="Anay" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#003893' }}>Anay</div>
                  <div style={{ fontSize: 11, color: '#2E9E5B' }}>● En línea — SolidaridadCO</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9AA0AC', padding: '0 2px', lineHeight: 1 }} aria-label="Cerrar chat">
                ✕
              </button>
            </div>

            <div className="bot-messages" ref={listRef}>
              {messages.map((m, i) => (
                <div key={i} className={`bot-msg ${m.role === 'user' ? 'bot-msg-user' : 'bot-msg-assistant'}`}>
                  {m.content}
                </div>
              ))}
              {loading && <div className="bot-msg bot-msg-assistant">Escribiendo…</div>}
            </div>

            {/* Acciones rápidas: las calling functions del bot como botones seleccionables */}
            <div className="bot-actions">
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.message}
                  type="button"
                  className="bot-action"
                  disabled={loading}
                  onClick={() => send(a.message)}
                >
                  {a.label}
                </button>
              ))}
            </div>

            <form
              className="bot-input-row"
              onSubmit={e => { e.preventDefault(); send(input) }}
            >
              <input
                className="bot-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Escribe tu mensaje…"
                disabled={loading}
              />
              <button type="submit" className="bot-send" disabled={loading || !input.trim()}>➤</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
