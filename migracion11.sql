-- ============================================================
-- MIGRACIÓN 11 — ejecutar UNA vez en phpMyAdmin sobre tu base
-- de datos en producción. No borra datos existentes.
-- Crea la tabla de Reportes de Daños Estructurales, para
-- solicitar visita técnica de ingenieros.
-- ============================================================

CREATE TABLE IF NOT EXISTS reportes_danos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  radicado VARCHAR(20) NOT NULL UNIQUE,
  ciudad VARCHAR(50) NOT NULL DEFAULT 'manizales',
  tipo_inmueble VARCHAR(50) NOT NULL,
  direccion VARCHAR(200) NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  habitado ENUM('si','no','evacuado') NOT NULL DEFAULT 'si',
  nivel_percibido ENUM('leve','moderado','severo','colapso') NOT NULL DEFAULT 'moderado',
  descripcion TEXT,
  imagen VARCHAR(255) DEFAULT NULL,
  nombre_reporta VARCHAR(150) NOT NULL,
  telefono_reporta VARCHAR(50) NOT NULL,
  cedula_reporta VARCHAR(30) DEFAULT NULL,
  estado ENUM('pendiente','visita_programada','visitado') NOT NULL DEFAULT 'pendiente',
  fecha_visita DATE DEFAULT NULL,
  resultado_visita VARCHAR(150) DEFAULT NULL,
  notas_admin TEXT,
  fecha DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_danos_ciudad (ciudad),
  INDEX idx_danos_radicado (radicado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
