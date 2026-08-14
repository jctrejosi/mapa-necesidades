-- ============================================================
-- MIGRACIÓN 4 — ejecutar UNA vez en phpMyAdmin sobre tu base
-- de datos en producción. No borra datos existentes.
-- Agrega soporte multi-ciudad. Todo lo que ya tenías queda
-- asignado automáticamente a 'manizales'.
-- ============================================================

ALTER TABLE sectores
  ADD COLUMN ciudad VARCHAR(50) NOT NULL DEFAULT 'manizales' AFTER id,
  ADD INDEX idx_sectores_ciudad (ciudad);

ALTER TABLE ofrecimientos
  ADD COLUMN ciudad VARCHAR(50) NOT NULL DEFAULT 'manizales' AFTER id,
  ADD INDEX idx_ofrecimientos_ciudad (ciudad);
