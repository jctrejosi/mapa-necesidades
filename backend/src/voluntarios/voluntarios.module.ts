import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB, Db } from '../db/database';
import {
  eventos,
  mascotasPerdidas,
  necesidades,
  ofrecimientos,
  puntosApoyo,
  reportesDanos,
  viviendas,
  voluntarios,
} from '../db/schema';
import { emitAppEvent } from '../events/events.module';
import { registrarAuditoria } from '../common/audit';
import { str, toInt, today } from '../common/util';
import { sendWhatsappText, toWhatsappNumber, whatsappConfigured } from '../common/whatsapp';

/**
 * Tablas de reportes donde se puede registrar "Yo te ayudo".
 * La clave es el nombre de la tabla; el servicio verifica que el registro
 * exista y actualiza su estado según la entidad.
 */
const TABLAS = [
  'necesidades',
  'ofrecimientos',
  'mascotas_perdidas',
  'viviendas',
  'reportes_danos',
  'eventos',
  'puntos_apoyo',
] as const;

type Tabla = (typeof TABLAS)[number];

type VoluntarioBody = {
  tabla?: string;
  registro_id?: unknown;
  nombre?: string;
  telefono?: string;
  /** 'persona' (por defecto) o 'punto' (punto de apoyo). */
  tipo?: string;
  /** PIN del punto de apoyo cuando tipo === 'punto'. */
  punto_pin?: string;
  mensaje?: string;
  visitor_id?: string;
};

@Injectable()
class VoluntariosService {
  constructor(@Inject(DB) private db: Db) {}

  private serialize(v: typeof voluntarios.$inferSelect) {
    return {
      id: v.id,
      tabla: v.tabla,
      registro_id: v.registroId,
      nombre: v.nombre,
      telefono: v.telefono,
      mensaje: v.mensaje ?? '',
      fecha: v.createdAt.toISOString(),
    };
  }

  async list(tabla: unknown, registroId: unknown) {
    const t = str(tabla) as Tabla;
    const id = toInt(registroId);
    if (!TABLAS.includes(t) || !id) return [];
    const rows = await this.db
      .select()
      .from(voluntarios)
      .where(and(eq(voluntarios.tabla, t), eq(voluntarios.registroId, id)))
      .orderBy(desc(voluntarios.createdAt));
    return rows.map((r) => this.serialize(r));
  }

  /** Verifica que el reporte exista y devuelve sus datos para el aviso. */
  private async targetInfo(tabla: Tabla, id: number) {
    switch (tabla) {
      case 'necesidades': {
        const rows = await this.db.select().from(necesidades).where(eq(necesidades.id, id)).limit(1);
        return rows[0] ? { ok: true as const, ciudad: null as string | null, telefono: rows[0].telefonoReporta, titulo: rows[0].tipo } : { ok: false as const };
      }
      case 'ofrecimientos': {
        const rows = await this.db.select().from(ofrecimientos).where(eq(ofrecimientos.id, id)).limit(1);
        return rows[0] ? { ok: true as const, ciudad: rows[0].ciudad, telefono: rows[0].telefonoOfrece, titulo: rows[0].tipo } : { ok: false as const };
      }
      case 'mascotas_perdidas': {
        const rows = await this.db.select().from(mascotasPerdidas).where(eq(mascotasPerdidas.id, id)).limit(1);
        return rows[0] ? { ok: true as const, ciudad: rows[0].ciudad, telefono: rows[0].telefonoReporta, titulo: rows[0].tipoAnimal } : { ok: false as const };
      }
      case 'viviendas': {
        const rows = await this.db.select().from(viviendas).where(eq(viviendas.id, id)).limit(1);
        return rows[0] ? { ok: true as const, ciudad: rows[0].ciudad, telefono: rows[0].telefonoOfrece, titulo: 'vivienda' } : { ok: false as const };
      }
      case 'reportes_danos': {
        const rows = await this.db.select().from(reportesDanos).where(eq(reportesDanos.id, id)).limit(1);
        return rows[0] ? { ok: true as const, ciudad: rows[0].ciudad, telefono: rows[0].telefonoReporta, titulo: rows[0].tipoInmueble } : { ok: false as const };
      }
      case 'eventos': {
        const rows = await this.db
          .select({ e: eventos, p: puntosApoyo })
          .from(eventos)
          .innerJoin(puntosApoyo, eq(eventos.puntoApoyoId, puntosApoyo.id))
          .where(eq(eventos.id, id))
          .limit(1);
        return rows[0] ? { ok: true as const, ciudad: rows[0].p.ciudad, telefono: rows[0].p.telefono, titulo: rows[0].e.titulo } : { ok: false as const };
      }
      case 'puntos_apoyo': {
        const rows = await this.db.select().from(puntosApoyo).where(eq(puntosApoyo.id, id)).limit(1);
        return rows[0] ? { ok: true as const, ciudad: rows[0].ciudad, telefono: rows[0].telefono, titulo: rows[0].nombre } : { ok: false as const };
      }
      default:
        return { ok: false as const };
    }
  }

