-- ============================================================
-- Mapa de Sectores Afectados - Sismo Manizales 10 de agosto 2026
-- Esquema de base de datos MySQL / MariaDB (InfinityFree)
-- ============================================================

CREATE TABLE IF NOT EXISTS sectores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ciudad VARCHAR(50) NOT NULL DEFAULT 'manizales',
  nombre VARCHAR(150) NOT NULL,
  barrio VARCHAR(150) DEFAULT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  descripcion TEXT,
  nivel_afectacion ENUM('leve','moderado','severo') NOT NULL DEFAULT 'moderado',
  estado ENUM('activo','cerrado') NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sectores_ciudad (ciudad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS contactos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sector_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(50) DEFAULT NULL,
  rol VARCHAR(120) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sector_id) REFERENCES sectores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS necesidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sector_id INT NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  imagen VARCHAR(255) DEFAULT NULL,
  fecha DATE NOT NULL,
  cantidad VARCHAR(100) DEFAULT NULL,
  prioridad ENUM('alta','media','baja') NOT NULL DEFAULT 'media',
  estado ENUM('requiere','atendida') NOT NULL DEFAULT 'requiere',
  responsable_nombre VARCHAR(150) DEFAULT NULL,
  responsable_telefono VARCHAR(50) DEFAULT NULL,
  fecha_compromiso DATE DEFAULT NULL,
  reportado_por VARCHAR(150) DEFAULT NULL,
  telefono_reporta VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sector_id) REFERENCES sectores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Datos de ejemplo (opcional, borra estas líneas si no las necesitas)
INSERT INTO sectores (nombre, barrio, lat, lng, descripcion, nivel_afectacion) VALUES
('Centro Histórico', 'Plaza de Bolívar', 5.0689, -75.5174, 'Zona con daños estructurales en la Catedral y edificios aledaños.', 'severo');

CREATE TABLE IF NOT EXISTS ofrecimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ciudad VARCHAR(50) NOT NULL DEFAULT 'manizales',
  tipo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  imagen VARCHAR(255) DEFAULT NULL,
  cantidad VARCHAR(100) DEFAULT NULL,
  fecha DATE NOT NULL,
  nombre_ofrece VARCHAR(150) NOT NULL,
  telefono_ofrece VARCHAR(50) DEFAULT NULL,
  estado ENUM('disponible','entregado') NOT NULL DEFAULT 'disponible',
  reservado_por_nombre VARCHAR(150) DEFAULT NULL,
  reservado_por_telefono VARCHAR(50) DEFAULT NULL,
  fecha_reserva DATE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ofrecimientos_ciudad (ciudad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE IF NOT EXISTS centros_acopio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ciudad VARCHAR(50) NOT NULL DEFAULT 'manizales',
  nombre VARCHAR(150) NOT NULL,
  organizacion VARCHAR(150) DEFAULT NULL,
  tipo ENUM('acopio','sangre','ambos') NOT NULL DEFAULT 'acopio',
  que_recibe TEXT,
  direccion VARCHAR(200) DEFAULT NULL,
  telefono VARCHAR(50) DEFAULT NULL,
  horario VARCHAR(150) DEFAULT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  estado ENUM('abierto','cerrado') NOT NULL DEFAULT 'abierto',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_centros_ciudad (ciudad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
