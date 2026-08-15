import { useEffect, useRef, useState } from 'react'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const BOT_URL = (import.meta.env.VITE_BOT_API_URL as string) || '/bot'

function getSessionId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

interface Props {
  ciudad: string
}

/**
 * Chatbot "Ibanaska" de SolidaridadCO.
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
      setMessages([{ role: 'assistant', content: '¡Hola! Soy Ibanaska, tu asistente solidaria 😊 ¿Necesitas reportar algo o buscas quién te ayude?' }])
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
      const res = await fetch(`${BOT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionRef.current,
          history: historyRef.current.slice(-12),
          contexto: { ciudad },
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
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
          aria-label="Abrir chat con Ibanaska"
        >
          <span className="bot-fab-icon">🤖</span>
        </button>
      )}

      {/* ── Burbuja de atención ── */}
      {showHint && !open && (
        <div className="bot-hint" onClick={openWidget}>
          ¡Hola! Soy Ibanaska 😊 ¿Necesitas ayuda?
        </div>
      )}

      {/* ── Chat (móvil: pantalla completa; desktop: panel flotante) ── */}
      {open && (
        <div className="bot-overlay" onClick={() => setOpen(false)}>
          <div className="bot-panel" onClick={e => e.stopPropagation()}>
            <div className="bot-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>🤖</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#003893' }}>Ibanaska</div>
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
