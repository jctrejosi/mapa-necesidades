CREATE TYPE "public"."estado_centro" AS ENUM('abierto', 'cerrado');--> statement-breakpoint
CREATE TYPE "public"."estado_dano" AS ENUM('pendiente', 'visita_programada', 'visitado');--> statement-breakpoint
CREATE TYPE "public"."estado_mascota" AS ENUM('perdido', 'encontrado');--> statement-breakpoint
CREATE TYPE "public"."estado_necesidad" AS ENUM('requiere', 'atendida');--> statement-breakpoint
CREATE TYPE "public"."estado_ofrecimiento" AS ENUM('disponible', 'entregado');--> statement-breakpoint
CREATE TYPE "public"."estado_sector" AS ENUM('activo', 'cerrado');--> statement-breakpoint
CREATE TYPE "public"."estado_vivienda" AS ENUM('disponible', 'ocupado');--> statement-breakpoint
CREATE TYPE "public"."habitado" AS ENUM('si', 'no', 'evacuado');--> statement-breakpoint
CREATE TYPE "public"."nivel_afectacion" AS ENUM('leve', 'moderado', 'severo');--> statement-breakpoint
CREATE TYPE "public"."nivel_dano" AS ENUM('leve', 'moderado', 'severo', 'colapso');--> statement-breakpoint
CREATE TYPE "public"."prioridad" AS ENUM('alta', 'media', 'baja');--> statement-breakpoint
CREATE TYPE "public"."tipo_vivienda" AS ENUM('gratis', 'alquiler');--> statement-breakpoint
CREATE TABLE "centros_acopio" (
	"id" serial PRIMARY KEY NOT NULL,
	"ciudad" varchar(50) DEFAULT 'manizales' NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"organizacion" varchar(150),
	"es_acopio" boolean DEFAULT false NOT NULL,
	"es_sangre" boolean DEFAULT false NOT NULL,
	"es_alojamiento" boolean DEFAULT false NOT NULL,
	"que_recibe" text,
	"imagen" varchar(255),
	"direccion" varchar(200),
	"telefono" varchar(50),
	"horario" varchar(150),
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"estado" "estado_centro" DEFAULT 'abierto' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contactos" (
	"id" serial PRIMARY KEY NOT NULL,
	"sector_id" integer NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"telefono" varchar(50),
	"rol" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mascotas_perdidas" (
	"id" serial PRIMARY KEY NOT NULL,
	"pin" varchar(10),
	"ciudad" varchar(50) DEFAULT 'manizales' NOT NULL,
	"nombre_mascota" varchar(100),
	"tipo_animal" varchar(50) NOT NULL,
	"senas" text,
	"imagen" varchar(255),
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"lugar_visto" varchar(150),
	"fecha_visto" date NOT NULL,
	"estado" "estado_mascota" DEFAULT 'perdido' NOT NULL,
	"nombre_reporta" varchar(150) NOT NULL,
	"telefono_reporta" varchar(50) NOT NULL,
	"avistado_por_nombre" varchar(150),
	"avistado_por_telefono" varchar(50),
	"fecha_avistamiento" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "necesidades" (
	"id" serial PRIMARY KEY NOT NULL,
	"pin" varchar(10),
	"sector_id" integer NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"descripcion" text,
	"imagen" varchar(255),
	"fecha" date NOT NULL,
	"cantidad" varchar(100),
	"prioridad" "prioridad" DEFAULT 'media' NOT NULL,
	"estado" "estado_necesidad" DEFAULT 'requiere' NOT NULL,
	"responsable_nombre" varchar(150),
	"responsable_telefono" varchar(50),
	"fecha_compromiso" date,
	"reportado_por" varchar(150),
	"telefono_reporta" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "noticias" (
	"id" serial PRIMARY KEY NOT NULL,
	"ciudad" varchar(50),
	"titulo" varchar(200) NOT NULL,
	"contenido" text NOT NULL,
	"imagen" varchar(255),
	"autor" varchar(150),
	"fecha" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ofrecimientos" (
	"id" serial PRIMARY KEY NOT NULL,
	"pin" varchar(10),
	"ciudad" varchar(50) DEFAULT 'manizales' NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"descripcion" text,
	"imagen" varchar(255),
	"cantidad" varchar(100),
	"fecha" date NOT NULL,
	"nombre_ofrece" varchar(150) NOT NULL,
	"telefono_ofrece" varchar(50),
	"estado" "estado_ofrecimiento" DEFAULT 'disponible' NOT NULL,
	"reservado_por_nombre" varchar(150),
	"reservado_por_telefono" varchar(50),
	"fecha_reserva" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reportes_danos" (
	"id" serial PRIMARY KEY NOT NULL,
	"radicado" varchar(20) NOT NULL,
	"ciudad" varchar(50) DEFAULT 'manizales' NOT NULL,
	"tipo_inmueble" varchar(50) NOT NULL,
	"direccion" varchar(200) NOT NULL,
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"habitado" "habitado" DEFAULT 'si' NOT NULL,
	"nivel_percibido" "nivel_dano" DEFAULT 'moderado' NOT NULL,
	"descripcion" text,
	"imagen" varchar(255),
	"nombre_reporta" varchar(150) NOT NULL,
	"telefono_reporta" varchar(50) NOT NULL,
	"cedula_reporta" varchar(30),
	"estado" "estado_dano" DEFAULT 'pendiente' NOT NULL,
	"fecha_visita" date,
	"resultado_visita" varchar(150),
	"notas_admin" text,
	"fecha" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sectores" (
	"id" serial PRIMARY KEY NOT NULL,
	"ciudad" varchar(50) DEFAULT 'manizales' NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"barrio" varchar(150),
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"descripcion" text,
	"nivel_afectacion" "nivel_afectacion" DEFAULT 'moderado' NOT NULL,
	"estado" "estado_sector" DEFAULT 'activo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viviendas" (
	"id" serial PRIMARY KEY NOT NULL,
	"pin" varchar(10),
	"ciudad" varchar(50) DEFAULT 'manizales' NOT NULL,
	"tipo" "tipo_vivienda" DEFAULT 'gratis' NOT NULL,
	"precio" varchar(100),
	"capacidad" varchar(100),
	"tiempo_disponible" varchar(150),
	"sector_referencia" varchar(150),
	"descripcion" text,
	"imagen" varchar(255),
	"estado" "estado_vivienda" DEFAULT 'disponible' NOT NULL,
	"nombre_ofrece" varchar(150) NOT NULL,
	"telefono_ofrece" varchar(50) NOT NULL,
	"interesado_nombre" varchar(150),
	"interesado_telefono" varchar(50),
	"fecha_interes" date,
	"fecha" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_sector_id_sectores_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "necesidades" ADD CONSTRAINT "necesidades_sector_id_sectores_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_centros_ciudad" ON "centros_acopio" USING btree ("ciudad");--> statement-breakpoint
CREATE INDEX "idx_contactos_sector" ON "contactos" USING btree ("sector_id");--> statement-breakpoint
CREATE INDEX "idx_mascotas_ciudad" ON "mascotas_perdidas" USING btree ("ciudad");--> statement-breakpoint
CREATE INDEX "idx_necesidades_sector" ON "necesidades" USING btree ("sector_id");--> statement-breakpoint
CREATE INDEX "idx_noticias_ciudad" ON "noticias" USING btree ("ciudad");--> statement-breakpoint
CREATE INDEX "idx_ofrecimientos_ciudad" ON "ofrecimientos" USING btree ("ciudad");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reportes_danos_radicado" ON "reportes_danos" USING btree ("radicado");--> statement-breakpoint
CREATE INDEX "idx_danos_ciudad" ON "reportes_danos" USING btree ("ciudad");--> statement-breakpoint
CREATE INDEX "idx_sectores_ciudad" ON "sectores" USING btree ("ciudad");--> statement-breakpoint
CREATE INDEX "idx_viviendas_ciudad" ON "viviendas" USING btree ("ciudad");