  /** Actualiza el estado del reporte según la entidad (en proceso / reservado / avistado...). */
  private async applyEstado(tabla: Tabla, id: number, nombre: string, telefono: string, puntoId?: number) {
    const hoy = today();
    switch (tabla) {
      case 'necesidades':
        await this.db
          .update(necesidades)
          .set({ responsableNombre: nombre, responsableTelefono: telefono, fechaCompromiso: hoy, ayudaPuntoApoyoId: puntoId ?? null })
          .where(eq(necesidades.id, id));
        break;
      case 'ofrecimientos':
        await this.db.update(ofrecimientos).set({ reservadoPorNombre: nombre, reservadoPorTelefono: telefono, fechaReserva: hoy }).where(eq(ofrecimientos.id, id));
        break;
      case 'mascotas_perdidas':
        await this.db.update(mascotasPerdidas).set({ avistadoPorNombre: nombre, avistadoPorTelefono: telefono, fechaAvistamiento: hoy }).where(eq(mascotasPerdidas.id, id));
        break;
      case 'viviendas':
        await this.db.update(viviendas).set({ interesadoNombre: nombre, interesadoTelefono: telefono, fechaInteres: hoy }).where(eq(viviendas.id, id));
        break;
      case 'reportes_danos':
        await this.db.update(reportesDanos).set({ estado: 'visita_programada' }).where(eq(reportesDanos.id, id));
        break;
      // eventos y puntos_apoyo no tienen estado editable; el voluntario queda registrado igual.
      default:
        break;
    }
  }

  async create(b: VoluntarioBody) {
    const tabla = str(b.tabla) as Tabla;
    const registroId = toInt(b.registro_id);
    const tipo = str(b.tipo) === 'punto' ? 'punto' : 'persona';
    const puntoPin = str(b.punto_pin);
    if (!TABLAS.includes(tabla)) throw new BadRequestException({ error: 'Tipo de reporte inválido' });
    if (!registroId) throw new BadRequestException({ error: 'Falta el id del reporte' });
    if (!puntoPin && !str(b.nombre)) throw new BadRequestException({ error: 'Tu nombre es obligatorio' });
    if (!puntoPin && !str(b.telefono)) throw new BadRequestException({ error: 'Tu teléfono es obligatorio' });

    const info = await this.targetInfo(tabla, registroId);
    if (!info.ok) throw new NotFoundException({ error: 'El reporte ya no existe' });

    // Si es un punto de apoyo, se valida su PIN y se usa su nombre/teléfono.
    let nombre = str(b.nombre) ?? '';
    let telefono = str(b.telefono) ?? '';
    let puntoId: number | undefined;
    let autor: 'usuario' | 'punto' = 'usuario';
    if (tipo === 'punto') {
      if (!puntoPin) throw new BadRequestException({ error: 'Ingresa el PIN del punto de apoyo' });
      const ptos = await this.db.select().from(puntosApoyo).where(eq(puntosApoyo.pin, puntoPin)).limit(1);
      const punto = ptos[0];
      if (!punto) throw new BadRequestException({ error: 'El PIN del punto de apoyo es incorrecto' });
      nombre = punto.nombre;
      telefono = punto.telefono ?? '';
      puntoId = punto.id;
      autor = 'punto';
    }

    const [v] = await this.db
      .insert(voluntarios)
      .values({
        tabla,
        registroId,
        nombre,
        telefono,
        mensaje: str(b.mensaje) || null,
        visitorId: str(b.visitor_id)?.slice(0, 64) || null,
      })
      .returning();

    // Cambia el estado del reporte (queda "en proceso"/reservado/avistado/visita)
    await this.applyEstado(tabla, registroId, nombre, telefono, puntoId);

    emitAppEvent({
      type: 'ayuda',
      mensaje: `🤝 ${nombre} va a ayudar con: ${info.titulo}`,
      ciudad: info.ciudad,
      item: this.serialize(v),
      at: new Date().toISOString(),
    });

    await registrarAuditoria(this.db, {
      tabla: 'voluntarios', registroId: v.id, accion: 'create',
      datosNuevos: this.serialize(v), autor,
      codigo: tipo === 'punto' ? puntoPin : undefined,
      visitorId: str(b.visitor_id),
    });

    // Aviso por WhatsApp a quien publicó el reporte (si el teléfono es válido).
    let whatsapp = false;
    const to = toWhatsappNumber(info.telefono);
    if (to && whatsappConfigured()) {
      whatsapp = true;
      const cuerpo = [
        '🤝 Estamos contigo — ¡Alguien quiere ayudarte!',
        `🙋 ${nombre} · 📞 ${telefono}`,
        'Coordina la ayuda por WhatsApp o llamada.',
      ].join('\n');
      sendWhatsappText(to, cuerpo).catch(() => { /* silencioso */ });
    }

    return { ok: true, id: v.id, whatsapp };
  }
}

@Controller('voluntarios')
export class VoluntariosController {
  constructor(private readonly svc: VoluntariosService) {}

  @Get()
  list(@Query('tabla') tabla?: string, @Query('registro_id') registroId?: string) {
    return this.svc.list(tabla, registroId);
  }

  @Post()
  create(@Body() b: VoluntarioBody) {
    return this.svc.create(b);
  }
}

@Module({
  controllers: [VoluntariosController],
  providers: [VoluntariosService],
})
export class VoluntariosModule {}
