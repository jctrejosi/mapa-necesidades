-- ============================================================
-- MIGRACIÓN 5 — ejecutar UNA vez en phpMyAdmin sobre tu base
-- de datos en producción. No borra datos existentes.
-- Agrega: imágenes en necesidades y ofrecimientos, y la nueva
-- sección de Mascotas Perdidas.
-- ============================================================

ALTER TABLE necesidades
  ADD COLUMN imagen VARCHAR(255) DEFAULT NULL AFTER descripcion;

ALTER TABLE ofrecimientos
  ADD COLUMN imagen VARCHAR(255) DEFAULT NULL AFTER descripcion;

CREATE TABLE IF NOT EXISTS mascotas_perdidas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ciudad VARCHAR(50) NOT NULL DEFAULT 'manizales',
  nombre_mascota VARCHAR(100) DEFAULT NULL,
  tipo_animal VARCHAR(50) NOT NULL,
  senas TEXT,
  imagen VARCHAR(255) DEFAULT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  lugar_visto VARCHAR(150) DEFAULT NULL,
  fecha_visto DATE NOT NULL,
  estado ENUM('perdido','encontrado') NOT NULL DEFAULT 'perdido',
  nombre_reporta VARCHAR(150) NOT NULL,
  telefono_reporta VARCHAR(50) NOT NULL,
  avistado_por_nombre VARCHAR(150) DEFAULT NULL,
  avistado_por_telefono VARCHAR(50) DEFAULT NULL,
  fecha_avistamiento DATE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mascotas_ciudad (ciudad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
