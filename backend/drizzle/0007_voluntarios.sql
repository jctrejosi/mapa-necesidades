CREATE TABLE "voluntarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"tabla" varchar(30) NOT NULL,
	"registro_id" integer NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"telefono" varchar(50) NOT NULL,
	"mensaje" text,
	"visitor_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_voluntarios_tabla_registro" ON "voluntarios" USING btree ("tabla", "registro_id");
