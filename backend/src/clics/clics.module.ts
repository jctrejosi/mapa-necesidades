import {
  BadRequestException,
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
import { count, desc, sql } from 'drizzle-orm';
import { DB, Db } from '../db/database';
import { clics } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { str, toInt } from '../common/util';

type ClicBody = {
  enlace?: string;
  visitor_id?: string;
};

/** IP real del cliente (detrás de nginx / proxy de Render). */
function clientIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim().slice(0, 45);
  const xri = req.headers['x-real-ip'];
  if (typeof xri === 'string' && xri.trim()) return xri.trim().slice(0, 45);
  return (req.ip || req.socket?.remoteAddress || '').replace('::ffff:', '').slice(0, 45) || null;
}

/** ¿La IP es localhost/loopback? Estos clics no deben registrarse ni contarse. */
function isLoopback(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const p = ip.replace('::ffff:', '').toLowerCase();
  return p === 'localhost' || p === '::1' || p === '0.0.0.0' || p.startsWith('127.');
}

/** Filtro SQL: excluye los clics con IP de loopback (incluye filas viejas). */
const noLoopback = sql`(
  ${clics.ip} IS NULL OR (
    ${clics.ip} NOT IN ('127.0.0.1', '::1', '0.0.0.0', 'localhost')
    AND ${clics.ip} NOT LIKE '127.%'
    AND ${clics.ip} NOT LIKE '::ffff:127.%'
  )
)`;

@Injectable()
class ClicsService {
  constructor(@Inject(DB) private db: Db) {}

  /** Registra un clic en un enlace (p. ej. 'dsi') con la info de red disponible. */
  async create(req: Request, b: ClicBody) {
    const enlace = str(b.enlace);
    if (!enlace) throw new BadRequestException({ error: 'Falta el enlace' });
    const ip = clientIp(req);
    if (isLoopback(ip)) return { ok: true, skipped: true };
    const [c] = await this.db
      .insert(clics)
      .values({
        enlace: enlace.slice(0, 50),
        visitorId: str(b.visitor_id)?.slice(0, 64) || null,
        ip,
        userAgent: str(req.headers['user-agent'])?.slice(0, 2000) || null,
        referrer: str(req.headers['referer'] || req.headers['referrer'])?.slice(0, 2000) || null,
      })
      .returning();
    return { ok: true, id: c.id };
  }

  async list(limit: number) {
    return this.db
      .select()
      .from(clics)
      .where(noLoopback)
      .orderBy(desc(clics.createdAt))
      .limit(Math.min(Math.max(limit, 1), 500));
  }

  /** Contadores agrupados por enlace (ej. cuántos clics lleva DSI). */
  async resumen() {
    const rows = await this.db
      .select({ enlace: clics.enlace, total: count() })
      .from(clics)
      .where(noLoopback)
      .groupBy(clics.enlace)
      .orderBy(desc(count()));
    const total = rows.reduce((sum, r) => sum + Number(r.total), 0);
    return { total, porEnlace: rows.map((r) => ({ enlace: r.enlace, total: Number(r.total) })) };
  }
}

@Controller('clics')
export class ClicsController {
  constructor(private readonly svc: ClicsService) {}

  @Post()
  create(@Req() req: Request, @Body() b: ClicBody) {
    return this.svc.create(req, b);
  }

  @Get('admin/resumen')
  @UseGuards(AdminGuard)
  resumen() {
    return this.svc.resumen();
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  list(@Query('limit') limit?: string) {
    return this.svc.list(toInt(limit, 50));
  }
}

@Module({
  controllers: [ClicsController],
  providers: [ClicsService],
})
export class ClicsModule {}
