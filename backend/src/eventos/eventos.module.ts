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
import { desc, eq } from 'drizzle-orm';
import { DB, Db } from '../db/database';
import { eventos, puntosApoyo } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { emitAppEvent } from '../events/events.module';
import { asNum } from '../common/serialize';
import { checkEditCode, genPin, isAdminEdit, str, toInt, toNum } from '../common/util';
import { registrarAuditoria } from '../common/audit';

type EventoBody = {
  pin?: string;
  punto_pin?: string;
  punto_apoyo_id?: unknown;
  titulo?: string;
  descripcion?: string;
  lat?: unknown;
  lng?: unknown;
  direccion?: string;
  activo?: unknown;
  fecha_inicio?: string;
  fecha_fin?: string;
  visitor_id?: string;
};

/** Acepta timestamps ISO; null si la entrada no es una fecha válida. */
function toTs(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function tsIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

/** true/false tolerante (booleano o string), por defecto `def`. */
function toBool(v: unknown, def: boolean): boolean {
  if (v === undefined || v === null) return def;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  return s !== 'false' && s !== '0' && s !== 'no';
}

@Injectable()
class EventosService {
  constructor(@Inject(DB) private db: Db) {}

  /** ¿Está el evento visible en el mapa ahora? activo + dentro del período. */
  private vigente(e: typeof eventos.$inferSelect): boolean {
    if (!e.activo) return false;
    const now = Date.now();
    if (e.fechaInicio.getTime() > now) return false;
    if (e.fechaFin && e.fechaFin.getTime() < now) return false;
    return true;
  }

  private serialize(e: typeof eventos.$inferSelect, p: typeof puntosApoyo.$inferSelect) {
    return {
      id: e.id,
      ciudad: p.ciudad,
      titulo: e.titulo,
      descripcion: e.descripcion ?? '',
      lat: asNum(e.lat),
      lng: asNum(e.lng),
      direccion: e.direccion ?? '',
      activo: e.activo,
      vigente: this.vigente(e),
      fecha_inicio: tsIso(e.fechaInicio),
      fecha_fin: tsIso(e.fechaFin),
      punto: {
        id: p.id,
        nombre: p.nombre,
        tipo: p.tipo,
        color: p.color,
        telefono: p.telefono ?? '',
        imagen: p.imagen ?? '',
      },
      // El PIN no viaja en los listados: se entrega solo al crear.
    };
  }

  async list(ciudad: unknown) {
    const rows = await this.db
      .select({ e: eventos, p: puntosApoyo })
      .from(eventos)
      .innerJoin(puntosApoyo, eq(eventos.puntoApoyoId, puntosApoyo.id))
      .where(eq(puntosApoyo.ciudad, str(ciudad) || 'manizales'))
      .orderBy(desc(eventos.createdAt));
    return rows.map(({ e, p }) => this.serialize(e, p));
  }

  async get(id: number) {
    const rows = await this.db.select().from(eventos).where(eq(eventos.id, id)).limit(1);
    return rows.length ? rows[0] : null;
  }

  private async puntoOf(e: typeof eventos.$inferSelect) {
    const rows = await this.db.select().from(puntosApoyo).where(eq(puntosApoyo.id, e.puntoApoyoId)).limit(1);
    return rows[0] ?? null;
  }

  async create(b: EventoBody) {
    const puntoPin = str(b.punto_pin);
    let punto: typeof puntosApoyo.$inferSelect | null = null;
    if (puntoPin) {
      const rows = await this.db
        .select()
        .from(puntosApoyo)
        .where(eq(puntosApoyo.pin, puntoPin))
        .limit(1);
      punto = rows[0] ?? null;
    }
    // Alternativa interna: id directo del punto (sin exponer el PIN).
    const puntoId = toInt(b.punto_apoyo_id);
    if (!punto && puntoId) {
      const rows = await this.db.select().from(puntosApoyo).where(eq(puntosApoyo.id, puntoId)).limit(1);
      punto = rows[0] ?? null;
    }
    if (!punto) {
      throw new BadRequestException({
        error: 'El PIN del punto de apoyo es incorrecto. Ingresa el código de 4 dígitos que se dio al publicar el punto de apoyo.',
      });
    }

    const titulo = str(b.titulo);
    const lat = toNum(b.lat);
    const lng = toNum(b.lng);
    if (!titulo) throw new BadRequestException({ error: 'Falta el título del evento' });
    if (lat === null || lng === null) throw new BadRequestException({ error: 'Faltan las coordenadas (ubica el evento en el mapa)' });

    const fechaInicio = toTs(b.fecha_inicio) ?? new Date();
    const fechaFin = toTs(b.fecha_fin);

    const existentes = await this.db.select({ pin: eventos.pin }).from(eventos);
    const pin = genPin(existentes.map((r) => r.pin));

    const [e] = await this.db
      .insert(eventos)
      .values({
        pin,
        puntoApoyoId: punto.id,
        titulo,
        descripcion: str(b.descripcion) || null,
        lat: String(lat),
        lng: String(lng),
        direccion: str(b.direccion) || null,
        activo: toBool(b.activo, true),
        fechaInicio,
        fechaFin,
        visitorId: str(b.visitor_id)?.slice(0, 64) || null,
      })
      .returning();

    const item = this.serialize(e, punto);
    emitAppEvent({
      type: 'evento',
      mensaje: `Nuevo evento: ${titulo} (${punto.nombre})`,
      ciudad: punto.ciudad,
      item,
      at: new Date().toISOString(),
    });
    await registrarAuditoria(this.db, {
      tabla: 'eventos', registroId: e.id, accion: 'create',
      datosNuevos: item, autor: 'usuario', codigo: pin,
      visitorId: str(b.visitor_id),
    });
    return { ...item, pin };
  }

  async updatePublic(id: number, b: EventoBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Evento no encontrado' });
    const esAdminEdit = isAdminEdit(b.pin);
    if (!checkEditCode(row.pin, b.pin)) {
      throw new ForbiddenException({ error: 'Código de edición incorrecto' });
    }
    const punto = await this.puntoOf(row);
    const previo = this.serialize(row, punto!);
    const nuevo = await this.patch(id, b);
    await registrarAuditoria(this.db, {
      tabla: 'eventos', registroId: id, accion: 'update',
      datosPrevios: previo, datosNuevos: nuevo, autor: esAdminEdit ? 'admin' : 'usuario',
      codigo: esAdminEdit ? 'ADMIN_EDIT' : str(b.pin), visitorId: str(b.visitor_id),
    });
    return nuevo;
  }

  async adminUpdate(id: number, b: EventoBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Evento no encontrado' });
    const punto = await this.puntoOf(row);
    const previo = this.serialize(row, punto!);
    const nuevo = await this.patch(id, b);
    await registrarAuditoria(this.db, {
      tabla: 'eventos', registroId: id, accion: 'update',
      datosPrevios: previo, datosNuevos: nuevo, autor: 'admin', codigo: 'llave-admin',
    });
    return nuevo;
  }

  private async patch(id: number, b: EventoBody) {
    const set: Partial<typeof eventos.$inferInsert> = {};
    if (b.titulo !== undefined) {
      const t = str(b.titulo);
      if (!t) throw new BadRequestException({ error: 'El título no puede quedar vacío' });
      set.titulo = t;
    }
    if (b.descripcion !== undefined) set.descripcion = str(b.descripcion) || null;
    if (b.direccion !== undefined) set.direccion = str(b.direccion) || null;
    if (b.activo !== undefined) set.activo = toBool(b.activo, true);
    if (b.fecha_inicio !== undefined) {
      const d = toTs(b.fecha_inicio);
      if (d) set.fechaInicio = d;
    }
    if (b.fecha_fin !== undefined) set.fechaFin = toTs(b.fecha_fin);
    if (b.lat !== undefined) {
      const lat = toNum(b.lat);
      if (lat === null) throw new BadRequestException({ error: 'Latitud inválida' });
      set.lat = String(lat);
    }
    if (b.lng !== undefined) {
      const lng = toNum(b.lng);
      if (lng === null) throw new BadRequestException({ error: 'Longitud inválida' });
      set.lng = String(lng);
    }
    const [e] = await this.db.update(eventos).set(set).where(eq(eventos.id, id)).returning();
    const punto = await this.puntoOf(e);
    return this.serialize(e, punto!);
  }

  async remove(id: number) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Evento no encontrado' });
    const punto = await this.puntoOf(row);
    await this.db.delete(eventos).where(eq(eventos.id, id));
    await registrarAuditoria(this.db, {
      tabla: 'eventos', registroId: id, accion: 'delete',
      datosPrevios: this.serialize(row, punto!), autor: 'admin', codigo: 'llave-admin',
    });
    return { ok: true };
  }

  /** Borrado público con el PIN que se le dio al usuario al publicar. */
  async removePublic(id: number, pin: unknown) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Evento no encontrado' });
    const esAdminEdit = isAdminEdit(pin);
    if (!checkEditCode(row.pin, pin)) {
      throw new ForbiddenException({ error: 'Código de edición incorrecto' });
    }
    const punto = await this.puntoOf(row);
    await this.db.delete(eventos).where(eq(eventos.id, id));
    await registrarAuditoria(this.db, {
      tabla: 'eventos', registroId: id, accion: 'delete',
      datosPrevios: this.serialize(row, punto!), autor: esAdminEdit ? 'admin' : 'usuario',
      codigo: esAdminEdit ? 'ADMIN_EDIT' : str(pin),
    });
    return { ok: true };
  }
}

