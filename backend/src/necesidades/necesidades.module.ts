import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DB, Db } from '../db/database';
import { necesidades, sectores } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { emitAppEvent } from '../events/events.module';
import { asDate, nested } from '../common/serialize';
import { checkPin, genPin, str, toDate, toInt, today } from '../common/util';
import { notifyReporteWhatsapp, sendWhatsappText, toWhatsappNumber, whatsappConfigured } from '../common/whatsapp';

type NecesidadBody = {
  pin?: string;
  sector_id?: unknown;
  tipo?: string;
  descripcion?: string;
  imagen?: string;
  fecha?: string;
  cantidad?: string;
  prioridad?: 'alta' | 'media' | 'baja';
  estado?: 'requiere' | 'atendida';
  reportado_por?: string;
  telefono_reporta?: string;
  responsable?: { nombre?: string; telefono?: string; fecha?: string } | null;
  responsable_nombre?: string;
  responsable_telefono?: string;
  fecha_compromiso?: string;
};

@Injectable()
class NecesidadesService {
  constructor(@Inject(DB) private db: Db) {}

  private serialize(n: typeof necesidades.$inferSelect) {
    return {
      id: n.id,
      sector_id: n.sectorId,
      tipo: n.tipo,
      descripcion: n.descripcion ?? '',
      imagen: n.imagen ?? '',
      fecha: asDate(n.fecha),
      cantidad: n.cantidad ?? '',
      prioridad: n.prioridad,
      estado: n.estado,
      responsable: nested(n.responsableNombre, n.responsableTelefono, n.fechaCompromiso),
      reportado_por: n.reportadoPor ?? '',
      telefono_reporta: n.telefonoReporta ?? '',
      pin: n.pin ?? '',
    };
  }

  async list(ciudad: unknown, sectorId?: number) {
    const sectorRows = await this.db
      .select({ id: sectores.id })
      .from(sectores)
      .where(eq(sectores.ciudad, str(ciudad) || 'manizales'));
    if (!sectorRows.length) return [];
    const ids = sectorRows.map((r) => r.id);
    const cond = sectorId
      ? and(inArray(necesidades.sectorId, ids), eq(necesidades.sectorId, sectorId))
      : inArray(necesidades.sectorId, ids);
    const rows = await this.db
      .select()
      .from(necesidades)
      .where(cond)
      .orderBy(desc(necesidades.createdAt));
    return rows.map((r) => this.serialize(r));
  }

  async get(id: number) {
    const rows = await this.db.select().from(necesidades).where(eq(necesidades.id, id)).limit(1);
    return rows.length ? rows[0] : null;
  }

  async create(b: NecesidadBody) {
    const sectorId = toInt(b.sector_id);
    const tipo = str(b.tipo);
    if (!sectorId) throw new BadRequestException({ error: 'Falta sector_id' });
    if (!tipo) throw new BadRequestException({ error: 'Falta el tipo de necesidad' });

    const existentes = await this.db.select({ pin: necesidades.pin }).from(necesidades);
    const pin = genPin(existentes.map((r) => r.pin));
    const [n] = await this.db
      .insert(necesidades)
      .values({
        pin,
        sectorId,
        tipo,
        descripcion: str(b.descripcion) || null,
        imagen: str(b.imagen) || null,
        fecha: toDate(b.fecha) ?? today(),
        cantidad: str(b.cantidad) || null,
        prioridad: b.prioridad === 'alta' || b.prioridad === 'baja' ? b.prioridad : 'media',
        estado: b.estado === 'atendida' ? 'atendida' : 'requiere',
        reportadoPor: str(b.reportado_por) || null,
        telefonoReporta: str(b.telefono_reporta) || null,
      })
      .returning();

    const sectorRow = await this.db
      .select({ ciudad: sectores.ciudad })
      .from(sectores)
      .where(eq(sectores.id, sectorId))
      .limit(1);
    emitAppEvent({
      type: 'necesidad',
      mensaje: `Nueva necesidad: ${tipo}`,
      ciudad: sectorRow[0]?.ciudad ?? 'manizales',
      item: { ...this.serialize(n), pin },
      at: new Date().toISOString(),
    });
    // Confirmación por WhatsApp con el código de edición
    notifyReporteWhatsapp(b.telefono_reporta, 'reporte de necesidad', pin, `Detalle: ${tipo}`);
    return { ...this.serialize(n), pin };
  }

