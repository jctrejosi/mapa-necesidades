import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DB, Db } from '../db/database';
import { centrosAcopio } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { asNum } from '../common/serialize';
import { str, toInt, toNum } from '../common/util';

type CentroBody = {
  ciudad?: string;
  nombre?: string;
  organizacion?: string;
  es_acopio?: unknown;
  es_sangre?: unknown;
  es_alojamiento?: unknown;
  que_recibe?: string;
  imagen?: string;
  direccion?: string;
  telefono?: string;
  horario?: string;
  lat?: unknown;
  lng?: unknown;
  estado?: 'abierto' | 'cerrado';
};

const esBool = (v: unknown): boolean => v === true || v === 1 || v === '1' || v === 'true';

@Injectable()
class CentrosService {
  constructor(@Inject(DB) private db: Db) {}

  private serialize(c: typeof centrosAcopio.$inferSelect) {
    return {
      id: c.id,
      ciudad: c.ciudad,
      nombre: c.nombre,
      organizacion: c.organizacion ?? '',
      es_acopio: c.esAcopio,
      es_sangre: c.esSangre,
      es_alojamiento: c.esAlojamiento,
      que_recibe: c.queRecibe ?? '',
      imagen: c.imagen ?? '',
      direccion: c.direccion ?? '',
      telefono: c.telefono ?? '',
      horario: c.horario ?? '',
      lat: asNum(c.lat),
      lng: asNum(c.lng),
      estado: c.estado,
    };
  }

  async list(ciudad: unknown) {
    // Incluye cerrados (la UI los marca como tal), igual que la app anterior.
    const rows = await this.db
      .select()
      .from(centrosAcopio)
      .where(eq(centrosAcopio.ciudad, str(ciudad) || 'manizales'))
      .orderBy(desc(centrosAcopio.createdAt));
    return rows.map((r) => this.serialize(r));
  }

  async create(b: CentroBody) {
    const nombre = str(b.nombre);
    const lat = toNum(b.lat);
    const lng = toNum(b.lng);
    if (!nombre) throw new BadRequestException({ error: 'Falta el nombre del centro' });
    if (lat === null || lng === null) throw new BadRequestException({ error: 'Faltan las coordenadas' });

    const [c] = await this.db
      .insert(centrosAcopio)
      .values({
        ciudad: str(b.ciudad) || 'manizales',
        nombre,
        organizacion: str(b.organizacion) || null,
        esAcopio: esBool(b.es_acopio),
        esSangre: esBool(b.es_sangre),
        esAlojamiento: esBool(b.es_alojamiento),
        queRecibe: str(b.que_recibe) || null,
        imagen: str(b.imagen) || null,
        direccion: str(b.direccion) || null,
        telefono: str(b.telefono) || null,
        horario: str(b.horario) || null,
        lat: String(lat),
        lng: String(lng),
        estado: b.estado === 'cerrado' ? 'cerrado' : 'abierto',
      })
      .returning();
    return this.serialize(c);
  }

  async update(id: number, b: CentroBody) {
    const set: Partial<typeof centrosAcopio.$inferInsert> = {};
    if (b.ciudad !== undefined) set.ciudad = str(b.ciudad) || 'manizales';
    if (b.nombre !== undefined) set.nombre = str(b.nombre);
    if (b.organizacion !== undefined) set.organizacion = str(b.organizacion) || null;
    if (b.es_acopio !== undefined) set.esAcopio = esBool(b.es_acopio);
    if (b.es_sangre !== undefined) set.esSangre = esBool(b.es_sangre);
    if (b.es_alojamiento !== undefined) set.esAlojamiento = esBool(b.es_alojamiento);
    if (b.que_recibe !== undefined) set.queRecibe = str(b.que_recibe) || null;
    if (b.imagen !== undefined) set.imagen = str(b.imagen) || null;
    if (b.direccion !== undefined) set.direccion = str(b.direccion) || null;
    if (b.telefono !== undefined) set.telefono = str(b.telefono) || null;
    if (b.horario !== undefined) set.horario = str(b.horario) || null;
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
    if (b.estado !== undefined) set.estado = b.estado === 'cerrado' ? 'cerrado' : 'abierto';
    const [c] = await this.db.update(centrosAcopio).set(set).where(eq(centrosAcopio.id, id)).returning();
    return this.serialize(c);
  }

  async remove(id: number) {
    await this.db.delete(centrosAcopio).where(eq(centrosAcopio.id, id));
    return { ok: true };
  }
}

@Controller('centros')
export class CentrosController {
  constructor(private readonly svc: CentrosService) {}

  @Get()
  list(@Query('ciudad') ciudad?: string) {
    return this.svc.list(ciudad ?? 'manizales');
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() b: CentroBody) {
    return this.svc.create(b);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() b: CentroBody) {
    return this.svc.update(toInt(id), b);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.svc.remove(toInt(id));
  }
}

@Module({
  controllers: [CentrosController],
  providers: [CentrosService],
})
export class CentrosModule {}
