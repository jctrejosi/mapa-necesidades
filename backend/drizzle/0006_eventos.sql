ALTER TABLE "puntos_apoyo" ADD COLUMN "color" varchar(20) DEFAULT '#003893' NOT NULL;
--> statement-breakpoint
CREATE TABLE "eventos" (
	"id" serial PRIMARY KEY NOT NULL,
	"pin" varchar(10),
	"punto_apoyo_id" integer NOT NULL,
	"titulo" varchar(150) NOT NULL,
	"descripcion" text,
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"direccion" varchar(200),
	"activo" boolean DEFAULT true NOT NULL,
	"fecha_inicio" timestamp with time zone NOT NULL,
	"fecha_fin" timestamp with time zone,
	"visitor_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_punto_apoyo_id_puntos_apoyo_id_fk" FOREIGN KEY ("punto_apoyo_id") REFERENCES "public"."puntos_apoyo"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_eventos_punto" ON "eventos" USING btree ("punto_apoyo_id");
--> statement-breakpoint
CREATE INDEX "idx_eventos_activo" ON "eventos" USING btree ("activo");
