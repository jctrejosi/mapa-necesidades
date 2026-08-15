CREATE TABLE "visitas" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor_id" varchar(64) NOT NULL,
	"ip" varchar(45),
	"user_agent" text,
	"referrer" text,
	"path" varchar(200),
	"ciudad" varchar(50),
	"lang" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sectores" ADD COLUMN "visitor_id" varchar(64);--> statement-breakpoint
ALTER TABLE "necesidades" ADD COLUMN "visitor_id" varchar(64);--> statement-breakpoint
ALTER TABLE "ofrecimientos" ADD COLUMN "visitor_id" varchar(64);--> statement-breakpoint
ALTER TABLE "mascotas_perdidas" ADD COLUMN "visitor_id" varchar(64);--> statement-breakpoint
ALTER TABLE "viviendas" ADD COLUMN "visitor_id" varchar(64);--> statement-breakpoint
ALTER TABLE "reportes_danos" ADD COLUMN "visitor_id" varchar(64);--> statement-breakpoint
CREATE INDEX "idx_visitas_visitor" ON "visitas" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "idx_visitas_created" ON "visitas" USING btree ("created_at");
