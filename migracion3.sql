-- ============================================================
-- MIGRACIÓN 3 — ejecutar UNA vez en phpMyAdmin sobre tu base
-- de datos en producción. No borra datos existentes.
-- Crea la tabla de "ofrecimientos" (ayuda que la gente ofrece,
-- independiente del mapa de sectores).
-- ============================================================

CREATE TABLE IF NOT EXISTS ofrecimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  cantidad VARCHAR(100) DEFAULT NULL,
  fecha DATE NOT NULL,
  nombre_ofrece VARCHAR(150) NOT NULL,
  telefono_ofrece VARCHAR(50) DEFAULT NULL,
  estado ENUM('disponible','entregado') NOT NULL DEFAULT 'disponible',
  reservado_por_nombre VARCHAR(150) DEFAULT NULL,
  reservado_por_telefono VARCHAR(50) DEFAULT NULL,
  fecha_reserva DATE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
