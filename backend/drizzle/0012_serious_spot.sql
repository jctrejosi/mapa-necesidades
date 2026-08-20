CREATE TABLE "clics" (
	"id" serial PRIMARY KEY NOT NULL,
	"enlace" varchar(50) NOT NULL,
	"visitor_id" varchar(64),
	"ip" varchar(45),
	"user_agent" text,
	"referrer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_clics_enlace" ON "clics" USING btree ("enlace");--> statement-breakpoint
CREATE INDEX "idx_clics_created" ON "clics" USING btree ("created_at");
