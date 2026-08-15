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
import { mascotasPerdidas } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { emitAppEvent } from '../events/events.module';
import { asDate, asNum, nested } from '../common/serialize';
import { checkPin, genPin, str, toDate, toInt, toNum, today } from '../common/util';
import { notifyReporteWhatsapp } from '../common/whatsapp';

type MascotaBody = {
  pin?: string;
  ciudad?: string;
  nombre_mascota?: string;
  tipo_animal?: string;
  senas?: string;
  imagen?: string;
  lat?: unknown;
  lng?: unknown;
  lugar_visto?: string;
  fecha_visto?: string;
  estado?: 'perdido' | 'encontrado';
  nombre_reporta?: string;
  telefono_reporta?: string;
  visitor_id?: string;
};

@Injectable()
class MascotasService {
  constructor(@Inject(DB) private db: Db) {}

  private serialize(m: typeof mascotasPerdidas.$inferSelect) {
    return {
      id: m.id,
      ciudad: m.ciudad,
      nombre: m.nombreMascota ?? '',
      tipo_animal: m.tipoAnimal,
      senas: m.senas ?? '',
      imagen: m.imagen ?? '',
      lat: asNum(m.lat),
      lng: asNum(m.lng),
      lugar_visto: m.lugarVisto ?? '',
      fecha_visto: asDate(m.fechaVisto),
      estado: m.estado,
      nombre_reporta: m.nombreReporta,
      telefono_reporta: m.telefonoReporta,
      avistado_por: nested(m.avistadoPorNombre, m.avistadoPorTelefono, m.fechaAvistamiento),
      pin: m.pin ?? '',
    };
  }

  async list(ciudad: unknown, todas = false) {
    const rows = await this.db
      .select()
      .from(mascotasPerdidas)
      .where(eq(mascotasPerdidas.ciudad, str(ciudad) || 'manizales'))
      .orderBy(desc(mascotasPerdidas.createdAt));
    return rows.map((r) => this.serialize(r));
  }

  async get(id: number) {
    const rows = await this.db.select().from(mascotasPerdidas).where(eq(mascotasPerdidas.id, id)).limit(1);
    return rows.length ? rows[0] : null;
  }

  async create(b: MascotaBody) {
    const tipo = str(b.tipo_animal);
    const lat = toNum(b.lat);
    const lng = toNum(b.lng);
    if (!tipo) throw new BadRequestException({ error: 'Falta el tipo de animal' });
    if (lat === null || lng === null) throw new BadRequestException({ error: 'Faltan las coordenadas' });

    const existentes = await this.db.select({ pin: mascotasPerdidas.pin }).from(mascotasPerdidas);
    const pin = genPin(existentes.map((r) => r.pin));
    const [m] = await this.db
      .insert(mascotasPerdidas)
      .values({
        pin,
        ciudad: str(b.ciudad) || 'manizales',
        nombreMascota: str(b.nombre_mascota) || null,
        tipoAnimal: tipo,
        senas: str(b.senas) || null,
        imagen: str(b.imagen) || null,
        lat: String(lat),
        lng: String(lng),
        lugarVisto: str(b.lugar_visto) || null,
        fechaVisto: toDate(b.fecha_visto) ?? today(),
        estado: b.estado === 'encontrado' ? 'encontrado' : 'perdido',
        nombreReporta: str(b.nombre_reporta),
        telefonoReporta: str(b.telefono_reporta),
        visitorId: str(b.visitor_id)?.slice(0, 64) || null,
      })
      .returning();
    emitAppEvent({
      type: 'mascota',
      mensaje: `Mascota reportada: ${str(b.nombre_mascota) || tipo}`,
      ciudad: m.ciudad,
      item: { ...this.serialize(m), pin },
      at: new Date().toISOString(),
    });
    notifyReporteWhatsapp(b.telefono_reporta, 'reporte de mascota', pin, `Detalle: ${str(b.nombre_mascota) || tipo}`);
    return { ...this.serialize(m), pin };
  }

  async updatePublic(id: number, b: MascotaBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Mascota no encontrada' });
    if (!checkPin(row.pin, b.pin)) {
      throw new ForbiddenException({ error: 'Código de edición incorrecto' });
    }
    const set: Partial<typeof mascotasPerdidas.$inferInsert> = {};
    if (b.nombre_mascota !== undefined) set.nombreMascota = str(b.nombre_mascota) || null;
    if (b.tipo_animal !== undefined) set.tipoAnimal = str(b.tipo_animal);
    if (b.senas !== undefined) set.senas = str(b.senas) || null;
    if (b.imagen !== undefined) set.imagen = str(b.imagen) || null;
    if (b.lugar_visto !== undefined) set.lugarVisto = str(b.lugar_visto) || null;
    if (b.fecha_visto !== undefined) set.fechaVisto = toDate(b.fecha_visto) ?? today();
    if (b.estado !== undefined) set.estado = b.estado === 'encontrado' ? 'encontrado' : 'perdido';
    const [m] = await this.db.update(mascotasPerdidas).set(set).where(eq(mascotasPerdidas.id, id)).returning();
    return this.serialize(m);
  }

  async avistar(id: number, nombre: unknown, telefono: unknown) {
    const n = str(nombre);
    if (!n) throw new BadRequestException({ error: 'Falta el nombre de quien avistó' });
    const [m] = await this.db
      .update(mascotasPerdidas)
      .set({ avistadoPorNombre: n, avistadoPorTelefono: str(telefono) || null, fechaAvistamiento: today() })
      .where(eq(mascotasPerdidas.id, id))
      .returning();
    return this.serialize(m);
  }

  async quitarAvistamiento(id: number) {
    const [m] = await this.db
      .update(mascotasPerdidas)
      .set({ avistadoPorNombre: null, avistadoPorTelefono: null, fechaAvistamiento: null })
      .where(eq(mascotasPerdidas.id, id))
      .returning();
    return this.serialize(m);
  }

  async remove(id: number) {
    await this.db.delete(mascotasPerdidas).where(eq(mascotasPerdidas.id, id));
    return { ok: true };
  }
}

@Controller('mascotas')
export class MascotasController {
  constructor(private readonly svc: MascotasService) {}

  @Get()
  list(@Query('ciudad') ciudad?: string) {
    return this.svc.list(ciudad ?? 'manizales');
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  listAll(@Query('ciudad') ciudad?: string) {
    return this.svc.list(ciudad ?? 'manizales', true);
  }

  @Post()
  create(@Body() b: MascotaBody) {
    return this.svc.create(b);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() b: MascotaBody) {
    return this.svc.updatePublic(toInt(id), b);
  }

  @Post(':id/avistamiento')
  avistar(@Param('id') id: string, @Body() b: { nombre?: string; telefono?: string }) {
    return this.svc.avistar(toInt(id), b?.nombre, b?.telefono);
  }

  @Delete(':id/avistamiento')
  quitar(@Param('id') id: string) {
    return this.svc.quitarAvistamiento(toInt(id));
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.svc.remove(toInt(id));
  }
}

@Module({
  controllers: [MascotasController],
  providers: [MascotasService],
})
export class MascotasModule {}
