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
import { ofrecimientos } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { emitAppEvent } from '../events/events.module';
import { asDate, nested } from '../common/serialize';
import { checkEditCode, genPin, isAdminEdit, str, toDate, toInt, today } from '../common/util';
import { notifyReporteWhatsapp } from '../common/whatsapp';
import { registrarAuditoria } from '../common/audit';

type OfrecimientoBody = {
  pin?: string;
  ciudad?: string;
  tipo?: string;
  descripcion?: string;
  imagen?: string;
  cantidad?: string;
  fecha?: string;
  nombre_ofrece?: string;
  telefono_ofrece?: string;
  estado?: 'disponible' | 'entregado';
  reservado_por?: { nombre?: string; telefono?: string } | null;
  visitor_id?: string;
};

@Injectable()
class OfrecimientosService {
  constructor(@Inject(DB) private db: Db) {}

  private serialize(o: typeof ofrecimientos.$inferSelect) {
    return {
      id: o.id,
      ciudad: o.ciudad,
      tipo: o.tipo,
      descripcion: o.descripcion ?? '',
      imagen: o.imagen ?? '',
      cantidad: o.cantidad ?? '',
      fecha: asDate(o.fecha),
      nombre_ofrece: o.nombreOfrece,
      telefono_ofrece: o.telefonoOfrece ?? '',
      estado: o.estado,
      reservado_por: nested(o.reservadoPorNombre, o.reservadoPorTelefono, o.fechaReserva),
      // El PIN no viaja en los listados públicos.
    };
  }

  async list(ciudad: unknown) {
    const rows = await this.db
      .select()
      .from(ofrecimientos)
      .where(eq(ofrecimientos.ciudad, str(ciudad) || 'manizales'))
      .orderBy(desc(ofrecimientos.createdAt));
    return rows.map((r) => this.serialize(r));
  }

  async get(id: number) {
    const rows = await this.db.select().from(ofrecimientos).where(eq(ofrecimientos.id, id)).limit(1);
    return rows.length ? rows[0] : null;
  }

  async create(b: OfrecimientoBody) {
    const nombreOfrece = str(b.nombre_ofrece);
    if (!nombreOfrece) throw new BadRequestException({ error: 'Falta el nombre de quien ofrece' });
    if (!str(b.tipo)) throw new BadRequestException({ error: 'Falta el tipo de ofrecimiento' });

    const existentes = await this.db.select({ pin: ofrecimientos.pin }).from(ofrecimientos);
    const pin = genPin(existentes.map((r) => r.pin));
    const [o] = await this.db
      .insert(ofrecimientos)
      .values({
        pin,
        ciudad: str(b.ciudad) || 'manizales',
        tipo: str(b.tipo),
        descripcion: str(b.descripcion) || null,
        imagen: str(b.imagen) || null,
        cantidad: str(b.cantidad) || null,
        fecha: toDate(b.fecha) ?? today(),
        nombreOfrece,
        telefonoOfrece: str(b.telefono_ofrece) || null,
        estado: b.estado === 'entregado' ? 'entregado' : 'disponible',
        visitorId: str(b.visitor_id)?.slice(0, 64) || null,
      })
      .returning();
    emitAppEvent({
      type: 'ofrecimiento',
      mensaje: `Nuevo ofrecimiento: ${str(b.tipo)}`,
      ciudad: o.ciudad,
      item: { ...this.serialize(o), pin },
      at: new Date().toISOString(),
    });
    notifyReporteWhatsapp(b.telefono_ofrece, 'ofrecimiento', pin, `Detalle: ${str(b.tipo)}`);
    await registrarAuditoria(this.db, {
      tabla: 'ofrecimientos', registroId: o.id, accion: 'create',
      datosNuevos: this.serialize(o), autor: 'usuario', codigo: pin,
      visitorId: str(b.visitor_id),
    });
    return { ...this.serialize(o), pin };
  }

