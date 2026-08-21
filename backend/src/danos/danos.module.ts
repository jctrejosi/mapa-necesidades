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
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { Throttle } from '@nestjs/throttler';
import { DB, Db } from '../db/database';
import { reportesDanos } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { emitAppEvent } from '../events/events.module';
import { asDate, asNum } from '../common/serialize';
import { genRadicado, isAdminEdit, str, toDate, toInt, toNum, today } from '../common/util';
import { notifyReporteWhatsapp } from '../common/whatsapp';
import { registrarAuditoria } from '../common/audit';

// Ciudades con convenio para visita técnica (coincide con la app anterior)
const CIUDADES_REPORTE_DANOS = ['manizales'];

type DanoBody = {
  ciudad?: string;
  radicado?: string;
  tipo_inmueble?: string;
  direccion?: string;
  lat?: unknown;
  lng?: unknown;
  habitado?: 'si' | 'no' | 'evacuado';
  nivel_percibido?: 'leve' | 'moderado' | 'severo' | 'colapso';
  descripcion?: string;
  imagen?: string;
  nombre_reportante?: string;
  telefono_reportante?: string;
  cedula?: string;
  estado?: 'pendiente' | 'visita_programada' | 'visitado';
  fecha_visita?: string;
  resultado_visita?: string;
  notas_admin?: string;
  visitor_id?: string;
};

@Injectable()
class DanosService {
  constructor(@Inject(DB) private db: Db) {}

  /** Campos públicos (las notas internas solo las ve el admin).
   *  El radicado NO viaja en listados públicos: es la llave de edición/borrado. */
  private serializePublic(d: typeof reportesDanos.$inferSelect) {
    return {
      id: d.id,
      ciudad: d.ciudad,
      tipo_inmueble: d.tipoInmueble,
      direccion: d.direccion,
      lat: asNum(d.lat),
      lng: asNum(d.lng),
      habitado: d.habitado,
      nivel_percibido: d.nivelPercibido,
      descripcion: d.descripcion ?? '',
      imagen: d.imagen ?? '',
      estado: d.estado,
      nombre_reportante: d.nombreReporta,
      telefono_reportante: d.telefonoReporta,
      fecha: asDate(d.fecha),
      fecha_visita: d.fechaVisita ? asDate(d.fechaVisita) : null,
      resultado_visita: d.resultadoVisita,
    };
  }

  private serializeAdmin(d: typeof reportesDanos.$inferSelect) {
    return {
      ...this.serializePublic(d),
      radicado: d.radicado,
      cedula: d.cedulaReporta,
      notas_admin: d.notasAdmin,
    };
  }

  async listPublic(ciudad: unknown) {
    const rows = await this.db
      .select()
      .from(reportesDanos)
      .where(eq(reportesDanos.ciudad, str(ciudad) || 'manizales'))
      .orderBy(desc(reportesDanos.createdAt));
    return rows.map((r) => this.serializePublic(r));
  }

  async byRadicado(radicado: unknown) {
    const rows = await this.db
      .select()
      .from(reportesDanos)
      .where(eq(reportesDanos.radicado, str(radicado)))
      .limit(1);
    if (!rows.length) throw new NotFoundException({ error: 'Reporte no encontrado' });
    return this.serializePublic(rows[0]);
  }

  async get(id: number) {
    const rows = await this.db.select().from(reportesDanos).where(eq(reportesDanos.id, id)).limit(1);
    return rows.length ? rows[0] : null;
  }

  async listAdmin(ciudad: unknown) {
    const rows = await this.db
      .select()
      .from(reportesDanos)
      .where(eq(reportesDanos.ciudad, str(ciudad) || 'manizales'))
      .orderBy(desc(reportesDanos.createdAt));
    return rows.map((r) => this.serializeAdmin(r));
  }

