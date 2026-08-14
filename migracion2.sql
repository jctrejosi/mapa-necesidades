-- ============================================================
-- MIGRACIÓN 2 — ejecutar UNA vez en phpMyAdmin sobre tu base
-- de datos en producción. No borra datos existentes.
-- Agrega la posibilidad de que alguien se "haga cargo" de una
-- necesidad, evitando ayuda duplicada.
-- ============================================================

ALTER TABLE necesidades
  ADD COLUMN responsable_nombre VARCHAR(150) NULL AFTER estado,
  ADD COLUMN responsable_telefono VARCHAR(50) NULL AFTER responsable_nombre,
  ADD COLUMN fecha_compromiso DATE NULL AFTER responsable_telefono;
