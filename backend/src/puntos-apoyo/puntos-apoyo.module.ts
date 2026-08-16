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
import { puntosApoyo } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { emitAppEvent } from '../events/events.module';
import { asNum } from '../common/serialize';
import { checkEditCode, genPin, isAdminEdit, str, toInt, toNum } from '../common/util';
import { registrarAuditoria } from '../common/audit';

type PuntoApoyoBody = {
  pin?: string;
  ciudad?: string;
  nombre?: string;
  tipo?: string;
  direccion?: string;
  telefono?: string;
  imagen?: string;
  lat?: unknown;
  lng?: unknown;
  visitor_id?: string;
};

@Injectable()
class PuntosApoyoService {
  constructor(@Inject(DB) private db: Db) {}

  private serialize(p: typeof puntosApoyo.$inferSelect) {
    return {
      id: p.id,
      ciudad: p.ciudad,
      nombre: p.nombre,
      tipo: p.tipo,
      direccion: p.direccion,
      telefono: p.telefono ?? '',
      imagen: p.imagen ?? '',
      lat: asNum(p.lat),
      lng: asNum(p.lng),
      // El PIN no viaja en los listados: se entrega solo al crear.
    };
  }

  async list(ciudad: unknown) {
    const rows = await this.db
      .select()
      .from(puntosApoyo)
      .where(eq(puntosApoyo.ciudad, str(ciudad) || 'manizales'))
      .orderBy(desc(puntosApoyo.createdAt));
    return rows.map((r) => this.serialize(r));
  }

  async get(id: number) {
    const rows = await this.db.select().from(puntosApoyo).where(eq(puntosApoyo.id, id)).limit(1);
    return rows.length ? rows[0] : null;
  }

  async create(b: PuntoApoyoBody) {
    const nombre = str(b.nombre);
    const direccion = str(b.direccion);
    const lat = toNum(b.lat);
    const lng = toNum(b.lng);
    if (!nombre) throw new BadRequestException({ error: 'Falta el nombre del punto de apoyo' });
    if (!direccion) throw new BadRequestException({ error: 'Falta la dirección' });
    if (lat === null || lng === null) throw new BadRequestException({ error: 'Faltan las coordenadas (busca la dirección en el mapa)' });

    const existentes = await this.db.select({ pin: puntosApoyo.pin }).from(puntosApoyo);
    const pin = genPin(existentes.map((r) => r.pin));

    const [p] = await this.db
      .insert(puntosApoyo)
      .values({
        pin,
        ciudad: str(b.ciudad) || 'manizales',
        nombre,
        tipo: str(b.tipo) || 'Otro',
        direccion,
        telefono: str(b.telefono) || null,
        imagen: str(b.imagen) || null,
        lat: String(lat),
        lng: String(lng),
        visitorId: str(b.visitor_id)?.slice(0, 64) || null,
      })
      .returning();

    emitAppEvent({
      type: 'punto_apoyo',
      mensaje: `Nuevo punto de apoyo: ${nombre}`,
      ciudad: p.ciudad,
      item: this.serialize(p),
      at: new Date().toISOString(),
    });
    await registrarAuditoria(this.db, {
      tabla: 'puntos_apoyo', registroId: p.id, accion: 'create',
      datosNuevos: this.serialize(p), autor: 'usuario', codigo: pin,
      visitorId: str(b.visitor_id),
    });
    return { ...this.serialize(p), pin };
  }

  async updatePublic(id: number, b: PuntoApoyoBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Punto de apoyo no encontrado' });
    const esAdminEdit = isAdminEdit(b.pin);
    if (!checkEditCode(row.pin, b.pin)) {
      throw new ForbiddenException({ error: 'Código de edición incorrecto' });
    }
    const previo = this.serialize(row);
    const nuevo = await this.patch(id, b);
    await registrarAuditoria(this.db, {
      tabla: 'puntos_apoyo', registroId: id, accion: 'update',
      datosPrevios: previo, datosNuevos: nuevo, autor: esAdminEdit ? 'admin' : 'usuario', codigo: esAdminEdit ? 'ADMIN_EDIT' : str(b.pin),
    });
    return nuevo;
  }

  async adminUpdate(id: number, b: PuntoApoyoBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Punto de apoyo no encontrado' });
    const previo = this.serialize(row);
    const nuevo = await this.patch(id, b);
    await registrarAuditoria(this.db, {
      tabla: 'puntos_apoyo', registroId: id, accion: 'update',
      datosPrevios: previo, datosNuevos: nuevo, autor: 'admin', codigo: 'llave-admin',
    });
    return nuevo;
  }

  private async patch(id: number, b: PuntoApoyoBody) {
    const set: Partial<typeof puntosApoyo.$inferInsert> = {};
    if (b.ciudad !== undefined) set.ciudad = str(b.ciudad) || 'manizales';
    if (b.nombre !== undefined) set.nombre = str(b.nombre);
    if (b.tipo !== undefined) set.tipo = str(b.tipo) || 'Otro';
    if (b.direccion !== undefined) set.direccion = str(b.direccion);
    if (b.telefono !== undefined) set.telefono = str(b.telefono) || null;
    if (b.imagen !== undefined) set.imagen = str(b.imagen) || null;
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
    const [p] = await this.db.update(puntosApoyo).set(set).where(eq(puntosApoyo.id, id)).returning();
    return this.serialize(p);
  }

  async remove(id: number) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Punto de apoyo no encontrado' });
    await this.db.delete(puntosApoyo).where(eq(puntosApoyo.id, id));
    await registrarAuditoria(this.db, {
      tabla: 'puntos_apoyo', registroId: id, accion: 'delete',
      datosPrevios: this.serialize(row), autor: 'admin', codigo: 'llave-admin',
    });
    return { ok: true };
  }

  /** Borrado público con el PIN que se le dio al usuario al publicar. */
  async removePublic(id: number, pin: unknown) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Punto de apoyo no encontrado' });
    const esAdminEdit = isAdminEdit(pin);
    if (!checkEditCode(row.pin, pin)) {
      throw new ForbiddenException({ error: 'Código de edición incorrecto' });
    }
    await this.db.delete(puntosApoyo).where(eq(puntosApoyo.id, id));
    await registrarAuditoria(this.db, {
      tabla: 'puntos_apoyo', registroId: id, accion: 'delete',
      datosPrevios: this.serialize(row), autor: esAdminEdit ? 'admin' : 'usuario', codigo: esAdminEdit ? 'ADMIN_EDIT' : str(pin),
    });
    return { ok: true };
  }
}

@Controller('puntos-apoyo')
export class PuntosApoyoController {
  constructor(private readonly svc: PuntosApoyoService) {}

  @Get()
  list(@Query('ciudad') ciudad?: string) {
    return this.svc.list(ciudad ?? 'manizales');
  }

  @Post()
  // Crear un punto de apoyo es público: cualquier persona puede aportar un lugar.
  create(@Body() b: PuntoApoyoBody) {
    return this.svc.create(b);
  }

  /** Edición pública: exige el PIN que se le dio al usuario al publicar. */
  @Patch(':id')
  update(@Param('id') id: string, @Body() b: PuntoApoyoBody) {
    return this.svc.updatePublic(toInt(id), b);
  }

  /** Edición con la llave general de Admin. */
  @Patch(':id/admin')
  @UseGuards(AdminGuard)
  adminUpdate(@Param('id') id: string, @Body() b: PuntoApoyoBody) {
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
  controllers: [PuntosApoyoController],
  providers: [PuntosApoyoService],
})
export class PuntosApoyoModule {}
