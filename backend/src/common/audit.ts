import type { Db } from '../db/database';
import { auditoria } from '../db/schema';

export type AuditEntry = {
  tabla: string;
  registroId: number;
  accion: 'create' | 'update' | 'delete';
  datosPrevios?: unknown;
  datosNuevos?: unknown;
  autor?: 'usuario' | 'admin' | 'sistema';
  codigo?: string | null;
  visitorId?: string | null;
};

/**
 * Deja el rastro de una modificación en la tabla `auditoria`.
 * Nunca bloquea la operación principal: si falla, solo se registra en consola.
 */
export async function registrarAuditoria(db: Db, e: AuditEntry): Promise<void> {
  try {
    await db.insert(auditoria).values({
      tabla: e.tabla,
      registroId: e.registroId,
      accion: e.accion,
      datosPrevios: e.datosPrevios ?? null,
      datosNuevos: e.datosNuevos ?? null,
      autor: e.autor ?? 'usuario',
      codigo: e.codigo?.slice(0, 20) ?? null,
      visitorId: e.visitorId?.slice(0, 64) ?? null,
    });
  } catch (err) {
    console.error('[auditoria] No se pudo registrar:', e.tabla, e.accion, err);
  }
}