  async updatePublic(id: number, b: NecesidadBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Necesidad no encontrada' });
    if (!checkPin(row.pin, b.pin)) {
      throw new ForbiddenException({ error: 'Código de edición incorrecto' });
    }
    return this.patch(id, b, false);
  }

  async adminUpdate(id: number, b: NecesidadBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Necesidad no encontrada' });
    return this.patch(id, b, true);
  }

  private async patch(id: number, b: NecesidadBody, esAdmin: boolean) {
    const set: Partial<typeof necesidades.$inferInsert> = {};
    if (b.tipo !== undefined) set.tipo = str(b.tipo);
    if (b.descripcion !== undefined) set.descripcion = str(b.descripcion) || null;
    if (b.imagen !== undefined) set.imagen = str(b.imagen) || null;
    if (b.cantidad !== undefined) set.cantidad = str(b.cantidad) || null;
    if (b.fecha !== undefined) set.fecha = toDate(b.fecha) ?? today();
    if (b.prioridad !== undefined) {
      set.prioridad = b.prioridad === 'alta' || b.prioridad === 'baja' ? b.prioridad : 'media';
    }
    if (b.estado !== undefined) {
      set.estado = b.estado === 'atendida' ? 'atendida' : 'requiere';
    }
    if (esAdmin) {
      if (b.reportado_por !== undefined) set.reportadoPor = str(b.reportado_por) || null;
      if (b.telefono_reporta !== undefined) set.telefonoReporta = str(b.telefono_reporta) || null;
      const resp = b.responsable;
      if (resp !== undefined) {
        set.responsableNombre = resp ? str(resp.nombre) || null : null;
        set.responsableTelefono = resp ? str(resp.telefono) || null : null;
        set.fechaCompromiso = resp && resp.fecha ? toDate(resp.fecha) : null;
      }
      if (b.responsable_nombre !== undefined) set.responsableNombre = str(b.responsable_nombre) || null;
      if (b.responsable_telefono !== undefined) set.responsableTelefono = str(b.responsable_telefono) || null;
      if (b.fecha_compromiso !== undefined) set.fechaCompromiso = toDate(b.fecha_compromiso);
    }
    const [n] = await this.db.update(necesidades).set(set).where(eq(necesidades.id, id)).returning();
    return this.serialize(n);
  }

  async setEstado(id: number, estado: unknown) {
    if (estado !== 'requiere' && estado !== 'atendida') {
      throw new BadRequestException({ error: "Estado inválido (requiere o atendida)" });
    }
    const [n] = await this.db
      .update(necesidades)
      .set({ estado })
      .where(eq(necesidades.id, id))
      .returning();
    return this.serialize(n);
  }

  async setResponsable(id: number, nombre: unknown, telefono: unknown) {
    const n = str(nombre);
    if (!n) throw new BadRequestException({ error: 'Falta el nombre del responsable' });
    const [row] = await this.db
      .update(necesidades)
      .set({ responsableNombre: n, responsableTelefono: str(telefono) || null, fechaCompromiso: today() })
      .where(eq(necesidades.id, id))
      .returning();
    return row ? this.serialize(row) : null;
  }

