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
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DB, Db } from '../db/database';
import { contactos, sectores } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { emitAppEvent } from '../events/events.module';
import { asNum, asIso } from '../common/serialize';
import { str, toInt, toNum } from '../common/util';

const CIUDADES = ['manizales', 'pereira', 'cali', 'quibdo', 'norte_valle', 'armenia'];

function ciudadValida(v: unknown): string {
  const c = str(v).toLowerCase();
  return CIUDADES.includes(c) ? c : 'manizales';
}

type SectorBody = {
  ciudad?: string;
  nombre?: string;
  barrio?: string;
  lat?: unknown;
  lng?: unknown;
  descripcion?: string;
  nivel_afectacion?: 'leve' | 'moderado' | 'severo';
  estado?: 'activo' | 'cerrado';
  contacto_nombre?: string;
  contacto_telefono?: string;
  contacto_rol?: string;
  // Necesidad inicial opcional
  tipo?: string;
  cantidad?: string;
  prioridad?: 'alta' | 'media' | 'baja';
  detalles?: string;
  reportado_por?: string;
  telefono?: string;
  visitor_id?: string;
};

type ContactoBody = { nombre?: string; telefono?: string; rol?: string };

@Injectable()
class SectoresService {
  constructor(@Inject(DB) private db: Db) {}

  private serialize(s: typeof sectores.$inferSelect, contactosRows: typeof contactos.$inferSelect[]) {
    return {
      id: s.id,
      ciudad: s.ciudad,
      nombre: s.nombre,
      barrio: s.barrio ?? '',
      lat: asNum(s.lat),
      lng: asNum(s.lng),
      descripcion: s.descripcion ?? '',
      nivel_afectacion: s.nivelAfectacion,
      estado: s.estado,
      created_at: asIso(s.createdAt),
      contactos: contactosRows.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono ?? '',
        rol: c.rol ?? '',
      })),
    };
  }

  private async withContactos(rows: typeof sectores.$inferSelect[]) {
    if (!rows.length) return [];
    const cs = await this.db
      .select()
      .from(contactos)
      .where(inArray(contactos.sectorId, rows.map((r) => r.id)));
    const bySector = new Map<number, typeof contactos.$inferSelect[]>();
    for (const c of cs) {
      const list = bySector.get(c.sectorId) ?? [];
      list.push(c);
      bySector.set(c.sectorId, list);
    }
    return rows.map((r) => this.serialize(r, bySector.get(r.id) ?? []));
  }

  async list(ciudad: unknown, incluirCerrados = false) {
    const c = ciudadValida(ciudad);
    const cond = incluirCerrados
      ? eq(sectores.ciudad, c)
      : and(eq(sectores.ciudad, c), eq(sectores.estado, 'activo'));
    const rows = await this.db
      .select()
      .from(sectores)
      .where(cond)
      .orderBy(desc(sectores.createdAt));
    return this.withContactos(rows);
  }

  async get(id: number) {
    const rows = await this.db.select().from(sectores).where(eq(sectores.id, id)).limit(1);
    return rows.length ? (await this.withContactos(rows))[0] : null;
  }

  async create(b: SectorBody) {
    const nombre = str(b.nombre);
    const lat = toNum(b.lat);
    const lng = toNum(b.lng);
    if (!nombre) throw new BadRequestException({ error: 'Falta el nombre del sector' });
    if (lat === null || lng === null) {
      throw new BadRequestException({ error: 'Faltan las coordenadas del sector' });
    }

    const [s] = await this.db
      .insert(sectores)
      .values({
        ciudad: ciudadValida(b.ciudad),
        nombre,
        barrio: str(b.barrio) || null,
        lat: String(lat),
        lng: String(lng),
        descripcion: str(b.descripcion) || null,
        nivelAfectacion: b.nivel_afectacion === 'leve' || b.nivel_afectacion === 'severo' ? b.nivel_afectacion : 'moderado',
        estado: b.estado === 'cerrado' ? 'cerrado' : 'activo',
        visitorId: str(b.visitor_id)?.slice(0, 64) || null,
      })
      .returning();

    if (str(b.contacto_nombre)) {
      await this.db.insert(contactos).values({
        sectorId: s.id,
        nombre: str(b.contacto_nombre),
        telefono: str(b.contacto_telefono) || null,
        rol: str(b.contacto_rol) || null,
      });
    }

    // La necesidad inicial se crea con POST /necesidades desde el frontend,
    // igual que en el flujo de la interfaz nueva (MapPage.submitReport).

    const sector = await this.get(s.id);
    if (sector) {
      emitAppEvent({
        type: 'sector',
        mensaje: `Nuevo sector: ${sector.nombre}`,
        ciudad: sector.ciudad,
        item: sector,
        at: new Date().toISOString(),
      });
    }
    return sector;
  }

  async update(id: number, b: SectorBody) {
    const set: Partial<typeof sectores.$inferInsert> = {};
    if (b.nombre !== undefined) set.nombre = str(b.nombre);
    if (b.barrio !== undefined) set.barrio = str(b.barrio) || null;
    if (b.descripcion !== undefined) set.descripcion = str(b.descripcion) || null;
    if (b.ciudad !== undefined) set.ciudad = ciudadValida(b.ciudad);
    if (b.nivel_afectacion !== undefined) {
      set.nivelAfectacion = b.nivel_afectacion === 'leve' || b.nivel_afectacion === 'severo' ? b.nivel_afectacion : 'moderado';
    }
    if (b.estado !== undefined) set.estado = b.estado === 'cerrado' ? 'cerrado' : 'activo';
    const lat = b.lat !== undefined ? toNum(b.lat) : null;
    const lng = b.lng !== undefined ? toNum(b.lng) : null;
    if (b.lat !== undefined && lat === null) throw new BadRequestException({ error: 'Latitud inválida' });
    if (b.lng !== undefined && lng === null) throw new BadRequestException({ error: 'Longitud inválida' });
    if (lat !== null) set.lat = String(lat);
    if (lng !== null) set.lng = String(lng);

    await this.db.update(sectores).set(set).where(eq(sectores.id, id));
    return this.get(id);
  }

  async setEstado(id: number, estado: unknown) {
    if (estado !== 'activo' && estado !== 'cerrado') {
      throw new BadRequestException({ error: "Estado inválido (activo o cerrado)" });
    }
    await this.db.update(sectores).set({ estado }).where(eq(sectores.id, id));
    return this.get(id);
  }

  async remove(id: number) {
    await this.db.delete(sectores).where(eq(sectores.id, id));
    return { ok: true };
  }

  async addContacto(sectorId: number, b: ContactoBody) {
    const nombre = str(b.nombre);
    if (!nombre) throw new BadRequestException({ error: 'Falta el nombre del contacto' });
    const [c] = await this.db
      .insert(contactos)
      .values({
        sectorId,
        nombre,
        telefono: str(b.telefono) || null,
        rol: str(b.rol) || null,
      })
      .returning();
    return { id: c.id, nombre: c.nombre, telefono: c.telefono ?? '', rol: c.rol ?? '' };
  }

  async updateContacto(id: number, b: ContactoBody) {
    const set: Partial<typeof contactos.$inferInsert> = {};
    if (b.nombre !== undefined) set.nombre = str(b.nombre);
    if (b.telefono !== undefined) set.telefono = str(b.telefono) || null;
    if (b.rol !== undefined) set.rol = str(b.rol) || null;
    const [c] = await this.db.update(contactos).set(set).where(eq(contactos.id, id)).returning();
    return c ? { id: c.id, nombre: c.nombre, telefono: c.telefono ?? '', rol: c.rol ?? '' } : null;
  }

  async removeContacto(id: number) {
    await this.db.delete(contactos).where(eq(contactos.id, id));
    return { ok: true };
  }
}

