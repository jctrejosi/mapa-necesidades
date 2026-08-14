import { Controller, Get, Inject, Injectable, Module, Query } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import { DB, Db } from '../db/database';
import { necesidades, ofrecimientos, sectores } from '../db/schema';
import { str } from '../common/util';

@Injectable()
class StatsService {
  constructor(@Inject(DB) private db: Db) {}

  async stats(ciudad: unknown) {
    const c = str(ciudad) || 'manizales';

    const sectorRows = await this.db.select().from(sectores).where(eq(sectores.ciudad, c));
    const ids = sectorRows.map((r) => r.id);

    const totalSectores = sectorRows.length;
    const sectoresActivos = sectorRows.filter((s) => s.estado === 'activo').length;

    let necesidadesRows: (typeof necesidades.$inferSelect)[] = [];
    if (ids.length) {
      const rows = await this.db.select().from(necesidades);
      const bySector = new Set(ids);
      necesidadesRows = rows.filter((n) => bySector.has(n.sectorId));
    }

    const ofrecimientosRows = await this.db
      .select()
      .from(ofrecimientos)
      .where(eq(ofrecimientos.ciudad, c));

    const atendidas = necesidadesRows.filter((n) => n.estado === 'atendida').length;
    const enProceso = necesidadesRows.filter(
      (n) => n.estado === 'requiere' && n.responsableNombre,
    ).length;
    const sinAsignar = necesidadesRows.filter(
      (n) => n.estado === 'requiere' && !n.responsableNombre,
    ).length;

    return {
      ciudad: c,
      total_sectores: totalSectores,
      sectores_activos: sectoresActivos,
      total_necesidades: necesidadesRows.length,
      atendidas,
      en_proceso: enProceso,
      sin_asignar: sinAsignar,
      total_ofrecimientos: ofrecimientosRows.length,
      ofrecimientos_disponibles: ofrecimientosRows.filter(
        (o) => o.estado === 'disponible' && !o.reservadoPorNombre,
      ).length,
    };
  }
}

@Controller('stats')
export class StatsController {
  constructor(private readonly svc: StatsService) {}

  @Get()
  stats(@Query('ciudad') ciudad?: string) {
    return this.svc.stats(ciudad ?? 'manizales');
  }
}

@Module({
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
