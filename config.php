<?php
// ============================================================
// Configuración - Mapa de Sectores Afectados
// Ajusta estos datos con los de tu hosting InfinityFree
// ============================================================

// IMPORTANTE: usa 127.0.0.1 en vez de localhost, y revisa que
// no queden espacios al inicio/final en estos valores.
//
// En Docker (docker compose) estos valores llegan por variables de
// entorno. En producción (InfinityFree) edita los valores por defecto.
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_NAME', getenv('DB_NAME') ?: 'tu_basededatos');
define('DB_USER', getenv('DB_USER') ?: 'tu_usuario');
define('DB_PASS', getenv('DB_PASS') ?: 'tu_password');

// Contraseña del panel de administración (cámbiala)
define('ADMIN_PASSWORD', getenv('ADMIN_PASSWORD') ?: 'cambia_esta_clave');

function getConexion() {
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error de conexión a la base de datos: ' . $e->getMessage()]);
        exit;
    }
}
