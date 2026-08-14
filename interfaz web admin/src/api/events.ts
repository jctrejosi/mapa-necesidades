import { API_URL } from './client'

export interface AppEvent {
  type: string
  mensaje: string
  ciudad: string | null
  item?: unknown
  at: string
}

/**
 * Se suscribe al stream SSE del backend (GET /api/events) y llama
 * `onEvent` por cada evento de negocio (ignora los heartbeats).
 * Devuelve la función para cancelar la suscripción.
 */
export function subscribeEvents(onEvent: (e: AppEvent) => void): () => void {
  const es = new EventSource(`${API_URL}/events`)
  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data)
      if (data && typeof data === 'object' && data.type && data.type !== 'ping') {
        onEvent(data as AppEvent)
      }
    } catch {
      /* mensaje no JSON: se ignora */
    }
  }
  return () => es.close()
}
