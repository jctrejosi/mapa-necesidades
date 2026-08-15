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
import { viviendas } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { emitAppEvent } from '../events/events.module';
import { asDate, nested } from '../common/serialize';
import { checkPin, genPin, str, toDate, toInt, today } from '../common/util';
import { notifyReporteWhatsapp } from '../common/whatsapp';

type ViviendaBody = {
  pin?: string;
  ciudad?: string;
  tipo?: 'gratis' | 'alquiler';
  precio?: string;
  capacidad?: string;
  tiempo_disponible?: string;
  sector_referencia?: string;
  descripcion?: string;
  imagen?: string;
  estado?: 'disponible' | 'ocupado';
  nombre_ofrece?: string;
  telefono_ofrece?: string;
  interesado?: { nombre?: string; telefono?: string } | null;
};

@Injectable()
class ViviendasService {
  constructor(@Inject(DB) private db: Db) {}

  private serialize(v: typeof viviendas.$inferSelect) {
    return {
      id: v.id,
      ciudad: v.ciudad,
      tipo: v.tipo,
      precio: v.precio ?? '',
      capacidad: v.capacidad ?? '',
      tiempo_disponible: v.tiempoDisponible ?? '',
      sector_referencia: v.sectorReferencia ?? '',
      descripcion: v.descripcion ?? '',
      imagen: v.imagen ?? '',
      estado: v.estado,
      nombre_ofrece: v.nombreOfrece,
      telefono_ofrece: v.telefonoOfrece,
      interesado: nested(v.interesadoNombre, v.interesadoTelefono, v.fechaInteres),
      pin: v.pin ?? '',
    };
  }

  async list(ciudad: unknown) {
    const rows = await this.db
      .select()
      .from(viviendas)
      .where(eq(viviendas.ciudad, str(ciudad) || 'manizales'))
      .orderBy(desc(viviendas.createdAt));
    return rows.map((r) => this.serialize(r));
  }

  async get(id: number) {
    const rows = await this.db.select().from(viviendas).where(eq(viviendas.id, id)).limit(1);
    return rows.length ? rows[0] : null;
  }

  async create(b: ViviendaBody) {
    const nombreOfrece = str(b.nombre_ofrece);
    if (!nombreOfrece) throw new BadRequestException({ error: 'Falta el nombre de quien ofrece' });

    const existentes = await this.db.select({ pin: viviendas.pin }).from(viviendas);
    const pin = genPin(existentes.map((r) => r.pin));
    const [v] = await this.db
      .insert(viviendas)
      .values({
        pin,
        ciudad: str(b.ciudad) || 'manizales',
        tipo: b.tipo === 'alquiler' ? 'alquiler' : 'gratis',
        precio: str(b.precio) || null,
        capacidad: str(b.capacidad) || null,
        tiempoDisponible: str(b.tiempo_disponible) || null,
        sectorReferencia: str(b.sector_referencia) || null,
        descripcion: str(b.descripcion) || null,
        imagen: str(b.imagen) || null,
        estado: b.estado === 'ocupado' ? 'ocupado' : 'disponible',
        nombreOfrece,
        telefonoOfrece: str(b.telefono_ofrece),
        fecha: today(),
      })
      .returning();
    emitAppEvent({
      type: 'vivienda',
      mensaje: `Nueva oferta de vivienda (${v.tipo === 'alquiler' ? 'alquiler' : 'gratis'})`,
      ciudad: v.ciudad,
      item: { ...this.serialize(v), pin },
      at: new Date().toISOString(),
    });
    notifyReporteWhatsapp(b.telefono_ofrece, 'oferta de vivienda', pin, `Detalle: ${v.tipo === 'alquiler' ? 'Alquiler' : 'Gratis'}`);
    return { ...this.serialize(v), pin };
  }

  async updatePublic(id: number, b: ViviendaBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Vivienda no encontrada' });
    if (!checkPin(row.pin, b.pin)) {
      throw new ForbiddenException({ error: 'Código de edición incorrecto' });
    }
    const set: Partial<typeof viviendas.$inferInsert> = {};
    if (b.tipo !== undefined) set.tipo = b.tipo === 'alquiler' ? 'alquiler' : 'gratis';
    if (b.precio !== undefined) set.precio = str(b.precio) || null;
    if (b.capacidad !== undefined) set.capacidad = str(b.capacidad) || null;
    if (b.tiempo_disponible !== undefined) set.tiempoDisponible = str(b.tiempo_disponible) || null;
    if (b.sector_referencia !== undefined) set.sectorReferencia = str(b.sector_referencia) || null;
    if (b.descripcion !== undefined) set.descripcion = str(b.descripcion) || null;
    if (b.imagen !== undefined) set.imagen = str(b.imagen) || null;
    if (b.estado !== undefined) set.estado = b.estado === 'ocupado' ? 'ocupado' : 'disponible';
    if (b.nombre_ofrece !== undefined) set.nombreOfrece = str(b.nombre_ofrece);
    if (b.telefono_ofrece !== undefined) set.telefonoOfrece = str(b.telefono_ofrece);
    const [v] = await this.db.update(viviendas).set(set).where(eq(viviendas.id, id)).returning();
    return this.serialize(v);
  }

  async marcarInteresado(id: number, nombre: unknown, telefono: unknown) {
    const n = str(nombre);
    if (!n) throw new BadRequestException({ error: 'Falta el nombre del interesado' });
    const [v] = await this.db
      .update(viviendas)
      .set({ interesadoNombre: n, interesadoTelefono: str(telefono) || null, fechaInteres: today() })
      .where(eq(viviendas.id, id))
      .returning();
    return this.serialize(v);
  }

  async quitarInteresado(id: number) {
    const [v] = await this.db
      .update(viviendas)
      .set({ interesadoNombre: null, interesadoTelefono: null, fechaInteres: null })
      .where(eq(viviendas.id, id))
      .returning();
    return this.serialize(v);
  }

  async remove(id: number) {
    await this.db.delete(viviendas).where(eq(viviendas.id, id));
    return { ok: true };
  }
}

@Controller('viviendas')
export class ViviendasController {
  constructor(private readonly svc: ViviendasService) {}

  @Get()
  list(@Query('ciudad') ciudad?: string) {
    return this.svc.list(ciudad ?? 'manizales');
  }

  @Post()
  create(@Body() b: ViviendaBody) {
    return this.svc.create(b);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() b: ViviendaBody) {
    return this.svc.updatePublic(toInt(id), b);
  }

  @Post(':id/interesado')
  marcar(@Param('id') id: string, @Body() b: { nombre?: string; telefono?: string }) {
    return this.svc.marcarInteresado(toInt(id), b?.nombre, b?.telefono);
  }

  @Delete(':id/interesado')
  quitar(@Param('id') id: string) {
    return this.svc.quitarInteresado(toInt(id));
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.svc.remove(toInt(id));
  }
}

@Module({
  controllers: [ViviendasController],
  providers: [ViviendasService],
})
export class ViviendasModule {}