  async create(b: DanoBody) {
    const ciudad = str(b.ciudad) || 'manizales';
    if (!CIUDADES_REPORTE_DANOS.includes(ciudad)) {
      throw new BadRequestException({
        error: 'Esta ciudad aún no tiene convenio para reportes de daños estructurales.',
      });
    }
    const tipoInmueble = str(b.tipo_inmueble);
    const direccion = str(b.direccion);
    const lat = toNum(b.lat);
    const lng = toNum(b.lng);
    if (!tipoInmueble) throw new BadRequestException({ error: 'Falta el tipo de inmueble' });
    if (!direccion) throw new BadRequestException({ error: 'Falta la dirección' });
    if (lat === null || lng === null) throw new BadRequestException({ error: 'Faltan las coordenadas' });

    const existentes = await this.db.select({ radicado: reportesDanos.radicado }).from(reportesDanos);
    const radicado = genRadicado(existentes.map((r) => r.radicado));
    const [d] = await this.db
      .insert(reportesDanos)
      .values({
        radicado,
        ciudad,
        tipoInmueble,
        direccion,
        lat: String(lat),
        lng: String(lng),
        habitado: b.habitado === 'no' || b.habitado === 'evacuado' ? b.habitado : 'si',
        nivelPercibido:
          b.nivel_percibido === 'leve' ||
          b.nivel_percibido === 'severo' ||
          b.nivel_percibido === 'colapso'
            ? b.nivel_percibido
            : 'moderado',
        descripcion: str(b.descripcion) || null,
        imagen: str(b.imagen) || null,
        nombreReporta: str(b.nombre_reportante),
        telefonoReporta: str(b.telefono_reportante),
        cedulaReporta: str(b.cedula) || null,
        estado: 'pendiente',
        fecha: today(),
        visitorId: str(b.visitor_id)?.slice(0, 64) || null,
      })
      .returning();
    emitAppEvent({
      type: 'dano',
      mensaje: `Nuevo reporte de daños: ${tipoInmueble}`,
      ciudad,
      item: { ...this.serializePublic(d), radicado },
      at: new Date().toISOString(),
    });
    notifyReporteWhatsapp(b.telefono_reportante, 'reporte de daños', radicado, `Detalle: ${tipoInmueble} — ${direccion}`);
    await registrarAuditoria(this.db, {
      tabla: 'reportes_danos', registroId: d.id, accion: 'create',
      datosNuevos: this.serializePublic(d), autor: 'usuario', codigo: radicado,
      visitorId: str(b.visitor_id),
    });
    return { ...this.serializePublic(d), radicado };
  }

  /** Edición pública con el número de radicado (el código del reportante). */
  async updatePublic(id: number, b: DanoBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Reporte no encontrado' });
    const esAdminEdit = isAdminEdit(b.radicado);
    const radOk = !!str(b.radicado) && !!row.radicado && str(b.radicado).toUpperCase() === row.radicado.toUpperCase();
    if (!esAdminEdit && !radOk) {
      throw new ForbiddenException({ error: 'Número de radicado incorrecto' });
    }
    const previo = this.serializePublic(row);
    const set: Partial<typeof reportesDanos.$inferInsert> = {};
    if (b.direccion !== undefined) set.direccion = str(b.direccion);
    if (b.descripcion !== undefined) set.descripcion = str(b.descripcion) || null;
    if (b.imagen !== undefined) set.imagen = str(b.imagen) || null;
    if (b.telefono_reportante !== undefined) set.telefonoReporta = str(b.telefono_reportante);
    if (b.habitado !== undefined) set.habitado = b.habitado === 'no' || b.habitado === 'evacuado' ? b.habitado : 'si';
    if (b.estado !== undefined) {
      if (!['pendiente', 'visita_programada', 'visitado'].includes(b.estado)) {
        throw new BadRequestException({ error: 'Estado inválido' });
      }
      set.estado = b.estado;
    }
    const [d] = await this.db.update(reportesDanos).set(set).where(eq(reportesDanos.id, id)).returning();
    const nuevo = this.serializePublic(d);
    await registrarAuditoria(this.db, {
      tabla: 'reportes_danos', registroId: id, accion: 'update',
      datosPrevios: previo, datosNuevos: nuevo, autor: esAdminEdit ? 'admin' : 'usuario', codigo: esAdminEdit ? 'ADMIN_EDIT' : str(b.radicado),
    });
    return nuevo;
  }

  async updateAdmin(id: number, b: DanoBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Reporte no encontrado' });
    const previo = this.serializeAdmin(row);
    const set: Partial<typeof reportesDanos.$inferInsert> = {};
    if (b.estado !== undefined) {
      if (!['pendiente', 'visita_programada', 'visitado'].includes(b.estado)) {
        throw new BadRequestException({ error: 'Estado inválido' });
      }
      set.estado = b.estado;
    }
    if (b.fecha_visita !== undefined) set.fechaVisita = toDate(b.fecha_visita);
    if (b.resultado_visita !== undefined) set.resultadoVisita = str(b.resultado_visita) || null;
    if (b.notas_admin !== undefined) set.notasAdmin = str(b.notas_admin) || null;
    const [d] = await this.db.update(reportesDanos).set(set).where(eq(reportesDanos.id, id)).returning();
    const nuevo = this.serializeAdmin(d);
    await registrarAuditoria(this.db, {
      tabla: 'reportes_danos', registroId: id, accion: 'update',
      datosPrevios: previo, datosNuevos: nuevo, autor: 'admin', codigo: 'llave-admin',
    });
    return nuevo;
  }

