import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { DB, Db } from '../db/database';
import {
  contactos,
  eventos,
  necesidades,
  mascotasPerdidas,
  ofrecimientos,
  puntosApoyo,
  sectores,
  viviendas,
} from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { genPin, str, toInt } from '../common/util';

// Tablas que tienen PIN de edición (whitelist para ver/restablecer códigos)
const PIN_TABLES = ['necesidades', 'ofrecimientos', 'mascotas_perdidas', 'viviendas', 'eventos', 'puntos_apoyo'] as const;
type PinTable = (typeof PIN_TABLES)[number];

@Injectable()
class ExportService {
  constructor(@Inject(DB) private db: Db) {}

  /** CSV general de sectores + necesidades para coordinación. */
  async sectoresCsv(): Promise<string> {
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const sects = await this.db.select().from(sectores);
    const conts = await this.db.select().from(contactos);
    const needs = await this.db.select().from(necesidades);

    const lines = [
      ['id', 'ciudad', 'nombre', 'barrio', 'lat', 'lng', 'descripcion', 'nivel_afectacion', 'estado', 'contactos', 'necesidades'].join(','),
    ];
    for (const s of sects) {
      const nContactos = conts.filter((c) => c.sectorId === s.id).length;
      const nNecesidades = needs.filter((n) => n.sectorId === s.id).length;
      lines.push(
        [
          s.id, s.ciudad, s.nombre, s.barrio, s.lat, s.lng, s.descripcion,
          s.nivelAfectacion, s.estado, nContactos, nNecesidades,
        ]
          .map(esc)
          .join(','),
      );
    }
    return lines.join('\n');
  }

  async verPin(tabla: string, id: number): Promise<{ pin: string | null }> {
    const t = tabla as PinTable;
    if (!PIN_TABLES.includes(t)) return { pin: null };
    if (t === 'necesidades') {
      const rows = await this.db.select({ pin: necesidades.pin }).from(necesidades).where(eq(necesidades.id, id)).limit(1);
      return { pin: rows[0]?.pin ?? null };
    }
    if (t === 'ofrecimientos') {
      const rows = await this.db.select({ pin: ofrecimientos.pin }).from(ofrecimientos).where(eq(ofrecimientos.id, id)).limit(1);
      return { pin: rows[0]?.pin ?? null };
    }
    if (t === 'mascotas_perdidas') {
      const rows = await this.db.select({ pin: mascotasPerdidas.pin }).from(mascotasPerdidas).where(eq(mascotasPerdidas.id, id)).limit(1);
      return { pin: rows[0]?.pin ?? null };
    }
    if (t === 'eventos') {
      const rows = await this.db.select({ pin: eventos.pin }).from(eventos).where(eq(eventos.id, id)).limit(1);
      return { pin: rows[0]?.pin ?? null };
    }
    if (t === 'puntos_apoyo') {
      const rows = await this.db.select({ pin: puntosApoyo.pin }).from(puntosApoyo).where(eq(puntosApoyo.id, id)).limit(1);
      return { pin: rows[0]?.pin ?? null };
    }
    const rows = await this.db.select({ pin: viviendas.pin }).from(viviendas).where(eq(viviendas.id, id)).limit(1);
    return { pin: rows[0]?.pin ?? null };
  }

  async restablecerPin(tabla: string, id: number): Promise<{ pin: string }> {
    const t = tabla as PinTable;
    if (!PIN_TABLES.includes(t)) return { pin: '' };
    const pin = genPin([(await this.verPin(t, id)).pin]);
    if (t === 'necesidades') await this.db.update(necesidades).set({ pin }).where(eq(necesidades.id, id));
    if (t === 'ofrecimientos') await this.db.update(ofrecimientos).set({ pin }).where(eq(ofrecimientos.id, id));
    if (t === 'mascotas_perdidas') await this.db.update(mascotasPerdidas).set({ pin }).where(eq(mascotasPerdidas.id, id));
    if (t === 'eventos') await this.db.update(eventos).set({ pin }).where(eq(eventos.id, id));
    if (t === 'puntos_apoyo') await this.db.update(puntosApoyo).set({ pin }).where(eq(puntosApoyo.id, id));
    if (t === 'viviendas') await this.db.update(viviendas).set({ pin }).where(eq(viviendas.id, id));
    return { pin };
  }
}

@Controller('admin')
export class ExportController {
  constructor(private readonly svc: ExportService) {}

  @Get('export')
  @UseGuards(AdminGuard)
  async export(@Res() res: Response) {
    const csv = await this.svc.sectoresCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sectores.csv"');
    res.send('\ufeff' + csv);
  }

  @Get('pins/:tabla/:id')
  @UseGuards(AdminGuard)
  verPin(@Param('tabla') tabla: string, @Param('id') id: string) {
    return this.svc.verPin(str(tabla), toInt(id));
  }

  @Post('pins/:tabla/:id/reset')
  @UseGuards(AdminGuard)
  restablecer(@Param('tabla') tabla: string, @Param('id') id: string, @Body() _b: unknown) {
    return this.svc.restablecerPin(str(tabla), toInt(id));
  }
}

@Module({
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
