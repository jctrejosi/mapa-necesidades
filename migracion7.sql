-- ============================================================
-- MIGRACIÓN 7 — ejecutar UNA vez en phpMyAdmin sobre tu base
-- de datos en producción. No borra datos existentes.
-- Crea la tabla de Noticias/Comunicados (solo el admin publica).
-- ============================================================

CREATE TABLE IF NOT EXISTS noticias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ciudad VARCHAR(50) DEFAULT NULL COMMENT 'NULL = visible en todas las ciudades',
  titulo VARCHAR(200) NOT NULL,
  contenido TEXT NOT NULL,
  imagen VARCHAR(255) DEFAULT NULL,
  autor VARCHAR(150) DEFAULT NULL,
  fecha DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_noticias_ciudad (ciudad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
