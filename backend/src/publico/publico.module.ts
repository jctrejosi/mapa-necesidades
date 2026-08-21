import { Controller, Get, Inject, Injectable, Module, Query } from '@nestjs/common';
import { and, eq, isNull, or } from 'drizzle-orm';
import { Throttle } from '@nestjs/throttler';
import { DB, Db } from '../db/database';
import {
  centrosAcopio,
  eventos,
  mascotasPerdidas,
  necesidades,
  noticias,
  ofrecimientos,
  puntosApoyo,
  reportesDanos,
  sectores,
  viviendas,
} from '../db/schema';
import { asDate, asIso, asNum, nested } from '../common/serialize';
import { str } from '../common/util';

/**
 * API pública de datos abiertos: GET /api/public/reportes devuelve TODOS los
 * reportes en un JSON, sin autenticación. La privacidad es la misma del sitio:
 * los reportes de daños NUNCA incluyen datos personales (nombre, teléfono,
 * cédula) y ningún PIN viaja en la respuesta.
 *
 * Parámetros opcionales:
 *   ?tipo=necesidades|ofrecimientos|mascotas|viviendas|danos|centros|puntos|eventos|noticias
 *   ?ciudad=manizales
 */

const GRUPOS = [
  'necesidades',
  'ofrecimientos',
  'mascotas',
  'viviendas',
  'danos',
  'centros',
  'puntos',
  'eventos',
  'noticias',
] as const;

type Grupo = (typeof GRUPOS)[number];

@Injectable()
class PublicoService {
  constructor(@Inject(DB) private db: Db) {}

  async reportes(tipo?: string, ciudadRaw?: string) {
    const ciudad = str(ciudadRaw).toLowerCase();
    const solo = tipo && (GRUPOS as readonly string[]).includes(tipo) ? (tipo as Grupo) : null;

    const resultado: Record<string, unknown[]> = {};
    const resumen: Record<string, number> = {};
    for (const g of GRUPOS) {
      if (solo && g !== solo) {
        resultado[g] = [];
        resumen[g] = 0;
        continue;
      }
      const { filas } = await this.cargar(g, ciudad);
      resultado[g] = filas;
      resumen[g] = filas.length;
    }
    const total = Object.values(resumen).reduce((a, b) => a + b, 0);

    return {
      api: 'public/reportes',
      generado: new Date().toISOString(),
      total,
      resumen,
      ...resultado,
    };
  }