@Controller('sectores')
export class SectoresController {
  constructor(private readonly svc: SectoresService) {}

  @Get()
  list(@Query('ciudad') ciudad?: string) {
    return this.svc.list(ciudad);
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  listAll(@Query('ciudad') ciudad?: string) {
    return this.svc.list(ciudad, true);
  }

  @Post()
  create(@Body() b: SectorBody) {
    return this.svc.create(b);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() b: SectorBody) {
    return this.svc.update(toInt(id), b);
  }

  @Patch(':id/estado')
  @UseGuards(AdminGuard)
  setEstado(@Param('id') id: string, @Body('estado') estado: unknown) {
    return this.svc.setEstado(toInt(id), estado);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.svc.remove(toInt(id));
  }

  @Post(':id/contactos')
  addContacto(@Param('id') id: string, @Body() b: ContactoBody) {
    return this.svc.addContacto(toInt(id), b);
  }
}

@Controller('contactos')
export class ContactosController {
  constructor(private readonly svc: SectoresService) {}

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() b: ContactoBody) {
    return this.svc.updateContacto(toInt(id), b);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.svc.removeContacto(toInt(id));
  }
}

@Module({
  controllers: [SectoresController, ContactosController],
  providers: [SectoresService],
  exports: [SectoresService],
})
export class SectoresModule {}
