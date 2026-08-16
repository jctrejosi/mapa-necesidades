import { Controller, Get, Inject, Injectable, Module, Query, UseGuards } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import { DB, Db } from '../db/database';
import { auditoria } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { toInt } from '../common/util';

@Injectable()
class AuditoriaService {
  constructor(@Inject(DB) private db: Db) {}

  async list(limit: number, tabla?: string) {
    const rows = await this.db
      .select()
      .from(auditoria)
      .orderBy(desc(auditoria.createdAt))
      .limit(Math.min(Math.max(limit, 1), 300));
    if (tabla) return rows.filter((r) => r.tabla === tabla);
    return rows;
  }
}

@Controller('auditoria')
@UseGuards(AdminGuard)
export class AuditoriaController {
  constructor(private readonly svc: AuditoriaService) {}

  @Get()
  list(@Query('limit') limit?: string, @Query('tabla') tabla?: string) {
    return this.svc.list(toInt(limit, 100), tabla);
  }
}

@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
})
export class AuditoriaModule {}
