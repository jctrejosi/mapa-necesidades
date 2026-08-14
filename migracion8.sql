-- ============================================================
-- MIGRACIÓN 8 — ejecutar UNA vez en phpMyAdmin sobre tu base
-- de datos en producción. No borra datos existentes.
-- Convierte el campo "tipo" de centros_acopio en 3 casillas
-- independientes (puede ser acopio + alojamiento + sangre a la
-- vez), agrega "Alojamiento temporal" y una foto por centro.
-- ============================================================

ALTER TABLE centros_acopio
  ADD COLUMN es_acopio TINYINT(1) NOT NULL DEFAULT 0 AFTER organizacion,
  ADD COLUMN es_sangre TINYINT(1) NOT NULL DEFAULT 0 AFTER es_acopio,
  ADD COLUMN es_alojamiento TINYINT(1) NOT NULL DEFAULT 0 AFTER es_sangre,
  ADD COLUMN imagen VARCHAR(255) DEFAULT NULL AFTER que_recibe;

-- Migrar los datos existentes del campo "tipo" a las nuevas casillas
UPDATE centros_acopio SET es_acopio = 1 WHERE tipo IN ('acopio', 'ambos');
UPDATE centros_acopio SET es_sangre = 1 WHERE tipo IN ('sangre', 'ambos');

ALTER TABLE centros_acopio DROP COLUMN tipo;
