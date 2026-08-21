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
import { desc, sql, count, countDistinct, eq } from 'drizzle-orm';
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

/** ¿La IP es localhost/loopback? Estas visitas no deben registrarse ni contarse nunca. */
function isLoopback(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const p = ip.replace('::ffff:', '').toLowerCase();
  return p === 'localhost' || p === '::1' || p === '0.0.0.0' || p.startsWith('127.');
}

/** Filtro SQL: excluye las visitas con IP de loopback (incluye filas viejas). */
const noLoopback = sql`(
  ${visitas.ip} IS NULL OR (
    ${visitas.ip} NOT IN ('127.0.0.1', '::1', '0.0.0.0', 'localhost')
    AND ${visitas.ip} NOT LIKE '127.%'
    AND ${visitas.ip} NOT LIKE '::ffff:127.%'
  )
)`;

/** Caché en memoria de IP → lugar ya resuelto (evita llamar al geolocalizador repetido). */
const geoCache = new Map<string, string | null>();

/**
 * Geolocaliza una IP pública y devuelve "Ciudad, Departamento" (o null si no
 * se puede resolver). Usa ipwho.is (gratuito, sin API key, HTTPS).
 * Con timeout: nunca debe frenar el registro de la visita.
 */
async function geolocate(ip: string): Promise<string | null> {
  if (geoCache.has(ip)) return geoCache.get(ip) ?? null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: ctrl.signal,
      headers: { accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`geoloc http ${res.status}`);
    const d = await res.json();
    if (!d || d.success === false) throw new Error('geoloc sin datos');
    const city = d.city || '';
    const region = d.region || d.country || '';
    const lugar = [city, region].filter(Boolean).join(', ').slice(0, 50) || null;
    geoCache.set(ip, lugar);
    return lugar;
  } catch {
    geoCache.set(ip, null); // no reintentar por IP en este ciclo de vida
    return null;
  }
}

@Injectable()
class VisitasService {
  constructor(@Inject(DB) private db: Db) {}

  /** Registra una visita con la info disponible sin permisos (IP, UA, referrer...). */
  async create(req: Request, b: VisitaBody) {
    const ip = clientIp(req);
    // Las visitas desde localhost/loopback no se registran (y por tanto no cuentan nunca).
    if (isLoopback(ip)) return { ok: true, skipped: true };
    const [v] = await this.db
      .insert(visitas)
      .values({
        visitorId: str(b.visitor_id)?.slice(0, 64) || 'anon',
        ip,
        userAgent: str(req.headers['user-agent'])?.slice(0, 2000) || null,
        referrer: str(req.headers['referer'] || req.headers['referrer'])?.slice(0, 2000) || null,
        path: str(b.path)?.slice(0, 200) || null,
        ciudad: str(b.ciudad)?.slice(0, 50) || null,
        lang: str(b.lang)?.slice(0, 20) || null,
      })
      .returning();
    // Lugar REAL del visitante (por IP) en segundo plano: la respuesta no se
    // bloquea y, si el geolocalizador falla, la fila conserva lo enviado por
    // el cliente (o null).
    if (ip) {
      geolocate(ip)
        .then((lugar) => {
          if (!lugar) return;
          return this.db
            .update(visitas)
            .set({ ciudad: lugar })
            .where(eq(visitas.id, v.id))
            .catch(() => { /* noop */ });
        })
        .catch(() => { /* geolocalización opcional */ });
    }
    return { ok: true, id: v.id };
  }

  async list(limit: number) {
    const rows = await this.db
      .select()
      .from(visitas)
      .where(noLoopback)
      .orderBy(desc(visitas.createdAt))
      .limit(Math.min(Math.max(limit, 1), 200));
    return rows;
  }

  /** Contadores para el panel admin: total, de hoy (día calendario) y visitantes únicos. */
  async resumen() {
    const rows = await this.db
      .select({
        total: count(),
        hoy: count(sql`CASE WHEN ${visitas.createdAt} >= date_trunc('day', now()) THEN 1 END`),
        unicos: countDistinct(visitas.visitorId),
      })
      .from(visitas)
      .where(noLoopback);
    const r = rows[0] ?? { total: 0, hoy: 0, unicos: 0 };
    const last = await this.db
      .select({ at: visitas.createdAt })
      .from(visitas)
      .where(noLoopback)
      .orderBy(desc(visitas.createdAt))
      .limit(1);
    return {
      total: Number(r.total),
      hoy: Number(r.hoy),
      unicos: Number(r.unicos),
      ultima_visita: last[0]?.at?.toISOString() ?? null,
    };
  }
}

@Controller('visitas')
export class VisitasController {
  constructor(private readonly svc: VisitasService) {}

  @Post()
  create(@Req() req: Request, @Body() b: VisitaBody) {
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
  controllers: [VisitasController],
  providers: [VisitasService],
})
export class VisitasModule {}
