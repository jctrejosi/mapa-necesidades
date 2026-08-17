import { Controller, Get, Inject, Injectable, Module, Query } from '@nestjs/common';
import { eq, ilike, or, sql } from 'drizzle-orm';
import { DB, Db } from '../db/database';
import {
  eventos,
  mascotasPerdidas,
  necesidades,
  ofrecimientos,
  puntosApoyo,
  reportesDanos,
  sectores,
  viviendas,
} from '../db/schema';
import { asNum } from '../common/serialize';
import { str } from '../common/util';

/**
 * Buscador de reportes por PIN (o radicado) y por número de teléfono.
 * Recorre todas las entidades y devuelve coincidencias listas para
 * centrar el mapa y abrir el detalle en el frontend.
 */
const MAX_RESULTS = 30;

@Injectable()
class BuscarService {
  constructor(@Inject(DB) private db: Db) {}

  async buscar(q: unknown) {
    const query = str(q).trim();
    if (query.length < 3) return [];

    const like = `%${query}%`;
    const digits = query.replace(/\D/g, '');
    /** Coincidencia de teléfono: directa (ilike) y sin espacios ni guiones. */
    const phoneCond = (field: unknown) => {
      const conds = [ilike(field as never, like)];
      if (digits.length >= 7) {
        conds.push(sql`replace(${field}, ' ', '') ilike ${`%${digits}%`}`);
      }
      return or(...conds);
    };
    const pinCond = (field: unknown) => ilike(field as never, query);

    /** Coincidencia de texto libre en descripciones, títulos y direcciones. */
    const textCond = (...fields: unknown[]) => or(...fields.map((f) => ilike(f as never, like)));

    /** Determina el tipo de coincidencia para mostrar la etiqueta en el buscador. */
    const coincidenceOf = (pinVal: unknown, phoneVal: unknown): string => {
      const p = str(pinVal);
      if (p && p.toLowerCase() === query.toLowerCase()) return 'pin';
      const ph = str(phoneVal);
      const phd = ph.replace(/\D/g, '');
      if ((digits.length >= 3 && phd && phd.includes(digits)) || (ph && ph.toLowerCase().includes(query.toLowerCase()))) return 'telefono';
      return 'texto';
    };

    const results: { [k: string]: unknown }[] = [];
    const push = (r: { [k: string]: unknown }) => {
      if (results.length < MAX_RESULTS) results.push(r);
    };

    // ── Necesidades (teléfono/PIN + ubicación del sector) ──
    const needs = await this.db
      .select({ n: necesidades, s: sectores })
      .from(necesidades)
      .leftJoin(sectores, eq(necesidades.sectorId, sectores.id))
      .where(or(phoneCond(necesidades.telefonoReporta), pinCond(necesidades.pin), textCond(necesidades.descripcion, necesidades.tipo)))
      .limit(20);
    for (const { n, s } of needs) {
      push({
        tipo: 'necesidad', tabla: 'necesidades', id: n.id,
        titulo: n.tipo, detalle: n.descripcion ?? '',
        telefono: n.telefonoReporta ?? '', ciudad: s?.ciudad ?? 'manizales',
        lat: s ? asNum(s.lat) : null, lng: s ? asNum(s.lng) : null,
        imagen: n.imagen ?? null,
        coincidencia: coincidenceOf(n.pin, n.telefonoReporta),
      });
    }

    // ── Ofrecimientos ──
    const ofs = await this.db
      .select()
      .from(ofrecimientos)
      .where(or(phoneCond(ofrecimientos.telefonoOfrece), pinCond(ofrecimientos.pin), textCond(ofrecimientos.descripcion, ofrecimientos.tipo)))
      .limit(20);
    for (const o of ofs) {
      push({
        tipo: 'ofrecimiento', tabla: 'ofrecimientos', id: o.id,
        titulo: o.tipo, detalle: o.descripcion ?? '',
        telefono: o.telefonoOfrece ?? '', ciudad: o.ciudad,
        lat: null, lng: null, imagen: o.imagen ?? null,
        coincidencia: coincidenceOf(o.pin, o.telefonoOfrece),
      });
    }

    // ── Mascotas ──
    const pets = await this.db
      .select()
      .from(mascotasPerdidas)
      .where(or(phoneCond(mascotasPerdidas.telefonoReporta), pinCond(mascotasPerdidas.pin), textCond(mascotasPerdidas.senas, mascotasPerdidas.tipoAnimal, mascotasPerdidas.nombreMascota, mascotasPerdidas.lugarVisto)))
      .limit(20);
    for (const m of pets) {
      push({
        tipo: 'mascota', tabla: 'mascotas_perdidas', id: m.id,
        titulo: m.nombreMascota || m.tipoAnimal, detalle: m.senas ?? '',
        telefono: m.telefonoReporta, ciudad: m.ciudad,
        lat: asNum(m.lat), lng: asNum(m.lng), imagen: m.imagen ?? null,
        coincidencia: coincidenceOf(m.pin, m.telefonoReporta),
      });
    }

    // ── Viviendas (sin coordenadas propias: solo abre el detalle) ──
    const vivs = await this.db
      .select()
      .from(viviendas)
      .where(or(phoneCond(viviendas.telefonoOfrece), pinCond(viviendas.pin), textCond(viviendas.descripcion, viviendas.sectorReferencia)))
      .limit(20);
    for (const v of vivs) {
      push({
        tipo: 'vivienda', tabla: 'viviendas', id: v.id,
        titulo: v.sectorReferencia || 'Vivienda', detalle: v.descripcion ?? '',
        telefono: v.telefonoOfrece, ciudad: v.ciudad,
        lat: null, lng: null, imagen: v.imagen ?? null,
        coincidencia: coincidenceOf(v.pin, v.telefonoOfrece),
      });
    }

    // ── Daños (teléfono o radicado) ──
    const dan = await this.db
      .select()
      .from(reportesDanos)
      .where(or(phoneCond(reportesDanos.telefonoReporta), ilike(reportesDanos.radicado, query), textCond(reportesDanos.descripcion, reportesDanos.direccion, reportesDanos.tipoInmueble)))
      .limit(20);
    for (const d of dan) {
      push({
        tipo: 'dano', tabla: 'reportes_danos', id: d.id,
        titulo: `${d.tipoInmueble} — ${d.direccion}`, detalle: d.descripcion ?? '',
        telefono: d.telefonoReporta, ciudad: d.ciudad,
        lat: asNum(d.lat), lng: asNum(d.lng), imagen: d.imagen ?? null,
        coincidencia: coincidenceOf(d.radicado, d.telefonoReporta),
      });
    }

    // ── Puntos de apoyo ──
    const pts = await this.db
      .select()
      .from(puntosApoyo)
      .where(or(phoneCond(puntosApoyo.telefono), pinCond(puntosApoyo.pin), textCond(puntosApoyo.nombre, puntosApoyo.tipo, puntosApoyo.direccion)))
      .limit(20);
    for (const p of pts) {
      push({
        tipo: 'punto', tabla: 'puntos_apoyo', id: p.id,
        titulo: p.nombre, detalle: p.tipo,
        telefono: p.telefono ?? '', ciudad: p.ciudad,
        lat: asNum(p.lat), lng: asNum(p.lng), imagen: p.imagen ?? null,
        coincidencia: coincidenceOf(p.pin, p.telefono),
      });
    }

    // ── Eventos (PIN propio o teléfono del punto asociado) ──
    const evs = await this.db
      .select({ e: eventos, p: puntosApoyo })
      .from(eventos)
      .innerJoin(puntosApoyo, eq(eventos.puntoApoyoId, puntosApoyo.id))
      .where(or(pinCond(eventos.pin), phoneCond(puntosApoyo.telefono), textCond(eventos.titulo, eventos.descripcion, eventos.direccion)))
      .limit(20);
    for (const { e, p } of evs) {
      push({
        tipo: 'evento', tabla: 'eventos', id: e.id,
        titulo: e.titulo, detalle: e.descripcion ?? '',
        telefono: p.telefono ?? '', ciudad: p.ciudad,
        lat: asNum(e.lat), lng: asNum(e.lng), imagen: p.imagen ?? null,
        coincidencia: coincidenceOf(e.pin, p.telefono),
      });
    }

    return results;
  }
}

@Controller('buscar')
export class BuscarController {
  constructor(private readonly svc: BuscarService) {}

  @Get()
  buscar(@Query('q') q?: string) {
    return this.svc.buscar(q);
  }
}

@Module({
  controllers: [BuscarController],
  providers: [BuscarService],
})
export class BuscarModule {}