  async remove(id: number) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Reporte no encontrado' });
    await this.db.delete(reportesDanos).where(eq(reportesDanos.id, id));
    await registrarAuditoria(this.db, {
      tabla: 'reportes_danos', registroId: id, accion: 'delete',
      datosPrevios: this.serializeAdmin(row), autor: 'admin', codigo: 'llave-admin',
    });
    return { ok: true };
  }

  /** Borrado público con el número de radicado. */
  async removePublic(id: number, radicado: unknown) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Reporte no encontrado' });
    const esAdminEdit = isAdminEdit(radicado);
    const radOk = !!str(radicado) && !!row.radicado && str(radicado).toUpperCase() === row.radicado.toUpperCase();
    if (!esAdminEdit && !radOk) {
      throw new ForbiddenException({ error: 'Número de radicado incorrecto' });
    }
    await this.db.delete(reportesDanos).where(eq(reportesDanos.id, id));
    await registrarAuditoria(this.db, {
      tabla: 'reportes_danos', registroId: id, accion: 'delete',
      datosPrevios: this.serializePublic(row), autor: esAdminEdit ? 'admin' : 'usuario', codigo: esAdminEdit ? 'ADMIN_EDIT' : str(radicado),
    });
    return { ok: true };
  }

  async exportCsv(ciudad: unknown): Promise<string> {
    const rows = await this.db
      .select()
      .from(reportesDanos)
      .where(eq(reportesDanos.ciudad, str(ciudad) || 'manizales'))
      .orderBy(desc(reportesDanos.createdAt));
    const header = [
      'radicado', 'fecha', 'ciudad', 'tipo_inmueble', 'direccion', 'lat', 'lng', 'habitado',
      'nivel_percibido', 'descripcion', 'imagen', 'nombre_reportante', 'telefono_reportante',
      'cedula', 'estado', 'fecha_visita', 'resultado_visita', 'notas_admin',
    ];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const d of rows) {
      lines.push(
        [
          d.radicado, asDate(d.fecha), d.ciudad, d.tipoInmueble, d.direccion, asNum(d.lat), asNum(d.lng),
          d.habitado, d.nivelPercibido, d.descripcion, d.imagen, d.nombreReporta, d.telefonoReporta,
          d.cedulaReporta, d.estado, d.fechaVisita, d.resultadoVisita, d.notasAdmin,
        ]
          .map(esc)
          .join(','),
      );
    }
    return lines.join('\n');
  }
}

@Controller('danos')
export class DanosController {
  constructor(private readonly svc: DanosService) {}

  @Get()
  listPublic(@Query('ciudad') ciudad?: string) {
    return this.svc.listPublic(ciudad ?? 'manizales');
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  listAdmin(@Query('ciudad') ciudad?: string) {
    return this.svc.listAdmin(ciudad ?? 'manizales');
  }

  @Get('export')
  @UseGuards(AdminGuard)
  async export(@Query('ciudad') ciudad: string | undefined, @Res() res: Response) {
    const csv = await this.svc.exportCsv(ciudad ?? 'manizales');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reportes_danos.csv"');
    res.send('\ufeff' + csv);
  }

  @Get(':radicado')
  byRadicado(@Param('radicado') radicado: string) {
    return this.svc.byRadicado(radicado);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Body() b: DanoBody) {
    return this.svc.create(b);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() b: DanoBody) {
    return this.svc.updateAdmin(toInt(id), b);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.svc.remove(toInt(id));
  }

  /** Edición pública con el número de radicado. */
  @Post(':id/editar')
  updatePublic(@Param('id') id: string, @Body() b: DanoBody) {
    return this.svc.updatePublic(toInt(id), b);
  }

  /** Borrado público con el número de radicado. */
  @Post(':id/eliminar')
  removePublic(@Param('id') id: string, @Body() b: { radicado?: string }) {
    return this.svc.removePublic(toInt(id), b?.radicado);
  }
}

@Module({
  controllers: [DanosController],
  providers: [DanosService],
})
export class DanosModule {}