  async updatePublic(id: number, b: OfrecimientoBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Ofrecimiento no encontrado' });
    const esAdminEdit = isAdminEdit(b.pin);
    if (!checkEditCode(row.pin, b.pin)) {
      throw new ForbiddenException({ error: 'Código de edición incorrecto' });
    }
    const previo = this.serialize(row);
    const set: Partial<typeof ofrecimientos.$inferInsert> = {};
    if (b.tipo !== undefined) set.tipo = str(b.tipo);
    if (b.descripcion !== undefined) set.descripcion = str(b.descripcion) || null;
    if (b.imagen !== undefined) set.imagen = str(b.imagen) || null;
    if (b.cantidad !== undefined) set.cantidad = str(b.cantidad) || null;
    if (b.fecha !== undefined) set.fecha = toDate(b.fecha) ?? today();
    if (b.estado !== undefined) set.estado = b.estado === 'entregado' ? 'entregado' : 'disponible';
    const [o] = await this.db.update(ofrecimientos).set(set).where(eq(ofrecimientos.id, id)).returning();
    const nuevo = this.serialize(o);
    await registrarAuditoria(this.db, {
      tabla: 'ofrecimientos', registroId: id, accion: 'update',
      datosPrevios: previo, datosNuevos: nuevo, autor: esAdminEdit ? 'admin' : 'usuario', codigo: esAdminEdit ? 'ADMIN_EDIT' : str(b.pin),
    });
    return nuevo;
  }

  async reservar(id: number, nombre: unknown, telefono: unknown) {
    const n = str(nombre);
    if (!n) throw new BadRequestException({ error: 'Falta el nombre de quien reserva' });
    const [o] = await this.db
      .update(ofrecimientos)
      .set({ reservadoPorNombre: n, reservadoPorTelefono: str(telefono) || null, fechaReserva: today() })
      .where(eq(ofrecimientos.id, id))
      .returning();
    return this.serialize(o);
  }

  async liberarReserva(id: number) {
    const [o] = await this.db
      .update(ofrecimientos)
      .set({ reservadoPorNombre: null, reservadoPorTelefono: null, fechaReserva: null })
      .where(eq(ofrecimientos.id, id))
      .returning();
    return this.serialize(o);
  }

  async remove(id: number) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Ofrecimiento no encontrado' });
    await this.db.delete(ofrecimientos).where(eq(ofrecimientos.id, id));
    await registrarAuditoria(this.db, {
      tabla: 'ofrecimientos', registroId: id, accion: 'delete',
      datosPrevios: this.serialize(row), autor: 'admin', codigo: 'llave-admin',
    });
    return { ok: true };
  }

  /** Borrado público con el PIN del usuario. */
  async removePublic(id: number, pin: unknown) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Ofrecimiento no encontrado' });
    const esAdminEdit = isAdminEdit(pin);
    if (!checkEditCode(row.pin, pin)) {
      throw new ForbiddenException({ error: 'Código de edición incorrecto' });
    }
    await this.db.delete(ofrecimientos).where(eq(ofrecimientos.id, id));
    await registrarAuditoria(this.db, {
      tabla: 'ofrecimientos', registroId: id, accion: 'delete',
      datosPrevios: this.serialize(row), autor: esAdminEdit ? 'admin' : 'usuario', codigo: esAdminEdit ? 'ADMIN_EDIT' : str(pin),
    });
    return { ok: true };
  }
}

@Controller('ofrecimientos')
export class OfrecimientosController {
  constructor(private readonly svc: OfrecimientosService) {}

  @Get()
  list(@Query('ciudad') ciudad?: string) {
    return this.svc.list(ciudad ?? 'manizales');
  }

  @Post()
  create(@Body() b: OfrecimientoBody) {
    return this.svc.create(b);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() b: OfrecimientoBody) {
    return this.svc.updatePublic(toInt(id), b);
  }

  @Post(':id/reserva')
  reservar(@Param('id') id: string, @Body() b: { nombre?: string; telefono?: string }) {
    return this.svc.reservar(toInt(id), b?.nombre, b?.telefono);
  }

  @Delete(':id/reserva')
  liberar(@Param('id') id: string) {
    return this.svc.liberarReserva(toInt(id));
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
  controllers: [OfrecimientosController],
  providers: [OfrecimientosService],
})
export class OfrecimientosModule {}
