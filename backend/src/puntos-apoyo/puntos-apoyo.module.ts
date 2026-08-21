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
import type { Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { Throttle } from '@nestjs/throttler';
import { DB, Db } from '../db/database';
import { eventos, necesidades, puntosApoyo, sectores } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { emitAppEvent } from '../events/events.module';
import { asDate, asNum } from '../common/serialize';
import { checkEditCode, genPin, isAdminEdit, str, toInt, toNum } from '../common/util';
import { registrarAuditoria } from '../common/audit';

type PuntoApoyoBody = {
  pin?: string;
  ciudad?: string;
  nombre?: string;
  tipo?: string;
  direccion?: string;
  telefono?: string;
  imagen?: string;
  color?: string;
  lat?: unknown;
  lng?: unknown;
  visitor_id?: string;
};

/** Acepta colores hex (#RGB o #RRGGBB); si no es válido usa el azul por defecto. */
function safeColor(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : '#003893';
}

/** Escapa texto para incrustarlo en HTML (evita inyección desde descripciones). */
function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
class PuntosApoyoService {
  constructor(@Inject(DB) private db: Db) {}

  private serialize(p: typeof puntosApoyo.$inferSelect) {
    return {
      id: p.id,
      ciudad: p.ciudad,
      nombre: p.nombre,
      tipo: p.tipo,
      direccion: p.direccion,
      telefono: p.telefono ?? '',
      imagen: p.imagen ?? '',
      color: p.color,
      lat: asNum(p.lat),
      lng: asNum(p.lng),
      // El PIN no viaja en los listados: se entrega solo al crear.
    };
  }

  async list(ciudad: unknown) {
    const rows = await this.db
      .select()
      .from(puntosApoyo)
      .where(eq(puntosApoyo.ciudad, str(ciudad) || 'manizales'))
      .orderBy(desc(puntosApoyo.createdAt));
    return rows.map((r) => this.serialize(r));
  }

  async get(id: number) {
    const rows = await this.db.select().from(puntosApoyo).where(eq(puntosApoyo.id, id)).limit(1);
    return rows.length ? rows[0] : null;
  }

  async create(b: PuntoApoyoBody) {
    const nombre = str(b.nombre);
    const direccion = str(b.direccion);
    const lat = toNum(b.lat);
    const lng = toNum(b.lng);
    if (!nombre) throw new BadRequestException({ error: 'Falta el nombre del punto de apoyo' });
    if (!direccion) throw new BadRequestException({ error: 'Falta la dirección' });
    if (lat === null || lng === null) throw new BadRequestException({ error: 'Faltan las coordenadas (busca la dirección en el mapa)' });

    const existentes = await this.db.select({ pin: puntosApoyo.pin }).from(puntosApoyo);
    const pin = genPin(existentes.map((r) => r.pin));

    const [p] = await this.db
      .insert(puntosApoyo)
      .values({
        pin,
        ciudad: str(b.ciudad) || 'manizales',
        nombre,
        tipo: str(b.tipo) || 'Otro',
        direccion,
        telefono: str(b.telefono) || null,
        imagen: str(b.imagen) || null,
        color: safeColor(b.color),
        lat: String(lat),
        lng: String(lng),
        visitorId: str(b.visitor_id)?.slice(0, 64) || null,
      })
      .returning();

    emitAppEvent({
      type: 'punto_apoyo',
      mensaje: `Nuevo punto de apoyo: ${nombre}`,
      ciudad: p.ciudad,
      item: this.serialize(p),
      at: new Date().toISOString(),
    });
    await registrarAuditoria(this.db, {
      tabla: 'puntos_apoyo', registroId: p.id, accion: 'create',
      datosNuevos: this.serialize(p), autor: 'usuario', codigo: pin,
      visitorId: str(b.visitor_id),
    });
    return { ...this.serialize(p), pin };
  }

  async updatePublic(id: number, b: PuntoApoyoBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Punto de apoyo no encontrado' });
    const esAdminEdit = isAdminEdit(b.pin);
    if (!checkEditCode(row.pin, b.pin)) {
      throw new ForbiddenException({ error: 'Código de edición incorrecto' });
    }
    const previo = this.serialize(row);
    const nuevo = await this.patch(id, b);
    await registrarAuditoria(this.db, {
      tabla: 'puntos_apoyo', registroId: id, accion: 'update',
      datosPrevios: previo, datosNuevos: nuevo, autor: esAdminEdit ? 'admin' : 'usuario', codigo: esAdminEdit ? 'ADMIN_EDIT' : str(b.pin),
    });
    return nuevo;
  }

  async adminUpdate(id: number, b: PuntoApoyoBody) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Punto de apoyo no encontrado' });
    const previo = this.serialize(row);
    const nuevo = await this.patch(id, b);
    await registrarAuditoria(this.db, {
      tabla: 'puntos_apoyo', registroId: id, accion: 'update',
      datosPrevios: previo, datosNuevos: nuevo, autor: 'admin', codigo: 'llave-admin',
    });
    return nuevo;
  }

  private async patch(id: number, b: PuntoApoyoBody) {
    const set: Partial<typeof puntosApoyo.$inferInsert> = {};
    if (b.ciudad !== undefined) set.ciudad = str(b.ciudad) || 'manizales';
    if (b.nombre !== undefined) set.nombre = str(b.nombre);
    if (b.tipo !== undefined) set.tipo = str(b.tipo) || 'Otro';
    if (b.direccion !== undefined) set.direccion = str(b.direccion);
    if (b.telefono !== undefined) set.telefono = str(b.telefono) || null;
    if (b.imagen !== undefined) set.imagen = str(b.imagen) || null;
    if (b.color !== undefined) set.color = safeColor(b.color);
    if (b.lat !== undefined) {
      const lat = toNum(b.lat);
      if (lat === null) throw new BadRequestException({ error: 'Latitud inválida' });
      set.lat = String(lat);
    }
    if (b.lng !== undefined) {
      const lng = toNum(b.lng);
      if (lng === null) throw new BadRequestException({ error: 'Longitud inválida' });
      set.lng = String(lng);
    }
    const [p] = await this.db.update(puntosApoyo).set(set).where(eq(puntosApoyo.id, id)).returning();
    return this.serialize(p);
  }

  async remove(id: number) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Punto de apoyo no encontrado' });
    await this.db.delete(puntosApoyo).where(eq(puntosApoyo.id, id));
    await registrarAuditoria(this.db, {
      tabla: 'puntos_apoyo', registroId: id, accion: 'delete',
      datosPrevios: this.serialize(row), autor: 'admin', codigo: 'llave-admin',
    });
    return { ok: true };
  }

  /** Borrado público con el PIN que se le dio al usuario al publicar. */
  async removePublic(id: number, pin: unknown) {
    const row = await this.get(id);
    if (!row) throw new NotFoundException({ error: 'Punto de apoyo no encontrado' });
    const esAdminEdit = isAdminEdit(pin);
    if (!checkEditCode(row.pin, pin)) {
      throw new ForbiddenException({ error: 'Código de edición incorrecto' });
    }
    await this.db.delete(puntosApoyo).where(eq(puntosApoyo.id, id));
    await registrarAuditoria(this.db, {
      tabla: 'puntos_apoyo', registroId: id, accion: 'delete',
      datosPrevios: this.serialize(row), autor: esAdminEdit ? 'admin' : 'usuario', codigo: esAdminEdit ? 'ADMIN_EDIT' : str(pin),
    });
    return { ok: true };
  }

  /**
   * Genera el INFORME descargable de un punto de apoyo: encabezado con imagen
   * y nombre, métricas de las necesidades asignadas (pendientes / en proceso /
   * atendidas), el detalle de cada una y sus eventos. Devuelve HTML autocontenido
   * (se imprime a PDF desde el navegador).
   */
  async informeHtml(id: number): Promise<string> {
    const p = await this.get(id);
    if (!p) throw new NotFoundException({ error: 'Punto de apoyo no encontrado' });

    const needs = await this.db
      .select({ n: necesidades, s: sectores })
      .from(necesidades)
      .innerJoin(sectores, eq(necesidades.sectorId, sectores.id))
      .where(eq(necesidades.ayudaPuntoApoyoId, id))
      .orderBy(desc(necesidades.createdAt));

    const evs = await this.db
      .select()
      .from(eventos)
      .where(eq(eventos.puntoApoyoId, id))
      .orderBy(desc(eventos.fechaInicio));

    const sinAsignar = needs.filter((r) => r.n.estado === 'requiere' && !r.n.responsableNombre).length;
    const enProceso = needs.filter((r) => r.n.estado === 'requiere' && r.n.responsableNombre).length;
    const atendidas = needs.filter((r) => r.n.estado === 'atendida').length;

    const estadoDe = (n: typeof necesidades.$inferSelect) =>
      n.estado === 'atendida'
        ? { label: 'Atendida', color: '#2E9E5B' }
        : n.responsableNombre
          ? { label: 'En proceso', color: '#E08E00' }
          : { label: 'Pendiente', color: '#CE1126' };

    const filasNeeds = needs
      .map(({ n, s }) => {
        const e = estadoDe(n);
        return `<tr>
<td>${esc(asDate(n.fecha))}</td>
<td><strong>${esc(n.tipo)}</strong></td>
<td>${esc(s.nombre)}</td>
<td><span class="tag" style="background:${e.color}">${e.label}</span></td>
<td>${esc(n.prioridad)}</td>
<td>${esc(n.reportadoPor || '—')}<br><small>${esc(n.telefonoReporta || '')}</small></td>
<td>${esc((n.descripcion || '').slice(0, 220))}</td>
</tr>`;
      })
      .join('\n');

    const filasEventos = evs
      .map((e) => {
        const estado = e.activo ? '<span class="tag" style="background:#2E9E5B">Activo</span>' : '<span class="tag" style="background:#9AA0AC">Inactivo</span>';
        const periodo = `${asDate(e.fechaInicio)}${e.fechaFin ? ' → ' + asDate(e.fechaFin) : ''}`;
        return `<tr>
<td><strong>${esc(e.titulo)}</strong><br><small>${esc(e.descripcion || '').slice(0, 160)}</small></td>
<td>${periodo}</td>
<td>${esc(e.direccion || '—')}</td>
<td>${estado}</td>
</tr>`;
      })
      .join('\n');

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Informe — ${esc(p.nombre)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2430; margin: 24px auto; max-width: 900px; padding: 0 16px; }
  .cab { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #003893; padding-bottom: 14px; }
  .cab img { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; border: 1px solid #e1e4e9; }
  .cab .fallback { width: 64px; height: 64px; border-radius: 12px; background: #e8eeff; display: flex; align-items: center; justify-content: center; font-size: 28px; }
  .cab h1 { margin: 0; font-size: 20px; color: #003893; }
  .cab p { margin: 2px 0 0; font-size: 13px; color: #6b7280; }
  .kpis { display: flex; gap: 10px; flex-wrap: wrap; margin: 16px 0; }
  .kpi { flex: 1; min-width: 130px; border: 1px solid #e1e4e9; border-radius: 10px; padding: 10px 14px; }
  .kpi .num { font-size: 26px; font-weight: 800; }
  .kpi .lbl { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
  h2 { font-size: 15px; margin: 22px 0 8px; color: #003893; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #eef0f3; vertical-align: top; }
  th { background: #f4f6fb; color: #6b7280; text-transform: uppercase; font-size: 10.5px; letter-spacing: .04em; }
  .tag { color: #fff; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  small { color: #6b7280; }
  .pie { margin-top: 22px; font-size: 11.5px; color: #9AA0AC; }
  @media print { body { margin: 0; } .cab { break-inside: avoid; } }
</style>
</head>
<body>
<div class="cab">
  ${p.imagen ? `<img src="${esc(p.imagen)}" alt="">` : '<div class="fallback">🏪</div>'}
  <div>
    <h1>${esc(p.nombre)}</h1>
    <p>${esc(p.tipo || 'Punto de apoyo')}${p.direccion ? ` · ${esc(p.direccion)}` : ''}${p.telefono ? ` · 📞 ${esc(p.telefono)}` : ''}</p>
  </div>
</div>

<div class="kpis">
  <div class="kpi"><div class="num">${needs.length}</div><div class="lbl">Necesidades asignadas</div></div>
  <div class="kpi"><div class="num" style="color:#CE1126">${sinAsignar}</div><div class="lbl">Pendientes</div></div>
  <div class="kpi"><div class="num" style="color:#E08E00">${enProceso}</div><div class="lbl">En proceso</div></div>
  <div class="kpi"><div class="num" style="color:#2E9E5B">${atendidas}</div><div class="lbl">Atendidas</div></div>
  <div class="kpi"><div class="num">${evs.length}</div><div class="lbl">Eventos</div></div>
</div>

<h2>📋 Necesidades asignadas</h2>
${needs.length === 0 ? '<p style="color:#6b7280">Sin necesidades asignadas.</p>' : `<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Sector</th><th>Estado</th><th>Prioridad</th><th>Reporta</th><th>Descripción</th></tr></thead><tbody>\n${filasNeeds}\n</tbody></table>`}

<h2>📅 Eventos del punto</h2>
${evs.length === 0 ? '<p style="color:#6b7280">Sin eventos registrados.</p>' : `<table><thead><tr><th>Evento</th><th>Período</th><th>Dirección</th><th>Estado</th></tr></thead><tbody>\n${filasEventos}\n</tbody></table>`}

<p class="pie">SolidaridadCO — Informe generado el ${new Date().toLocaleString('es-CO')}</p>
</body>
</html>`;
  }
}

@Controller('puntos-apoyo')
export class PuntosApoyoController {
  constructor(private readonly svc: PuntosApoyoService) {}

  @Get()
  list(@Query('ciudad') ciudad?: string) {
    return this.svc.list(ciudad ?? 'manizales');
  }

  /** Informe descargable del punto de apoyo (HTML autocontenido). Solo admin. */
  @Get(':id/informe')
  @UseGuards(AdminGuard)
  async informe(@Param('id') id: string, @Res() res: Response) {
    const html = await this.svc.informeHtml(toInt(id));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="informe-punto-apoyo-${id}.html"`);
    res.send(html);
  }

  @Post()
  // Crear un punto de apoyo es público: cualquier persona puede aportar un lugar.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Body() b: PuntoApoyoBody) {
    return this.svc.create(b);
  }

  /** Edición pública: exige el PIN que se le dio al usuario al publicar. */
  @Patch(':id')
  update(@Param('id') id: string, @Body() b: PuntoApoyoBody) {
    return this.svc.updatePublic(toInt(id), b);
  }

  /** Edición con la llave general de Admin. */
  @Patch(':id/admin')
  @UseGuards(AdminGuard)
  adminUpdate(@Param('id') id: string, @Body() b: PuntoApoyoBody) {
    return this.svc.adminUpdate(toInt(id), b);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.svc.remove(toInt(id));
  }

  /** Borrado público con el PIN del usuario. */
  @Post(':id/eliminar')
  removePublic(@Param('id') id: string, @Body() b: { pin?: string }) {
    return this.svc.removePublic(toInt(id), b?.pin);
  }
}

@Module({
  controllers: [PuntosApoyoController],
  providers: [PuntosApoyoService],
})
export class PuntosApoyoModule {}
