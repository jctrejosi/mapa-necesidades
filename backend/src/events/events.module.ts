import { Controller, Module, MessageEvent, Sse } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Observable } from 'rxjs';

/**
 * Bus de eventos de la aplicación. Cada creación relevante (sector,
 * necesidad, ofrecimiento, mascota, vivienda, daño, noticia, centro)
 * emite un evento que se transmite a los clientes por SSE.
 */
export interface AppEventPayload {
  type: string;
  mensaje: string;
  ciudad: string | null;
  item?: unknown;
  at: string;
}

export const appEvents = new EventEmitter();

export function emitAppEvent(e: AppEventPayload) {
  appEvents.emit('event', e);
}

@Controller()
export class EventsController {
  /** Stream de eventos en tiempo real: GET /api/events */
  @Sse('events')
  events(): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const handler = (e: AppEventPayload) => subscriber.next({ data: e });
      appEvents.on('event', handler);
      // Heartbeat: mantiene viva la conexión (y atraviesa proxies)
      const hb = setInterval(() => subscriber.next({ data: { type: 'ping' } as AppEventPayload }), 25000);
      return () => {
        appEvents.off('event', handler);
        clearInterval(hb);
      };
    });
  }
}

@Module({ controllers: [EventsController] })
export class EventsModule {}
