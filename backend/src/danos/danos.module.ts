import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { DB, Db } from '../db/database';
import { reportesDanos } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { emitAppEvent } from '../events/events.module';
import { asDate, asNum } from '../common/serialize';
import { genRadicado, str, toDate, toInt, toNum, today } from '../common/util';
import { notifyReporteWhatsapp } from '../common/whatsapp';

// Ciudades con convenio para visita técnica (coincide con la app anterior)
const CIUDADES_REPORTE_DANOS = ['manizales'];

type DanoBody = {
  ciudad?: string;
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

  /** Campos públicos (las notas internas solo las ve el admin). */
  private serializePublic(d: typeof reportesDanos.$inferSelect) {
    return {
      id: d.id,
      radicado: d.radicado,
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
    };
  }

  private serializeAdmin(d: typeof reportesDanos.$inferSelect) {
    return {
      ...this.serializePublic(d),
      cedula: d.cedulaReporta,
      resultado_visita: d.resultadoVisita,
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
    return { ...this.serializePublic(d), radicado };
  }

  async updateAdmin(id: number, b: DanoBody) {
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
    return this.serializeAdmin(d);
  }

  async remove(id: number) {
    await this.db.delete(reportesDanos).where(eq(reportesDanos.id, id));
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
}

@Module({
  controllers: [DanosController],
  providers: [DanosService],
})
export class DanosModule {}
