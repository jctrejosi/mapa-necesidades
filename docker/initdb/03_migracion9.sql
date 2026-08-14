-- ============================================================
-- MIGRACIÓN 9 — ejecutar UNA vez en phpMyAdmin sobre tu base
-- de datos en producción. No borra datos existentes.
-- Crea la tabla de Vivienda / Alojamiento (ofertas de alquiler
-- o alojamiento gratuito publicadas por la comunidad).
-- Por seguridad NO usa coordenadas exactas, solo barrio/sector
-- de referencia en texto.
-- ============================================================

CREATE TABLE IF NOT EXISTS viviendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ciudad VARCHAR(50) NOT NULL DEFAULT 'manizales',
  tipo ENUM('gratis','alquiler') NOT NULL DEFAULT 'gratis',
  precio VARCHAR(100) DEFAULT NULL,
  capacidad VARCHAR(100) DEFAULT NULL,
  tiempo_disponible VARCHAR(150) DEFAULT NULL,
  sector_referencia VARCHAR(150) DEFAULT NULL,
  descripcion TEXT,
  imagen VARCHAR(255) DEFAULT NULL,
  estado ENUM('disponible','ocupado') NOT NULL DEFAULT 'disponible',
  nombre_ofrece VARCHAR(150) NOT NULL,
  telefono_ofrece VARCHAR(50) NOT NULL,
  interesado_nombre VARCHAR(150) DEFAULT NULL,
  interesado_telefono VARCHAR(50) DEFAULT NULL,
  fecha_interes DATE DEFAULT NULL,
  fecha DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_viviendas_ciudad (ciudad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
