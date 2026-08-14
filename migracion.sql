-- ============================================================
-- MIGRACIÓN — ejecutar UNA sola vez en phpMyAdmo sobre tu base
-- de datos que YA está en producción. No borra datos existentes.
-- ============================================================

-- 1) Agregar columna de fecha a cada necesidad (la fecha en que aplica)
ALTER TABLE necesidades ADD COLUMN fecha DATE NULL AFTER descripcion;
UPDATE necesidades SET fecha = DATE(created_at) WHERE fecha IS NULL;
ALTER TABLE necesidades MODIFY fecha DATE NOT NULL;

-- 2) Simplificar el estado a dos opciones: 'requiere' y 'atendida'
UPDATE necesidades SET estado = 'requiere' WHERE estado IN ('pendiente', 'en_proceso');
ALTER TABLE necesidades MODIFY estado ENUM('requiere','atendida') NOT NULL DEFAULT 'requiere';