  /**
   * "Yo puedo ayudar": solo pide el teléfono del voluntario y le envía por
   * WhatsApp los datos de quien necesita ayuda (teléfono + ubicación).
   */
  async ayudar(id: number, telefono: unknown) {
    const tel = str(telefono);
    const to = toWhatsappNumber(tel);
    if (!to) throw new BadRequestException({ error: 'Teléfono inválido: usa un número de 10 dígitos' });

    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Necesidad no encontrada' });

    const sectorRows = await this.db
      .select({ nombre: sectores.nombre, ciudad: sectores.ciudad, lat: sectores.lat, lng: sectores.lng })
      .from(sectores)
      .where(eq(sectores.id, row.sectorId))
      .limit(1);
    const sector = sectorRows[0];

    // Registra al voluntario como responsable (sin pedirle su nombre)
    await this.db
      .update(necesidades)
      .set({ responsableNombre: 'Voluntario', responsableTelefono: tel, fechaCompromiso: today() })
      .where(eq(necesidades.id, id));

    const maps = sector ? `https://maps.google.com/?q=${sector.lat},${sector.lng}` : null;
    const cuerpo = [
      '🇨🇴 todos ayudamos — ¡Gracias por ayudar!',
      `Información de quien necesita ayuda (${row.tipo}):`,
      row.telefonoReporta ? `📞 Teléfono: ${row.telefonoReporta}` : null,
      sector ? `📍 Ubicación: ${sector.nombre}` : null,
      maps ? `🗺️ Mapa: ${maps}` : null,
      'Coordina la entrega de la ayuda por WhatsApp o llamada.',
    ]
      .filter(Boolean)
      .join('\n');

    const enviado = whatsappConfigured() ? await sendWhatsappText(to, cuerpo) : false;

    emitAppEvent({
      type: 'necesidad',
      mensaje: `Alguien va a ayudar: ${row.tipo}`,
      ciudad: sector?.ciudad ?? 'manizales',
      at: new Date().toISOString(),
    });

    return { ok: true, whatsapp: enviado };
  }

  async clearResponsable(id: number) {
    const [row] = await this.db
      .update(necesidades)
      .set({ responsableNombre: null, responsableTelefono: null, fechaCompromiso: null })
      .where(eq(necesidades.id, id))
      .returning();
    return this.serialize(row);
  }

  async remove(id: number) {
    await this.db.delete(necesidades).where(eq(necesidades.id, id));
    return { ok: true };
  }
}

@Controller('necesidades')
export class NecesidadesController {
  constructor(private readonly svc: NecesidadesService) {}

  @Get()
  list(@Query('ciudad') ciudad?: string, @Query('sector_id') sectorId?: string) {
    return this.svc.list(ciudad ?? 'manizales', toInt(sectorId) || undefined);
  }

  @Post()
  create(@Body() b: NecesidadBody) {
    return this.svc.create(b);
  }

  /** Edición pública: exige el PIN de la publicación (regla legada si no tiene). */
  @Patch(':id')
  update(@Param('id') id: string, @Body() b: NecesidadBody) {
    return this.svc.updatePublic(toInt(id), b);
  }

  @Patch(':id/admin')
  @UseGuards(AdminGuard)
  adminUpdate(@Param('id') id: string, @Body() b: NecesidadBody) {
    return this.svc.adminUpdate(toInt(id), b);
  }

  @Patch(':id/estado')
  @UseGuards(AdminGuard)
  setEstado(@Param('id') id: string, @Body('estado') estado: unknown) {
    return this.svc.setEstado(toInt(id), estado);
  }

  @Post(':id/responsable')
  setResponsable(@Param('id') id: string, @Body() b: { nombre?: string; telefono?: string }) {
    return this.svc.setResponsable(toInt(id), b?.nombre, b?.telefono);
  }

  /** "Yo puedo ayudar": solo teléfono del voluntario + WhatsApp con los datos de quien necesita. */
  @Post(':id/ayudar')
  ayudar(@Param('id') id: string, @Body() b: { telefono?: string }) {
    return this.svc.ayudar(toInt(id), b?.telefono);
  }

  @Delete(':id/responsable')
  clearResponsable(@Param('id') id: string) {
    return this.svc.clearResponsable(toInt(id));
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.svc.remove(toInt(id));
  }
}

@Module({
  controllers: [NecesidadesController],
  providers: [NecesidadesService],
  exports: [NecesidadesService],
})
export class NecesidadesModule {}
