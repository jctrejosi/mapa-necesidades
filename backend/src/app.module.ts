import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { SectoresModule } from './sectores/sectores.module';
import { NecesidadesModule } from './necesidades/necesidades.module';
import { OfrecimientosModule } from './ofrecimientos/ofrecimientos.module';
import { MascotasModule } from './mascotas/mascotas.module';
import { CentrosModule } from './centros/centros.module';
import { NoticiasModule } from './noticias/noticias.module';
import { ViviendasModule } from './viviendas/viviendas.module';
import { DanosModule } from './danos/danos.module';
import { StatsModule } from './stats/stats.module';
import { UploadsModule } from './uploads/uploads.module';
import { ExportModule } from './export/export.module';
import { BotModule } from './bot/bot.module';
import { VisitasModule } from './visitas/visitas.module';

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
    AuthModule,
    SectoresModule,
    NecesidadesModule,
    OfrecimientosModule,
    MascotasModule,
    CentrosModule,
    NoticiasModule,
    ViviendasModule,
    DanosModule,
    StatsModule,
    UploadsModule,
    ExportModule,
    BotModule,
    VisitasModule,
  ],
})
export class AppModule {}
