-- ============================================================
-- MIGRACIÓN 10 — ejecutar UNA vez en phpMyAdmin sobre tu base
-- de datos en producción. No borra datos existentes.
-- Agrega un código (PIN) de 4 dígitos para proteger la edición
-- de necesidades, ofrecimientos, mascotas y vivienda: solo quien
-- tiene el código de una publicación puede actualizarla.
-- Las publicaciones existentes (sin código) siguen editables
-- sin código, para no dejar a nadie bloqueado.
-- ============================================================

ALTER TABLE necesidades ADD COLUMN pin VARCHAR(10) DEFAULT NULL AFTER id;
ALTER TABLE ofrecimientos ADD COLUMN pin VARCHAR(10) DEFAULT NULL AFTER id;
ALTER TABLE mascotas_perdidas ADD COLUMN pin VARCHAR(10) DEFAULT NULL AFTER id;
ALTER TABLE viviendas ADD COLUMN pin VARCHAR(10) DEFAULT NULL AFTER id;
