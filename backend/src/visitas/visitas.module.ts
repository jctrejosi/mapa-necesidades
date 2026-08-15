import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { desc } from 'drizzle-orm';
import { DB, Db } from '../db/database';
import { visitas } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { str, toInt } from '../common/util';

type VisitaBody = {
  visitor_id?: string;
  path?: string;
  ciudad?: string;
  lang?: string;
};

/** IP real del cliente (detrás de nginx / proxy de Render). */
function clientIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim().slice(0, 45);
  const xri = req.headers['x-real-ip'];
  if (typeof xri === 'string' && xri.trim()) return xri.trim().slice(0, 45);
  return (req.ip || req.socket?.remoteAddress || '').replace('::ffff:', '').slice(0, 45) || null;
}

@Injectable()
class VisitasService {
  constructor(@Inject(DB) private db: Db) {}

  /** Registra una visita con la info disponible sin permisos (IP, UA, referrer...). */
  async create(req: Request, b: VisitaBody) {
    const [v] = await this.db
      .insert(visitas)
      .values({
        visitorId: str(b.visitor_id)?.slice(0, 64) || 'anon',
        ip: clientIp(req),
        userAgent: str(req.headers['user-agent'])?.slice(0, 2000) || null,
        referrer: str(req.headers['referer'] || req.headers['referrer'])?.slice(0, 2000) || null,
        path: str(b.path)?.slice(0, 200) || null,
        ciudad: str(b.ciudad)?.slice(0, 50) || null,
        lang: str(b.lang)?.slice(0, 20) || null,
      })
      .returning();
    return { ok: true, id: v.id };
  }

  async list(limit: number) {
    const rows = await this.db
      .select()
      .from(visitas)
      .orderBy(desc(visitas.createdAt))
      .limit(Math.min(Math.max(limit, 1), 200));
    return rows;
  }
}

@Controller('visitas')
export class VisitasController {
  constructor(private readonly svc: VisitasService) {}

  @Post()
  create(@Req() req: Request, @Body() b: VisitaBody) {
    return this.svc.create(req, b);
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  list(@Query('limit') limit?: string) {
    return this.svc.list(toInt(limit, 50));
  }
}

@Module({
  controllers: [VisitasController],
  providers: [VisitasService],
})
export class VisitasModule {}
