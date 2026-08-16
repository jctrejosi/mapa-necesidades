/** Tipos del contrato API ↔ frontend (ids numéricos, ciudades en id). */

export interface Contacto { id: number; nombre: string; telefono: string; rol: string }

export interface Sector {
  id: number; ciudad: string; nombre: string; barrio: string
  lat: number; lng: number; descripcion: string
  nivel_afectacion: 'leve' | 'moderado' | 'severo'
  estado: 'activo' | 'cerrado'
  contactos: Contacto[]
}

export interface Necesidad {
  id: number; sector_id: number; tipo: string; descripcion: string
  imagen: string | null; fecha: string; cantidad: string
  prioridad: 'alta' | 'media' | 'baja'
  estado: 'requiere' | 'atendida'
  responsable: { nombre: string; telefono: string; fecha: string } | null
  reportado_por: string; telefono_reporta: string; pin: string | null
}

export interface Ofrecimiento {
  id: number; ciudad: string; tipo: string; descripcion: string
  imagen: string | null; cantidad: string; fecha: string
  nombre_ofrece: string; telefono_ofrece: string
  estado: 'disponible' | 'entregado'
  reservado_por: { nombre: string; telefono: string; fecha: string } | null
  pin: string | null
}

export interface Mascota {
  id: number; ciudad: string; nombre: string; tipo_animal: string
  senas: string; imagen: string | null
  lat: number; lng: number; lugar_visto: string; fecha_visto: string
  estado: 'perdido' | 'encontrado'
  nombre_reporta: string; telefono_reporta: string
  avistado_por: { nombre: string; telefono: string; fecha: string } | null
  pin: string | null
}

export interface CentroAcopio {
  id: number; ciudad: string; nombre: string; organizacion: string
  es_acopio: boolean; es_sangre: boolean; es_alojamiento: boolean
  que_recibe: string; imagen: string | null
  direccion: string; telefono: string; horario: string
  lat: number; lng: number; estado: 'abierto' | 'cerrado'
}

export interface Noticia {
  id: number; ciudad: string | null; titulo: string; contenido: string
  imagen: string | null; autor: string; fecha: string
}

export interface Vivienda {
  id: number; ciudad: string; tipo: 'gratis' | 'alquiler'
  precio: string | null; capacidad: string; tiempo_disponible: string
  sector_referencia: string; descripcion: string
  imagen: string | null; estado: 'disponible' | 'ocupado'
  nombre_ofrece: string; telefono_ofrece: string
  interesado: { nombre: string; telefono: string; fecha: string } | null
  fecha: string
  pin: string | null
}

export interface ReporteDano {
  id: number; radicado?: string; ciudad: string
  tipo_inmueble: string; direccion: string
  lat: number; lng: number
  habitado: 'si' | 'no' | 'evacuado'
  nivel_percibido: 'leve' | 'moderado' | 'severo' | 'colapso'
  descripcion: string; imagen: string | null
  estado: 'pendiente' | 'visita_programada' | 'visitado'
  nombre_reportante: string; telefono_reportante: string; cedula: string | null
  fecha: string; fecha_visita: string | null
  resultado_visita: string | null; notas_admin: string | null
}
