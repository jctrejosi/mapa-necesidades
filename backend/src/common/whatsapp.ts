/**
 * Notificaciones por WhatsApp (WhatsApp Business Cloud API de Meta).
 *
 * Configuración por variables de entorno:
 *   WHATSAPP_TOKEN            -> token de acceso de la app de Meta
 *   WHATSAPP_PHONE_NUMBER_ID  -> id del número de WhatsApp Business
 *   FRONTEND_URL              -> URL pública del frontend (para incluir en el mensaje)
 *
 * Sin credenciales los envíos se omiten (el resto de la app sigue igual);
 * cuando están configuradas, cada reporte envía su confirmación con el
 * código PIN/radicado al teléfono del usuario.
 */

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Normaliza teléfonos colombianos a formato internacional (57XXXXXXXXXX). */
export function toWhatsappNumber(phone: unknown): string | null {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('57') && digits.length === 12) return digits;
  if (digits.length === 10) return `57${digits}`;
  return null; // solo números colombianos de 10 dígitos (o ya internacionalizados)
}

/** Envía un mensaje de texto simple por WhatsApp. Devuelve true si se aceptó. */
export async function sendWhatsappText(to: string, body: string): Promise<boolean> {
  if (!whatsappConfigured()) return false;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Envía la confirmación de un reporte con su código de edición
 * (fire-and-forget). Si el teléfono no es válido o no hay credenciales,
 * no hace nada.
 */
export function notifyReporteWhatsapp(
  telefono: unknown,
  tipo: string,
  codigo: string,
  detalle?: string,
): void {
  const to = toWhatsappNumber(telefono);
  if (!to) return;
  const web = process.env.FRONTEND_URL ?? 'http://localhost:8080';
  const body = [
    `🇨🇴 todos ayudamos — tu ${tipo} quedó registrado ✔`,
    `Código: ${codigo}`,
    `Usa ese código en la página para editar o confirmar tu reporte: ${web}`,
    detalle,
  ]
    .filter(Boolean)
    .join('\n');
  sendWhatsappText(to, body)
    .then((ok) => {
      if (!ok && whatsappConfigured()) {
        console.warn(`⚠ WhatsApp: no se pudo enviar la confirmación a ${to}`);
      }
    })
    .catch(() => {
      /* silencioso: no bloquear el flujo del reporte */
    });
}
