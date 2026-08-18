ALTER TABLE "necesidades" ADD COLUMN "evidencias" jsonb;
ALTER TABLE "necesidades" ADD COLUMN "ayuda_punto_apoyo_id" integer REFERENCES "puntos_apoyo"("id");