  private async cargar(g: Grupo, ciudad: string): Promise<{ filas: unknown[] }> {
    switch (g) {
      case 'necesidades': {
        const conds = [];
        if (ciudad) conds.push(eq(sectores.ciudad, ciudad));
        const q = this.db
          .select({ n: necesidades, s: sectores })
          .from(necesidades)
          .innerJoin(sectores, eq(necesidades.sectorId, sectores.id));
        const rows = conds.length ? await q.where(and(...conds)) : await q;
        return {
          filas: rows.map(({ n, s }) => ({
            id: n.id,
            sector_id: n.sectorId,
            ciudad: s.ciudad,
            tipo: n.tipo,
            descripcion: n.descripcion ?? '',
            imagen: n.imagen ?? '',
            cantidad: n.cantidad ?? '',
            prioridad: n.prioridad,
            estado: n.estado,
            responsable: nested(n.responsableNombre, n.responsableTelefono, n.fechaCompromiso),
            reportado_por: n.reportadoPor ?? '',
            telefono_reporta: n.telefonoReporta ?? '',
            fecha: asDate(n.fecha),
            evidencias: (n.evidencias as { url: string; descripcion: string }[] | null) ?? [],
            ayuda_punto_apoyo_id: n.ayudaPuntoApoyoId ?? null,
          })),
        };
      }
      case 'ofrecimientos': {
        const conds = [];
        if (ciudad) conds.push(eq(ofrecimientos.ciudad, ciudad));
        const q = this.db.select().from(ofrecimientos);
        const rows = conds.length ? await q.where(and(...conds)) : await q;
        return {
          filas: rows.map((o) => ({
            id: o.id,
            ciudad: o.ciudad,
            tipo: o.tipo,
            descripcion: o.descripcion ?? '',
            imagen: o.imagen ?? '',
            cantidad: o.cantidad ?? '',
            fecha: asDate(o.fecha),
            nombre_ofrece: o.nombreOfrece,
            telefono_ofrece: o.telefonoOfrece ?? '',
            estado: o.estado,
            reservado_por: nested(o.reservadoPorNombre, o.reservadoPorTelefono, o.fechaReserva),
            lat: o.lat ? asNum(o.lat) : null,
            lng: o.lng ? asNum(o.lng) : null,
          })),
        };
      }
      case 'mascotas': {
        const conds = [];
        if (ciudad) conds.push(eq(mascotasPerdidas.ciudad, ciudad));
        const q = this.db.select().from(mascotasPerdidas);
        const rows = conds.length ? await q.where(and(...conds)) : await q;
        return {
          filas: rows.map((m) => ({
            id: m.id,
            ciudad: m.ciudad,
            nombre: m.nombreMascota ?? '',
            tipo_animal: m.tipoAnimal,
            senas: m.senas ?? '',
            imagen: m.imagen ?? '',
            lat: asNum(m.lat),
            lng: asNum(m.lng),
            lugar_visto: m.lugarVisto ?? '',
            fecha_visto: asDate(m.fechaVisto),
            estado: m.estado,
            nombre_reporta: m.nombreReporta,
            telefono_reporta: m.telefonoReporta,
            avistado_por: nested(m.avistadoPorNombre, m.avistadoPorTelefono, m.fechaAvistamiento),
          })),
        };
      }
      case 'viviendas': {
        const conds = [];
        if (ciudad) conds.push(eq(viviendas.ciudad, ciudad));
        const q = this.db.select().from(viviendas);
        const rows = conds.length ? await q.where(and(...conds)) : await q;
        return {
          filas: rows.map((v) => ({
            id: v.id,
            ciudad: v.ciudad,
            tipo: v.tipo,
            precio: v.precio ?? '',
            capacidad: v.capacidad ?? '',
            tiempo_disponible: v.tiempoDisponible ?? '',
            sector_referencia: v.sectorReferencia ?? '',
            descripcion: v.descripcion ?? '',
            imagen: v.imagen ?? '',
            estado: v.estado,
            nombre_ofrece: v.nombreOfrece,
            telefono_ofrece: v.telefonoOfrece,
            interesado: nested(v.interesadoNombre, v.interesadoTelefono, v.fechaInteres),
            fecha: asDate(v.fecha),
          })),
        };
      }
      case 'danos': {
        // Sin datos personales: nunca nombre/teléfono/cédula del reportante.
        const conds = [];
        if (ciudad) conds.push(eq(reportesDanos.ciudad, ciudad));
        const q = this.db.select().from(reportesDanos);
        const rows = conds.length ? await q.where(and(...conds)) : await q;
        return {
          filas: rows.map((d) => ({
            id: d.id,
            radicado: d.radicado,
            ciudad: d.ciudad,
            tipo_inmueble: d.tipoInmueble,
            direccion: d.direccion,
            lat: asNum(d.lat),
            lng: asNum(d.lng),
            habitado: d.habitado,
            nivel_percibido: d.nivelPercibido,
            descripcion: d.descripcion ?? '',
            imagen: d.imagen ?? '',
            estado: d.estado,
            fecha: asDate(d.fecha),
          })),
        };
      }
      case 'centros': {
        const conds = [];
        if (ciudad) conds.push(eq(centrosAcopio.ciudad, ciudad));
        const q = this.db.select().from(centrosAcopio);
        const rows = conds.length ? await q.where(and(...conds)) : await q;
        return {
          filas: rows.map((c) => ({
            id: c.id,
            ciudad: c.ciudad,
            nombre: c.nombre,
            organizacion: c.organizacion ?? '',
            es_acopio: c.esAcopio,
            es_sangre: c.esSangre,
            es_alojamiento: c.esAlojamiento,
            que_recibe: c.queRecibe ?? '',
            imagen: c.imagen ?? '',
            direccion: c.direccion ?? '',
            telefono: c.telefono ?? '',
            horario: c.horario ?? '',
            lat: asNum(c.lat),
            lng: asNum(c.lng),
            estado: c.estado,
          })),
        };
      }
      case 'puntos': {
        const conds = [];
        if (ciudad) conds.push(eq(puntosApoyo.ciudad, ciudad));
        const q = this.db.select().from(puntosApoyo);
        const rows = conds.length ? await q.where(and(...conds)) : await q;
        return {
          filas: rows.map((p) => ({
            id: p.id,
            ciudad: p.ciudad,
            nombre: p.nombre,
            tipo: p.tipo,
            direccion: p.direccion,
            telefono: p.telefono ?? '',
            imagen: p.imagen ?? '',
            lat: asNum(p.lat),
            lng: asNum(p.lng),
            color: p.color,
          })),
        };
      }
      case 'eventos': {
        const q = this.db
          .select({ e: eventos, p: puntosApoyo })
          .from(eventos)
          .innerJoin(puntosApoyo, eq(eventos.puntoApoyoId, puntosApoyo.id));
        const rows = ciudad ? await q.where(and(eq(puntosApoyo.ciudad, ciudad))) : await q;
        return {
          filas: rows.map(({ e, p }) => ({
            id: e.id,
            ciudad: p.ciudad,
            titulo: e.titulo,
            descripcion: e.descripcion ?? '',
            direccion: e.direccion ?? '',
            lat: asNum(e.lat),
            lng: asNum(e.lng),
            fecha_inicio: asIso(e.fechaInicio),
            fecha_fin: e.fechaFin ? asIso(e.fechaFin) : null,
            activo: e.activo,
            punto: {
              id: p.id,
              nombre: p.nombre,
              tipo: p.tipo,
              color: p.color,
              telefono: p.telefono ?? '',
              imagen: p.imagen ?? '',
            },
          })),
        };
      }
      case 'noticias': {
        const conds = [];
        if (ciudad) conds.push(or(eq(noticias.ciudad, ciudad), isNull(noticias.ciudad)));
        const q = this.db.select().from(noticias);
        const rows = conds.length ? await q.where(and(...conds)) : await q;
        return {
          filas: rows.map((n) => ({
            id: n.id,
            ciudad: n.ciudad, // null = visible en todas
            titulo: n.titulo,
            contenido: n.contenido,
            imagen: n.imagen ?? '',
            autor: n.autor ?? '',
            fecha: asDate(n.fecha),
          })),
        };
      }
    }
  }
}

@Controller('public')
export class PublicoController {
  constructor(private readonly svc: PublicoService) {}

  @Get('reportes')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  reportes(@Query('tipo') tipo?: string, @Query('ciudad') ciudad?: string) {
    return this.svc.reportes(tipo, ciudad);
  }
}

@Module({
  controllers: [PublicoController],
  providers: [PublicoService],
})
export class PublicoModule {}
