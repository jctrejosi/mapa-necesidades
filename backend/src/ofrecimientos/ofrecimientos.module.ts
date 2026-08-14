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
import { checkPin, genPin, str, toDate, toInt, today } from '../common/util';

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
      pin: o.pin ?? '',
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
      })
      .returning();
    emitAppEvent({
      type: 'ofrecimiento',
      mensaje: `Nuevo ofrecimiento: ${str(b.tipo)}`,
      ciudad: o.ciudad,
      item: { ...this.serialize(o), pin },
      at: new Date().toISOString(),
    });
    return { ...this.serialize(o), pin };
  }

  async updatePublic(id: number, b: OfrecimientoBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Ofrecimiento no encontrado' });
    if (!checkPin(row.pin, b.pin)) {
      throw new ForbiddenException({ error: 'Código de edición incorrecto' });
    }
    const set: Partial<typeof ofrecimientos.$inferInsert> = {};
    if (b.tipo !== undefined) set.tipo = str(b.tipo);
    if (b.descripcion !== undefined) set.descripcion = str(b.descripcion) || null;
    if (b.imagen !== undefined) set.imagen = str(b.imagen) || null;
    if (b.cantidad !== undefined) set.cantidad = str(b.cantidad) || null;
    if (b.fecha !== undefined) set.fecha = toDate(b.fecha) ?? today();
    if (b.estado !== undefined) set.estado = b.estado === 'entregado' ? 'entregado' : 'disponible';
    const [o] = await this.db.update(ofrecimientos).set(set).where(eq(ofrecimientos.id, id)).returning();
    return this.serialize(o);
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
    await this.db.delete(ofrecimientos).where(eq(ofrecimientos.id, id));
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
}

@Module({
  controllers: [OfrecimientosController],
  providers: [OfrecimientosService],
})
export class OfrecimientosModule {}
