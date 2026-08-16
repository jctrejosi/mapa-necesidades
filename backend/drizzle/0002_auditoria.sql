CREATE TABLE "auditoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"tabla" varchar(50) NOT NULL,
	"registro_id" integer NOT NULL,
	"accion" varchar(20) NOT NULL,
	"datos_previos" jsonb,
	"datos_nuevos" jsonb,
	"autor" varchar(30) DEFAULT 'usuario' NOT NULL,
	"codigo" varchar(20),
	"visitor_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_auditoria_tabla_registro" ON "auditoria" USING btree ("tabla","registro_id");--> statement-breakpoint
CREATE INDEX "idx_auditoria_created" ON "auditoria" USING btree ("created_at");
