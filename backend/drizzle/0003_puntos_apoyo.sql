CREATE TABLE "puntos_apoyo" (
	"id" serial PRIMARY KEY NOT NULL,
	"ciudad" varchar(50) DEFAULT 'manizales' NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"direccion" varchar(200) NOT NULL,
	"telefono" varchar(50),
	"imagen" varchar(255),
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"visitor_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_puntos_apoyo_ciudad" ON "puntos_apoyo" USING btree ("ciudad");
