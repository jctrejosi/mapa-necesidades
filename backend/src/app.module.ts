import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './common/throttler.guard';
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
import { AuditoriaModule } from './audit/audit.module';
import { PuntosApoyoModule } from './puntos-apoyo/puntos-apoyo.module';
import { EventosModule } from './eventos/eventos.module';
import { VoluntariosModule } from './voluntarios/voluntarios.module';
import { BuscarModule } from './buscar/buscar.module';
import { ClicsModule } from './clics/clics.module';

@Module({
  imports: [
    // Límites por IP: global alto (anti-inundación; el mapa recarga ~70
    // requests por ciclo de 30s y cada evento SSE dispara un refresh) y
    // 10/min en los endpoints sensibles (ver @Throttle en cada controlador).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 3000 }]),
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
    AuditoriaModule,
    PuntosApoyoModule,
    EventosModule,
    VoluntariosModule,
    BuscarModule,
    ClicsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