@Controller('eventos')
export class EventosController {
  constructor(private readonly svc: EventosService) {}

  @Get()
  list(@Query('ciudad') ciudad?: string) {
    return this.svc.list(ciudad ?? 'manizales');
  }

  /** Crear un evento es público, pero exige el PIN del punto de apoyo asociado. */
  @Post()
  create(@Body() b: EventoBody) {
    return this.svc.create(b);
  }

  /** Edición pública: exige el PIN del evento (o la llave ADMIN_EDIT). */
  @Patch(':id')
  update(@Param('id') id: string, @Body() b: EventoBody) {
    return this.svc.updatePublic(toInt(id), b);
  }

  /** Edición con la llave general de Admin. */
  @Patch(':id/admin')
  @UseGuards(AdminGuard)
  adminUpdate(@Param('id') id: string, @Body() b: EventoBody) {
    return this.svc.adminUpdate(toInt(id), b);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.svc.remove(toInt(id));
  }

  /** Borrado público con el PIN del usuario. */
  @Post(':id/eliminar')
  removePublic(@Param('id') id: string, @Body() b: { pin?: string }) {
    return this.svc.removePublic(toInt(id), b?.pin);
  }
}

@Module({
  controllers: [EventosController],
  providers: [EventosService],
})
export class EventosModule {}
