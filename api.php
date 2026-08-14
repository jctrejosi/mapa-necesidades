<?php
// ============================================================
// API - Mapa de Sectores Afectados por el Sismo en Manizales
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'config.php';
$pdo = getConexion();

$action = $_GET['action'] ?? $_POST['action'] ?? '';

function esAdmin() {
    $pass = $_GET['admin_password'] ?? $_POST['admin_password'] ?? '';
    return hash_equals(ADMIN_PASSWORD, $pass);
}

function ciudadSolicitada() {
    $ciudad = $_GET['ciudad'] ?? $_POST['ciudad'] ?? 'manizales';
    // Letras, números, guion medio y guion bajo — evita inyección en la consulta
    if (!preg_match('/^[a-z0-9_\-]{1,50}$/', $ciudad)) $ciudad = 'manizales';
    return $ciudad;
}

// Ciudades donde el convenio con la entidad permite recibir reportes de
// daños estructurales. Debe coincidir con CIUDADES_REPORTE_DANOS en
// ciudades.js — cuando se habilite una ciudad nueva, actualiza ambas.
define('CIUDADES_REPORTE_DANOS', ['manizales']);

// Valida que un nombre de archivo de imagen ya subido sea seguro de usar
function nombreImagenValido($nombre) {
    $nombre = trim($nombre);
    if ($nombre === '') return null;
    if (!preg_match('/^[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp)$/i', $nombre)) return null;
    return $nombre;
}

// Genera un código de 4 dígitos para proteger la edición de una publicación
function generarPin() {
    return (string) random_int(1000, 9999);
}

// Genera un número de radicado único para un reporte de daños
function generarRadicado($pdo) {
    do {
        $radicado = 'DA' . str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $stmt = $pdo->prepare("SELECT id FROM reportes_danos WHERE radicado = ?");
        $stmt->execute([$radicado]);
    } while ($stmt->fetch());
    return $radicado;
}

// Verifica el PIN de una publicación antes de dejar editarla.
// Si el registro no tiene PIN guardado (publicaciones de antes de esta
// función), se permite editar sin código para no dejar a nadie bloqueado.
function verificarPin($pdo, $tabla, $id) {
    $stmt = $pdo->prepare("SELECT pin FROM $tabla WHERE id = ?");
    $stmt->execute([$id]);
    $fila = $stmt->fetch();
    if (!$fila) responder(['error' => 'No se encontró el registro'], 404);
    $pinGuardado = $fila['pin'];
    if ($pinGuardado === null || $pinGuardado === '') return; // sin PIN asignado, se permite
    $pinEnviado = trim($_POST['pin'] ?? '');
    if ($pinEnviado !== $pinGuardado) {
        responder(['error' => 'El código no es correcto. Revisa el que guardaste al publicar.'], 403);
    }
}

// Traduce un identificador corto y seguro al nombre real de la tabla,
// para el panel admin (ver/restablecer código). Nunca usa la entrada
// del usuario directamente en la consulta SQL.
function tablaProtegidaValida($id) {
    $mapa = [
        'necesidad' => 'necesidades',
        'ofrecimiento' => 'ofrecimientos',
        'mascota' => 'mascotas_perdidas',
        'vivienda' => 'viviendas',
    ];
    if (!isset($mapa[$id])) responder(['error' => 'Tipo de registro no válido'], 400);
    return $mapa[$id];
}

function responder($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

switch ($action) {

    // ---------------------------------------------------------
    // Subir una imagen (público) — usado por necesidades,
    // ofrecimientos y mascotas perdidas. Devuelve el nombre de
    // archivo para guardarlo junto con el registro correspondiente.
    // ---------------------------------------------------------
    case 'subir_imagen':
        if (!isset($_FILES['imagen']) || $_FILES['imagen']['error'] !== UPLOAD_ERR_OK) {
            responder(['error' => 'No se pudo recibir la imagen'], 400);
        }

        $archivo = $_FILES['imagen'];
        $maxBytes = 4 * 1024 * 1024; // 4MB de margen (el navegador ya la comprime antes de subir)
        if ($archivo['size'] > $maxBytes) {
            responder(['error' => 'La imagen es demasiado pesada (máximo 4MB)'], 400);
        }

        $tiposPermitidos = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $tipoReal = finfo_file($finfo, $archivo['tmp_name']);
        finfo_close($finfo);

        if (!isset($tiposPermitidos[$tipoReal])) {
            responder(['error' => 'Solo se permiten imágenes JPG, PNG o WEBP'], 400);
        }

        $carpetaDestino = __DIR__ . '/uploads/';
        if (!is_dir($carpetaDestino)) mkdir($carpetaDestino, 0755, true);

        $nombreArchivo = uniqid('img_', true) . '.' . $tiposPermitidos[$tipoReal];
        if (!move_uploaded_file($archivo['tmp_name'], $carpetaDestino . $nombreArchivo)) {
            responder(['error' => 'No se pudo guardar la imagen en el servidor'], 500);
        }

        responder(['ok' => true, 'archivo' => $nombreArchivo]);
        break;

    // ---------------------------------------------------------
    // Listar todos los sectores con sus contactos y necesidades
    // ---------------------------------------------------------
    case 'listar_sectores':
        $ciudad = ciudadSolicitada();
        $stmtSect = $pdo->prepare("SELECT * FROM sectores WHERE estado = 'activo' AND ciudad = ? ORDER BY created_at DESC");
        $stmtSect->execute([$ciudad]);
        $sectores = $stmtSect->fetchAll(PDO::FETCH_ASSOC);

        $stmtContactos = $pdo->prepare("SELECT * FROM contactos WHERE sector_id = ? ORDER BY id ASC");
        $stmtNecesidades = $pdo->prepare("SELECT * FROM necesidades WHERE sector_id = ? ORDER BY FIELD(estado,'requiere','atendida'), fecha DESC, FIELD(prioridad,'alta','media','baja')");

        foreach ($sectores as &$s) {
            $stmtContactos->execute([$s['id']]);
            $s['contactos'] = $stmtContactos->fetchAll(PDO::FETCH_ASSOC);

            $stmtNecesidades->execute([$s['id']]);
            $s['necesidades'] = $stmtNecesidades->fetchAll(PDO::FETCH_ASSOC);
        }

        responder(['sectores' => $sectores]);
        break;

    // ---------------------------------------------------------
    // Listar TODO (incluye cerrados) - solo admin
    // ---------------------------------------------------------
    case 'listar_todo_admin':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);

        $ciudad = ciudadSolicitada();
        $stmtSect = $pdo->prepare("SELECT * FROM sectores WHERE ciudad = ? ORDER BY created_at DESC");
        $stmtSect->execute([$ciudad]);
        $sectores = $stmtSect->fetchAll(PDO::FETCH_ASSOC);
        $stmtContactos = $pdo->prepare("SELECT * FROM contactos WHERE sector_id = ? ORDER BY id ASC");
        $stmtNecesidades = $pdo->prepare("SELECT * FROM necesidades WHERE sector_id = ? ORDER BY FIELD(estado,'requiere','atendida'), fecha DESC");

        foreach ($sectores as &$s) {
            $stmtContactos->execute([$s['id']]);
            $s['contactos'] = $stmtContactos->fetchAll(PDO::FETCH_ASSOC);
            $stmtNecesidades->execute([$s['id']]);
            $s['necesidades'] = $stmtNecesidades->fetchAll(PDO::FETCH_ASSOC);
        }
        responder(['sectores' => $sectores]);
        break;

    // ---------------------------------------------------------
    // Crear un nuevo sector (público) - opcionalmente con contacto inicial
    // ---------------------------------------------------------
    case 'crear_sector':
        $ciudad = ciudadSolicitada();
        $nombre = trim($_POST['nombre'] ?? '');
        $barrio = trim($_POST['barrio'] ?? '');
        $lat = $_POST['lat'] ?? null;
        $lng = $_POST['lng'] ?? null;
        $descripcion = trim($_POST['descripcion'] ?? '');
        $nivel = $_POST['nivel_afectacion'] ?? 'moderado';

        if ($nombre === '' || $lat === null || $lng === null) {
            responder(['error' => 'Nombre, latitud y longitud son obligatorios'], 400);
        }
        if (!in_array($nivel, ['leve', 'moderado', 'severo'])) $nivel = 'moderado';

        $stmt = $pdo->prepare("INSERT INTO sectores (ciudad, nombre, barrio, lat, lng, descripcion, nivel_afectacion) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$ciudad, $nombre, $barrio, $lat, $lng, $descripcion, $nivel]);
        $sectorId = $pdo->lastInsertId();

        // Contacto inicial opcional
        $contactoNombre = trim($_POST['contacto_nombre'] ?? '');
        if ($contactoNombre !== '') {
            $stmtC = $pdo->prepare("INSERT INTO contactos (sector_id, nombre, telefono, rol) VALUES (?, ?, ?, ?)");
            $stmtC->execute([
                $sectorId,
                $contactoNombre,
                trim($_POST['contacto_telefono'] ?? ''),
                trim($_POST['contacto_rol'] ?? '')
            ]);
        }

        responder(['ok' => true, 'sector_id' => $sectorId]);
        break;

    // ---------------------------------------------------------
    // Actualizar sector - admin
    // ---------------------------------------------------------
    case 'actualizar_sector':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);

        $id = $_POST['id'] ?? 0;
        $nombre = trim($_POST['nombre'] ?? '');
        $barrio = trim($_POST['barrio'] ?? '');
        $descripcion = trim($_POST['descripcion'] ?? '');
        $nivel = $_POST['nivel_afectacion'] ?? 'moderado';
        $estado = $_POST['estado'] ?? 'activo';

        $stmt = $pdo->prepare("UPDATE sectores SET nombre=?, barrio=?, descripcion=?, nivel_afectacion=?, estado=? WHERE id=?");
        $stmt->execute([$nombre, $barrio, $descripcion, $nivel, $estado, $id]);

        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Cambiar solo el estado (activo/cerrado) de un sector - admin
    // ---------------------------------------------------------
    case 'cambiar_estado_sector':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $estado = $_POST['estado'] ?? 'activo';
        if (!in_array($estado, ['activo', 'cerrado'])) $estado = 'activo';

        $stmt = $pdo->prepare("UPDATE sectores SET estado=? WHERE id=?");
        $stmt->execute([$estado, $id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Eliminar sector - admin
    // ---------------------------------------------------------
    case 'eliminar_sector':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM sectores WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Agregar contacto a un sector existente (público)
    // ---------------------------------------------------------
    case 'crear_contacto':
        $sectorId = $_POST['sector_id'] ?? 0;
        $nombre = trim($_POST['nombre'] ?? '');
        $telefono = trim($_POST['telefono'] ?? '');
        $rol = trim($_POST['rol'] ?? '');

        if (!$sectorId || $nombre === '') responder(['error' => 'Sector y nombre son obligatorios'], 400);

        $stmt = $pdo->prepare("INSERT INTO contactos (sector_id, nombre, telefono, rol) VALUES (?, ?, ?, ?)");
        $stmt->execute([$sectorId, $nombre, $telefono, $rol]);

        responder(['ok' => true, 'id' => $pdo->lastInsertId()]);
        break;

    // ---------------------------------------------------------
    // Editar contacto - admin
    // ---------------------------------------------------------
    case 'actualizar_contacto':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $nombre = trim($_POST['nombre'] ?? '');
        $telefono = trim($_POST['telefono'] ?? '');
        $rol = trim($_POST['rol'] ?? '');

        if ($nombre === '') responder(['error' => 'El nombre es obligatorio'], 400);

        $stmt = $pdo->prepare("UPDATE contactos SET nombre=?, telefono=?, rol=? WHERE id=?");
        $stmt->execute([$nombre, $telefono, $rol, $id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Eliminar contacto - admin
    // ---------------------------------------------------------
    case 'eliminar_contacto':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM contactos WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Reportar una necesidad en un sector (público)
    // ---------------------------------------------------------
    case 'crear_necesidad':
        $sectorId = $_POST['sector_id'] ?? 0;
        $tipo = trim($_POST['tipo'] ?? '');
        $descripcion = trim($_POST['descripcion'] ?? '');
        $imagen = nombreImagenValido($_POST['imagen'] ?? '');
        $fecha = trim($_POST['fecha'] ?? '') ?: date('Y-m-d');
        $cantidad = trim($_POST['cantidad'] ?? '');
        $prioridad = $_POST['prioridad'] ?? 'media';
        $reportadoPor = trim($_POST['reportado_por'] ?? '');
        $telefonoReporta = trim($_POST['telefono_reporta'] ?? '');
        $pin = generarPin();

        if (!$sectorId || $tipo === '') responder(['error' => 'Sector y tipo de necesidad son obligatorios'], 400);
        if (!in_array($prioridad, ['alta', 'media', 'baja'])) $prioridad = 'media';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $fecha = date('Y-m-d');

        $stmt = $pdo->prepare("INSERT INTO necesidades (pin, sector_id, tipo, descripcion, imagen, fecha, cantidad, prioridad, reportado_por, telefono_reporta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$pin, $sectorId, $tipo, $descripcion, $imagen, $fecha, $cantidad, $prioridad, $reportadoPor, $telefonoReporta]);

        responder(['ok' => true, 'id' => $pdo->lastInsertId(), 'pin' => $pin]);
        break;

    // ---------------------------------------------------------
    // Cambiar estado de una necesidad - admin
    // ---------------------------------------------------------
    case 'actualizar_necesidad':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $tipo = trim($_POST['tipo'] ?? '');
        $descripcion = trim($_POST['descripcion'] ?? '');
        $imagenNueva = nombreImagenValido($_POST['imagen'] ?? '');
        $cantidad = trim($_POST['cantidad'] ?? '');
        $fecha = trim($_POST['fecha'] ?? '') ?: date('Y-m-d');
        $prioridad = $_POST['prioridad'] ?? 'media';
        $estado = $_POST['estado'] ?? 'requiere';
        $responsableNombre = trim($_POST['responsable_nombre'] ?? '');
        $responsableTelefono = trim($_POST['responsable_telefono'] ?? '');

        if ($tipo === '') responder(['error' => 'El tipo de necesidad es obligatorio'], 400);
        if (!in_array($prioridad, ['alta', 'media', 'baja'])) $prioridad = 'media';
        if (!in_array($estado, ['requiere', 'atendida'])) $estado = 'requiere';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $fecha = date('Y-m-d');

        if ($imagenNueva) {
            $stmt = $pdo->prepare("UPDATE necesidades SET tipo=?, descripcion=?, imagen=?, cantidad=?, fecha=?, prioridad=?, estado=?, responsable_nombre=?, responsable_telefono=? WHERE id=?");
            $stmt->execute([$tipo, $descripcion, $imagenNueva, $cantidad, $fecha, $prioridad, $estado, $responsableNombre ?: null, $responsableTelefono ?: null, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE necesidades SET tipo=?, descripcion=?, cantidad=?, fecha=?, prioridad=?, estado=?, responsable_nombre=?, responsable_telefono=? WHERE id=?");
            $stmt->execute([$tipo, $descripcion, $cantidad, $fecha, $prioridad, $estado, $responsableNombre ?: null, $responsableTelefono ?: null, $id]);
        }
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Actualizar el avance de una necesidad (público, autoservicio)
    // ---------------------------------------------------------
    case 'actualizar_necesidad_publico':
        $id = $_POST['id'] ?? 0;
        $cantidad = trim($_POST['cantidad'] ?? '');
        $descripcion = trim($_POST['descripcion'] ?? '');
        $imagenNueva = nombreImagenValido($_POST['imagen'] ?? '');
        $prioridad = $_POST['prioridad'] ?? 'media';
        $estado = $_POST['estado'] ?? 'requiere';

        if (!$id) responder(['error' => 'Falta identificar la necesidad'], 400);
        verificarPin($pdo, 'necesidades', $id);
        if (!in_array($prioridad, ['alta', 'media', 'baja'])) $prioridad = 'media';
        if (!in_array($estado, ['requiere', 'atendida'])) $estado = 'requiere';

        if ($imagenNueva) {
            $stmt = $pdo->prepare("UPDATE necesidades SET cantidad=?, descripcion=?, imagen=?, prioridad=?, estado=? WHERE id=?");
            $stmt->execute([$cantidad, $descripcion, $imagenNueva, $prioridad, $estado, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE necesidades SET cantidad=?, descripcion=?, prioridad=?, estado=? WHERE id=?");
            $stmt->execute([$cantidad, $descripcion, $prioridad, $estado, $id]);
        }
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Alguien se compromete a resolver una necesidad (público)
    // ---------------------------------------------------------
    case 'asignar_responsable':
        $id = $_POST['id'] ?? 0;
        $nombre = trim($_POST['responsable_nombre'] ?? '');
        $telefono = trim($_POST['responsable_telefono'] ?? '');

        if (!$id || $nombre === '') responder(['error' => 'El nombre de quien va a ayudar es obligatorio'], 400);

        $stmt = $pdo->prepare("UPDATE necesidades SET responsable_nombre=?, responsable_telefono=?, fecha_compromiso=? WHERE id=?");
        $stmt->execute([$nombre, $telefono, date('Y-m-d'), $id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Quitar el responsable asignado (si ya no puede ayudar) - público/admin
    // ---------------------------------------------------------
    case 'quitar_responsable':
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("UPDATE necesidades SET responsable_nombre=NULL, responsable_telefono=NULL, fecha_compromiso=NULL WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Cambio rápido de estado (solo el checkbox "atendida") - admin
    // ---------------------------------------------------------
    case 'marcar_estado_necesidad':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $estado = $_POST['estado'] ?? 'requiere';
        if (!in_array($estado, ['requiere', 'atendida'])) $estado = 'requiere';

        $stmt = $pdo->prepare("UPDATE necesidades SET estado=? WHERE id=?");
        $stmt->execute([$estado, $id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Eliminar necesidad - admin
    // ---------------------------------------------------------
    case 'eliminar_necesidad':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM necesidades WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Estadísticas para el dashboard (público)
    // ---------------------------------------------------------
    case 'estadisticas':
        $ciudad = ciudadSolicitada();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM sectores WHERE estado = 'activo' AND ciudad = ?");
        $stmt->execute([$ciudad]);
        $totalSectores = (int) $stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM necesidades n JOIN sectores s ON s.id = n.sector_id WHERE s.ciudad = ?");
        $stmt->execute([$ciudad]);
        $totalNecesidades = (int) $stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM necesidades n JOIN sectores s ON s.id = n.sector_id WHERE s.ciudad = ? AND n.estado = 'atendida'");
        $stmt->execute([$ciudad]);
        $atendidas = (int) $stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM necesidades n JOIN sectores s ON s.id = n.sector_id WHERE s.ciudad = ? AND n.estado = 'requiere' AND n.responsable_nombre IS NOT NULL AND n.responsable_nombre <> ''");
        $stmt->execute([$ciudad]);
        $enProceso = (int) $stmt->fetchColumn();

        $sinAsignar = $totalNecesidades - $atendidas - $enProceso;

        $stmt = $pdo->prepare("
            SELECT n.tipo,
                   COUNT(*) AS total,
                   SUM(n.estado = 'atendida') AS atendidas,
                   SUM(n.estado = 'requiere' AND n.responsable_nombre IS NOT NULL AND n.responsable_nombre <> '') AS en_proceso
            FROM necesidades n
            JOIN sectores s ON s.id = n.sector_id
            WHERE s.ciudad = ?
            GROUP BY n.tipo
            ORDER BY total DESC
        ");
        $stmt->execute([$ciudad]);
        $porTipo = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $pdo->prepare("
            SELECT s.id, s.nombre, s.lat, s.lng,
                   COUNT(n.id) AS total,
                   SUM(n.estado = 'atendida') AS atendidas,
                   SUM(n.estado = 'requiere' AND (n.responsable_nombre IS NULL OR n.responsable_nombre = '')) AS sin_asignar,
                   SUM(n.estado = 'requiere' AND n.responsable_nombre IS NOT NULL AND n.responsable_nombre <> '') AS en_proceso
            FROM sectores s
            LEFT JOIN necesidades n ON n.sector_id = s.id
            WHERE s.estado = 'activo' AND s.ciudad = ?
            GROUP BY s.id
            HAVING total > 0
            ORDER BY total DESC
        ");
        $stmt->execute([$ciudad]);
        $porSector = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM ofrecimientos WHERE ciudad = ?");
        $stmt->execute([$ciudad]);
        $totalOfrecimientos = (int) $stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM ofrecimientos WHERE ciudad = ? AND estado = 'disponible'");
        $stmt->execute([$ciudad]);
        $ofrecimientosDisponibles = (int) $stmt->fetchColumn();

        responder([
            'total_sectores' => $totalSectores,
            'total_necesidades' => $totalNecesidades,
            'atendidas' => $atendidas,
            'en_proceso' => $enProceso,
            'sin_asignar' => max(0, $sinAsignar),
            'por_tipo' => $porTipo,
            'por_sector' => $porSector,
            'total_ofrecimientos' => $totalOfrecimientos,
            'ofrecimientos_disponibles' => $ofrecimientosDisponibles
        ]);
        break;

    // ============================================================
    // OFRECIMIENTOS (ayuda que la gente ofrece, sin ubicación en mapa)
    // ============================================================

    // ---------------------------------------------------------
    // Listar ofrecimientos disponibles/entregados (público)
    // ---------------------------------------------------------
    case 'listar_ofrecimientos':
        $ciudad = ciudadSolicitada();
        $stmt = $pdo->prepare("
            SELECT * FROM ofrecimientos
            WHERE ciudad = ?
            ORDER BY FIELD(estado,'disponible','entregado'), fecha DESC
        ");
        $stmt->execute([$ciudad]);
        $ofrecimientos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        responder(['ofrecimientos' => $ofrecimientos]);
        break;

    // ---------------------------------------------------------
    // Crear un ofrecimiento (público)
    // ---------------------------------------------------------
    case 'crear_ofrecimiento':
        $ciudad = ciudadSolicitada();
        $tipo = trim($_POST['tipo'] ?? '');
        $descripcion = trim($_POST['descripcion'] ?? '');
        $imagen = nombreImagenValido($_POST['imagen'] ?? '');
        $cantidad = trim($_POST['cantidad'] ?? '');
        $fecha = trim($_POST['fecha'] ?? '') ?: date('Y-m-d');
        $nombre = trim($_POST['nombre_ofrece'] ?? '');
        $telefono = trim($_POST['telefono_ofrece'] ?? '');
        $pin = generarPin();

        if ($tipo === '' || $nombre === '') responder(['error' => 'El tipo y tu nombre son obligatorios'], 400);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $fecha = date('Y-m-d');

        $stmt = $pdo->prepare("INSERT INTO ofrecimientos (pin, ciudad, tipo, descripcion, imagen, cantidad, fecha, nombre_ofrece, telefono_ofrece) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$pin, $ciudad, $tipo, $descripcion, $imagen, $cantidad, $fecha, $nombre, $telefono]);
        responder(['ok' => true, 'id' => $pdo->lastInsertId(), 'pin' => $pin]);
        break;

    // ---------------------------------------------------------
    // Actualizar avance de un ofrecimiento (público, autoservicio)
    // ---------------------------------------------------------
    case 'actualizar_ofrecimiento_publico':
        $id = $_POST['id'] ?? 0;
        $descripcion = trim($_POST['descripcion'] ?? '');
        $imagenNueva = nombreImagenValido($_POST['imagen'] ?? '');
        $cantidad = trim($_POST['cantidad'] ?? '');
        $estado = $_POST['estado'] ?? 'disponible';

        if (!$id) responder(['error' => 'Falta identificar el ofrecimiento'], 400);
        verificarPin($pdo, 'ofrecimientos', $id);
        if (!in_array($estado, ['disponible', 'entregado'])) $estado = 'disponible';

        if ($imagenNueva) {
            $stmt = $pdo->prepare("UPDATE ofrecimientos SET descripcion=?, imagen=?, cantidad=?, estado=? WHERE id=?");
            $stmt->execute([$descripcion, $imagenNueva, $cantidad, $estado, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE ofrecimientos SET descripcion=?, cantidad=?, estado=? WHERE id=?");
            $stmt->execute([$descripcion, $cantidad, $estado, $id]);
        }
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Reservar / coordinar un ofrecimiento (público)
    // ---------------------------------------------------------
    case 'reservar_ofrecimiento':
        $id = $_POST['id'] ?? 0;
        $nombre = trim($_POST['reservado_por_nombre'] ?? '');
        $telefono = trim($_POST['reservado_por_telefono'] ?? '');

        if (!$id || $nombre === '') responder(['error' => 'Tu nombre es obligatorio'], 400);

        $stmt = $pdo->prepare("UPDATE ofrecimientos SET reservado_por_nombre=?, reservado_por_telefono=?, fecha_reserva=? WHERE id=?");
        $stmt->execute([$nombre, $telefono, date('Y-m-d'), $id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Liberar la reserva de un ofrecimiento (público)
    // ---------------------------------------------------------
    case 'liberar_reserva_ofrecimiento':
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("UPDATE ofrecimientos SET reservado_por_nombre=NULL, reservado_por_telefono=NULL, fecha_reserva=NULL WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Eliminar ofrecimiento - admin
    // ---------------------------------------------------------
    case 'eliminar_ofrecimiento':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM ofrecimientos WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ============================================================
    // MASCOTAS PERDIDAS
    // ============================================================

    // ---------------------------------------------------------
    // Listar mascotas perdidas/encontradas (público)
    // ---------------------------------------------------------
    case 'listar_mascotas':
        $ciudad = ciudadSolicitada();
        $stmt = $pdo->prepare("
            SELECT * FROM mascotas_perdidas
            WHERE ciudad = ?
            ORDER BY FIELD(estado,'perdido','encontrado'), fecha_visto DESC
        ");
        $stmt->execute([$ciudad]);
        responder(['mascotas' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ---------------------------------------------------------
    // Reportar una mascota perdida (público)
    // ---------------------------------------------------------
    case 'crear_mascota':
        $ciudad = ciudadSolicitada();
        $nombreMascota = trim($_POST['nombre_mascota'] ?? '');
        $tipoAnimal = trim($_POST['tipo_animal'] ?? '');
        $senas = trim($_POST['senas'] ?? '');
        $imagen = nombreImagenValido($_POST['imagen'] ?? '');
        $lat = $_POST['lat'] ?? null;
        $lng = $_POST['lng'] ?? null;
        $lugarVisto = trim($_POST['lugar_visto'] ?? '');
        $fechaVisto = trim($_POST['fecha_visto'] ?? '') ?: date('Y-m-d');
        $nombreReporta = trim($_POST['nombre_reporta'] ?? '');
        $telefonoReporta = trim($_POST['telefono_reporta'] ?? '');
        $pin = generarPin();

        if ($tipoAnimal === '' || $lat === null || $lng === null || $nombreReporta === '' || $telefonoReporta === '') {
            responder(['error' => 'Tipo de animal, ubicación y tus datos de contacto son obligatorios'], 400);
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaVisto)) $fechaVisto = date('Y-m-d');

        $stmt = $pdo->prepare("INSERT INTO mascotas_perdidas (pin, ciudad, nombre_mascota, tipo_animal, senas, imagen, lat, lng, lugar_visto, fecha_visto, nombre_reporta, telefono_reporta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$pin, $ciudad, $nombreMascota, $tipoAnimal, $senas, $imagen, $lat, $lng, $lugarVisto, $fechaVisto, $nombreReporta, $telefonoReporta]);
        responder(['ok' => true, 'id' => $pdo->lastInsertId(), 'pin' => $pin]);
        break;

    // ---------------------------------------------------------
    // Actualizar una mascota (público, autoservicio: dueño o quien
    // ayuda puede corregir datos o marcarla como encontrada)
    // ---------------------------------------------------------
    case 'actualizar_mascota_publico':
        $id = $_POST['id'] ?? 0;
        $nombreMascota = trim($_POST['nombre_mascota'] ?? '');
        $senas = trim($_POST['senas'] ?? '');
        $imagenNueva = nombreImagenValido($_POST['imagen'] ?? '');
        $estado = $_POST['estado'] ?? 'perdido';

        if (!$id) responder(['error' => 'Falta identificar el registro'], 400);
        verificarPin($pdo, 'mascotas_perdidas', $id);
        if (!in_array($estado, ['perdido', 'encontrado'])) $estado = 'perdido';

        if ($imagenNueva) {
            $stmt = $pdo->prepare("UPDATE mascotas_perdidas SET nombre_mascota=?, senas=?, imagen=?, estado=? WHERE id=?");
            $stmt->execute([$nombreMascota, $senas, $imagenNueva, $estado, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE mascotas_perdidas SET nombre_mascota=?, senas=?, estado=? WHERE id=?");
            $stmt->execute([$nombreMascota, $senas, $estado, $id]);
        }
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // "Yo la vi" / "la tengo yo" (público)
    // ---------------------------------------------------------
    case 'avistar_mascota':
        $id = $_POST['id'] ?? 0;
        $nombre = trim($_POST['avistado_por_nombre'] ?? '');
        $telefono = trim($_POST['avistado_por_telefono'] ?? '');

        if (!$id || $nombre === '') responder(['error' => 'Tu nombre es obligatorio'], 400);

        $stmt = $pdo->prepare("UPDATE mascotas_perdidas SET avistado_por_nombre=?, avistado_por_telefono=?, fecha_avistamiento=? WHERE id=?");
        $stmt->execute([$nombre, $telefono, date('Y-m-d'), $id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Liberar un avistamiento (público)
    // ---------------------------------------------------------
    case 'quitar_avistamiento':
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("UPDATE mascotas_perdidas SET avistado_por_nombre=NULL, avistado_por_telefono=NULL, fecha_avistamiento=NULL WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Listar todas las mascotas (admin)
    // ---------------------------------------------------------
    case 'listar_todo_mascotas_admin':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $ciudad = ciudadSolicitada();
        $stmt = $pdo->prepare("SELECT * FROM mascotas_perdidas WHERE ciudad = ? ORDER BY created_at DESC");
        $stmt->execute([$ciudad]);
        responder(['mascotas' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ---------------------------------------------------------
    // Eliminar mascota - admin
    // ---------------------------------------------------------
    case 'eliminar_mascota':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM mascotas_perdidas WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ============================================================
    // CENTROS DE ACOPIO Y BANCOS DE SANGRE
    // Puntos fijos e institucionales — solo el admin los crea,
    // edita o elimina. El público únicamente los consulta.
    // ============================================================

    // ---------------------------------------------------------
    // Listar centros (público) — incluye cerrados, marcados como tal
    // ---------------------------------------------------------
    case 'listar_centros':
        $ciudad = ciudadSolicitada();
        $stmt = $pdo->prepare("
            SELECT * FROM centros_acopio
            WHERE ciudad = ?
            ORDER BY FIELD(estado,'abierto','cerrado'), nombre ASC
        ");
        $stmt->execute([$ciudad]);
        responder(['centros' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ---------------------------------------------------------
    // Crear centro - admin
    // ---------------------------------------------------------
    case 'crear_centro':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $ciudad = ciudadSolicitada();
        $nombre = trim($_POST['nombre'] ?? '');
        $organizacion = trim($_POST['organizacion'] ?? '');
        $esAcopio = !empty($_POST['es_acopio']) ? 1 : 0;
        $esSangre = !empty($_POST['es_sangre']) ? 1 : 0;
        $esAlojamiento = !empty($_POST['es_alojamiento']) ? 1 : 0;
        $queRecibe = trim($_POST['que_recibe'] ?? '');
        $imagen = nombreImagenValido($_POST['imagen'] ?? '');
        $direccion = trim($_POST['direccion'] ?? '');
        $telefono = trim($_POST['telefono'] ?? '');
        $horario = trim($_POST['horario'] ?? '');
        $lat = $_POST['lat'] ?? null;
        $lng = $_POST['lng'] ?? null;
        $estado = $_POST['estado'] ?? 'abierto';

        if ($nombre === '' || $lat === null || $lng === null) {
            responder(['error' => 'Nombre y ubicación son obligatorios'], 400);
        }
        if (!$esAcopio && !$esSangre && !$esAlojamiento) {
            responder(['error' => 'Marca al menos un tipo: acopio, sangre o alojamiento'], 400);
        }
        if (!in_array($estado, ['abierto', 'cerrado'])) $estado = 'abierto';

        $stmt = $pdo->prepare("INSERT INTO centros_acopio (ciudad, nombre, organizacion, es_acopio, es_sangre, es_alojamiento, que_recibe, imagen, direccion, telefono, horario, lat, lng, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$ciudad, $nombre, $organizacion, $esAcopio, $esSangre, $esAlojamiento, $queRecibe, $imagen, $direccion, $telefono, $horario, $lat, $lng, $estado]);
        responder(['ok' => true, 'id' => $pdo->lastInsertId()]);
        break;

    // ---------------------------------------------------------
    // Editar centro - admin
    // ---------------------------------------------------------
    case 'actualizar_centro':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $nombre = trim($_POST['nombre'] ?? '');
        $organizacion = trim($_POST['organizacion'] ?? '');
        $esAcopio = !empty($_POST['es_acopio']) ? 1 : 0;
        $esSangre = !empty($_POST['es_sangre']) ? 1 : 0;
        $esAlojamiento = !empty($_POST['es_alojamiento']) ? 1 : 0;
        $queRecibe = trim($_POST['que_recibe'] ?? '');
        $imagenNueva = nombreImagenValido($_POST['imagen'] ?? '');
        $direccion = trim($_POST['direccion'] ?? '');
        $telefono = trim($_POST['telefono'] ?? '');
        $horario = trim($_POST['horario'] ?? '');
        $lat = $_POST['lat'] ?? null;
        $lng = $_POST['lng'] ?? null;
        $estado = $_POST['estado'] ?? 'abierto';

        if ($nombre === '' || $lat === null || $lng === null) {
            responder(['error' => 'Nombre y ubicación son obligatorios'], 400);
        }
        if (!$esAcopio && !$esSangre && !$esAlojamiento) {
            responder(['error' => 'Marca al menos un tipo: acopio, sangre o alojamiento'], 400);
        }
        if (!in_array($estado, ['abierto', 'cerrado'])) $estado = 'abierto';

        if ($imagenNueva) {
            $stmt = $pdo->prepare("UPDATE centros_acopio SET nombre=?, organizacion=?, es_acopio=?, es_sangre=?, es_alojamiento=?, que_recibe=?, imagen=?, direccion=?, telefono=?, horario=?, lat=?, lng=?, estado=? WHERE id=?");
            $stmt->execute([$nombre, $organizacion, $esAcopio, $esSangre, $esAlojamiento, $queRecibe, $imagenNueva, $direccion, $telefono, $horario, $lat, $lng, $estado, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE centros_acopio SET nombre=?, organizacion=?, es_acopio=?, es_sangre=?, es_alojamiento=?, que_recibe=?, direccion=?, telefono=?, horario=?, lat=?, lng=?, estado=? WHERE id=?");
            $stmt->execute([$nombre, $organizacion, $esAcopio, $esSangre, $esAlojamiento, $queRecibe, $direccion, $telefono, $horario, $lat, $lng, $estado, $id]);
        }
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Eliminar centro - admin
    // ---------------------------------------------------------
    case 'eliminar_centro':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM centros_acopio WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ============================================================
    // NOTICIAS / COMUNICADOS
    // Publicaciones oficiales — solo el admin las crea, edita o
    // elimina. El público únicamente las lee.
    // ============================================================

    // ---------------------------------------------------------
    // Listar noticias (público) — de la ciudad actual + las
    // marcadas como "todas las ciudades"
    // ---------------------------------------------------------
    case 'listar_noticias':
        $ciudad = ciudadSolicitada();
        $stmt = $pdo->prepare("
            SELECT * FROM noticias
            WHERE ciudad = ? OR ciudad IS NULL
            ORDER BY fecha DESC, id DESC
        ");
        $stmt->execute([$ciudad]);
        responder(['noticias' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ---------------------------------------------------------
    // Crear noticia - admin
    // ---------------------------------------------------------
    case 'crear_noticia':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $ciudadPost = trim($_POST['ciudad'] ?? '');
        $ciudad = ($ciudadPost === '' || $ciudadPost === 'todas') ? null : $ciudadPost;
        $titulo = trim($_POST['titulo'] ?? '');
        $contenido = trim($_POST['contenido'] ?? '');
        $imagen = nombreImagenValido($_POST['imagen'] ?? '');
        $autor = trim($_POST['autor'] ?? '');
        $fecha = trim($_POST['fecha'] ?? '') ?: date('Y-m-d');

        if ($titulo === '' || $contenido === '') responder(['error' => 'Título y contenido son obligatorios'], 400);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $fecha = date('Y-m-d');

        $stmt = $pdo->prepare("INSERT INTO noticias (ciudad, titulo, contenido, imagen, autor, fecha) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$ciudad, $titulo, $contenido, $imagen, $autor, $fecha]);
        responder(['ok' => true, 'id' => $pdo->lastInsertId()]);
        break;

    // ---------------------------------------------------------
    // Editar noticia - admin
    // ---------------------------------------------------------
    case 'actualizar_noticia':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $ciudadPost = trim($_POST['ciudad'] ?? '');
        $ciudad = ($ciudadPost === '' || $ciudadPost === 'todas') ? null : $ciudadPost;
        $titulo = trim($_POST['titulo'] ?? '');
        $contenido = trim($_POST['contenido'] ?? '');
        $imagenNueva = nombreImagenValido($_POST['imagen'] ?? '');
        $autor = trim($_POST['autor'] ?? '');
        $fecha = trim($_POST['fecha'] ?? '') ?: date('Y-m-d');

        if ($titulo === '' || $contenido === '') responder(['error' => 'Título y contenido son obligatorios'], 400);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $fecha = date('Y-m-d');

        if ($imagenNueva) {
            $stmt = $pdo->prepare("UPDATE noticias SET ciudad=?, titulo=?, contenido=?, imagen=?, autor=?, fecha=? WHERE id=?");
            $stmt->execute([$ciudad, $titulo, $contenido, $imagenNueva, $autor, $fecha, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE noticias SET ciudad=?, titulo=?, contenido=?, autor=?, fecha=? WHERE id=?");
            $stmt->execute([$ciudad, $titulo, $contenido, $autor, $fecha, $id]);
        }
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Eliminar noticia - admin
    // ---------------------------------------------------------
    case 'eliminar_noticia':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM noticias WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ============================================================
    // VIVIENDA / ALOJAMIENTO
    // Ofertas de alquiler o alojamiento gratuito publicadas por
    // la comunidad (autoservicio, igual que ofrecimientos).
    // ============================================================

    // ---------------------------------------------------------
    // Listar viviendas (público)
    // ---------------------------------------------------------
    case 'listar_viviendas':
        $ciudad = ciudadSolicitada();
        $stmt = $pdo->prepare("
            SELECT * FROM viviendas
            WHERE ciudad = ?
            ORDER BY FIELD(estado,'disponible','ocupado'), fecha DESC
        ");
        $stmt->execute([$ciudad]);
        responder(['viviendas' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ---------------------------------------------------------
    // Publicar una oferta de vivienda (público)
    // ---------------------------------------------------------
    case 'crear_vivienda':
        $ciudad = ciudadSolicitada();
        $tipo = $_POST['tipo'] ?? 'gratis';
        $precio = trim($_POST['precio'] ?? '');
        $capacidad = trim($_POST['capacidad'] ?? '');
        $tiempoDisponible = trim($_POST['tiempo_disponible'] ?? '');
        $sectorReferencia = trim($_POST['sector_referencia'] ?? '');
        $descripcion = trim($_POST['descripcion'] ?? '');
        $imagen = nombreImagenValido($_POST['imagen'] ?? '');
        $nombreOfrece = trim($_POST['nombre_ofrece'] ?? '');
        $telefonoOfrece = trim($_POST['telefono_ofrece'] ?? '');
        $fecha = trim($_POST['fecha'] ?? '') ?: date('Y-m-d');
        $pin = generarPin();

        if ($nombreOfrece === '' || $telefonoOfrece === '') {
            responder(['error' => 'Tus datos de contacto son obligatorios'], 400);
        }
        if (!in_array($tipo, ['gratis', 'alquiler'])) $tipo = 'gratis';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $fecha = date('Y-m-d');

        $stmt = $pdo->prepare("INSERT INTO viviendas (pin, ciudad, tipo, precio, capacidad, tiempo_disponible, sector_referencia, descripcion, imagen, nombre_ofrece, telefono_ofrece, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$pin, $ciudad, $tipo, $precio, $capacidad, $tiempoDisponible, $sectorReferencia, $descripcion, $imagen, $nombreOfrece, $telefonoOfrece, $fecha]);
        responder(['ok' => true, 'id' => $pdo->lastInsertId(), 'pin' => $pin]);
        break;

    // ---------------------------------------------------------
    // Actualizar una oferta de vivienda (público, autoservicio)
    // ---------------------------------------------------------
    case 'actualizar_vivienda_publico':
        $id = $_POST['id'] ?? 0;
        $precio = trim($_POST['precio'] ?? '');
        $capacidad = trim($_POST['capacidad'] ?? '');
        $tiempoDisponible = trim($_POST['tiempo_disponible'] ?? '');
        $sectorReferencia = trim($_POST['sector_referencia'] ?? '');
        $descripcion = trim($_POST['descripcion'] ?? '');
        $imagenNueva = nombreImagenValido($_POST['imagen'] ?? '');
        $estado = $_POST['estado'] ?? 'disponible';

        if (!$id) responder(['error' => 'Falta identificar la vivienda'], 400);
        verificarPin($pdo, 'viviendas', $id);
        if (!in_array($estado, ['disponible', 'ocupado'])) $estado = 'disponible';

        if ($imagenNueva) {
            $stmt = $pdo->prepare("UPDATE viviendas SET precio=?, capacidad=?, tiempo_disponible=?, sector_referencia=?, descripcion=?, imagen=?, estado=? WHERE id=?");
            $stmt->execute([$precio, $capacidad, $tiempoDisponible, $sectorReferencia, $descripcion, $imagenNueva, $estado, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE viviendas SET precio=?, capacidad=?, tiempo_disponible=?, sector_referencia=?, descripcion=?, estado=? WHERE id=?");
            $stmt->execute([$precio, $capacidad, $tiempoDisponible, $sectorReferencia, $descripcion, $estado, $id]);
        }
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // "Estoy interesado / la tomo" (público)
    // ---------------------------------------------------------
    case 'marcar_interesado':
        $id = $_POST['id'] ?? 0;
        $nombre = trim($_POST['interesado_nombre'] ?? '');
        $telefono = trim($_POST['interesado_telefono'] ?? '');

        if (!$id || $nombre === '') responder(['error' => 'Tu nombre es obligatorio'], 400);

        $stmt = $pdo->prepare("UPDATE viviendas SET interesado_nombre=?, interesado_telefono=?, fecha_interes=? WHERE id=?");
        $stmt->execute([$nombre, $telefono, date('Y-m-d'), $id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Liberar el interés marcado (público)
    // ---------------------------------------------------------
    case 'quitar_interesado':
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("UPDATE viviendas SET interesado_nombre=NULL, interesado_telefono=NULL, fecha_interes=NULL WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Eliminar vivienda - admin
    // ---------------------------------------------------------
    case 'eliminar_vivienda':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM viviendas WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Ver el código de edición de una publicación - admin
    // ---------------------------------------------------------
    case 'ver_pin':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $tabla = tablaProtegidaValida($_POST['tabla'] ?? $_GET['tabla'] ?? '');
        $id = $_POST['id'] ?? $_GET['id'] ?? 0;
        $stmt = $pdo->prepare("SELECT pin FROM $tabla WHERE id = ?");
        $stmt->execute([$id]);
        $fila = $stmt->fetch();
        if (!$fila) responder(['error' => 'No se encontró el registro'], 404);
        responder(['ok' => true, 'pin' => $fila['pin']]);
        break;

    // ---------------------------------------------------------
    // Generar un código nuevo para una publicación - admin
    // ---------------------------------------------------------
    case 'restablecer_pin':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $tabla = tablaProtegidaValida($_POST['tabla'] ?? '');
        $id = $_POST['id'] ?? 0;
        $nuevoPin = generarPin();
        $stmt = $pdo->prepare("UPDATE $tabla SET pin = ? WHERE id = ?");
        $stmt->execute([$nuevoPin, $id]);
        responder(['ok' => true, 'pin' => $nuevoPin]);
        break;

    // ============================================================
    // REPORTES DE DAÑOS ESTRUCTURALES (visita técnica de ingenieros)
    // ============================================================

    // ---------------------------------------------------------
    // Listar reportes para el mapa público — SIN datos de
    // contacto del propietario (nombre, teléfono, cédula, notas
    // internas). Eso solo lo ve el admin.
    // ---------------------------------------------------------
    case 'listar_danos_publico':
        $ciudad = ciudadSolicitada();
        $stmt = $pdo->prepare("
            SELECT id, tipo_inmueble, direccion, lat, lng, habitado, nivel_percibido, imagen, estado, resultado_visita, fecha
            FROM reportes_danos
            WHERE ciudad = ?
            ORDER BY FIELD(estado,'pendiente','visita_programada','visitado'), fecha DESC
        ");
        $stmt->execute([$ciudad]);
        responder(['reportes' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ---------------------------------------------------------
    // Reportar un daño estructural (público)
    // ---------------------------------------------------------
    case 'crear_dano':
        $ciudad = ciudadSolicitada();
        if (!in_array($ciudad, CIUDADES_REPORTE_DANOS)) {
            responder(['error' => 'El reporte de daños todavía no está disponible en esta ciudad'], 403);
        }
        $tipoInmueble = trim($_POST['tipo_inmueble'] ?? '');
        $direccion = trim($_POST['direccion'] ?? '');
        $lat = $_POST['lat'] ?? null;
        $lng = $_POST['lng'] ?? null;
        $habitado = $_POST['habitado'] ?? 'si';
        $nivelPercibido = $_POST['nivel_percibido'] ?? 'moderado';
        $descripcion = trim($_POST['descripcion'] ?? '');
        $imagen = nombreImagenValido($_POST['imagen'] ?? '');
        $nombreReporta = trim($_POST['nombre_reporta'] ?? '');
        $telefonoReporta = trim($_POST['telefono_reporta'] ?? '');
        $cedulaReporta = trim($_POST['cedula_reporta'] ?? '');
        $fecha = trim($_POST['fecha'] ?? '') ?: date('Y-m-d');

        if ($tipoInmueble === '' || $direccion === '' || $lat === null || $lng === null || $nombreReporta === '' || $telefonoReporta === '') {
            responder(['error' => 'Tipo de inmueble, dirección, ubicación y tus datos de contacto son obligatorios'], 400);
        }
        if (!in_array($habitado, ['si', 'no', 'evacuado'])) $habitado = 'si';
        if (!in_array($nivelPercibido, ['leve', 'moderado', 'severo', 'colapso'])) $nivelPercibido = 'moderado';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $fecha = date('Y-m-d');

        $radicado = generarRadicado($pdo);

        $stmt = $pdo->prepare("INSERT INTO reportes_danos (radicado, ciudad, tipo_inmueble, direccion, lat, lng, habitado, nivel_percibido, descripcion, imagen, nombre_reporta, telefono_reporta, cedula_reporta, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$radicado, $ciudad, $tipoInmueble, $direccion, $lat, $lng, $habitado, $nivelPercibido, $descripcion, $imagen, $nombreReporta, $telefonoReporta, $cedulaReporta, $fecha]);
        responder(['ok' => true, 'id' => $pdo->lastInsertId(), 'radicado' => $radicado]);
        break;

    // ---------------------------------------------------------
    // Consultar el estado de un reporte por su radicado (público,
    // funciona como una clave compartida solo con quien reportó)
    // ---------------------------------------------------------
    case 'consultar_dano':
        $radicado = trim($_GET['radicado'] ?? $_POST['radicado'] ?? '');
        if ($radicado === '') responder(['error' => 'Falta el número de radicado'], 400);

        $stmt = $pdo->prepare("
            SELECT radicado, tipo_inmueble, direccion, habitado, nivel_percibido, descripcion, imagen,
                   nombre_reporta, telefono_reporta, estado, fecha_visita, resultado_visita, fecha
            FROM reportes_danos WHERE radicado = ?
        ");
        $stmt->execute([$radicado]);
        $fila = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$fila) responder(['error' => 'No se encontró ningún reporte con ese número de radicado'], 404);
        responder(['ok' => true, 'reporte' => $fila]);
        break;

    // ---------------------------------------------------------
    // Listar todos los reportes con datos completos - admin
    // ---------------------------------------------------------
    case 'listar_danos_admin':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $ciudad = ciudadSolicitada();
        $stmt = $pdo->prepare("SELECT * FROM reportes_danos WHERE ciudad = ? ORDER BY FIELD(estado,'pendiente','visita_programada','visitado'), fecha DESC");
        $stmt->execute([$ciudad]);
        responder(['reportes' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ---------------------------------------------------------
    // Actualizar el estado / resultado de la visita - admin
    // ---------------------------------------------------------
    case 'actualizar_dano_admin':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $estado = $_POST['estado'] ?? 'pendiente';
        $fechaVisita = trim($_POST['fecha_visita'] ?? '');
        $resultadoVisita = trim($_POST['resultado_visita'] ?? '');
        $notasAdmin = trim($_POST['notas_admin'] ?? '');

        if (!in_array($estado, ['pendiente', 'visita_programada', 'visitado'])) $estado = 'pendiente';

        $stmt = $pdo->prepare("UPDATE reportes_danos SET estado=?, fecha_visita=?, resultado_visita=?, notas_admin=? WHERE id=?");
        $stmt->execute([$estado, $fechaVisita ?: null, $resultadoVisita, $notasAdmin, $id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Eliminar un reporte de daño - admin
    // ---------------------------------------------------------
    case 'eliminar_dano':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM reportes_danos WHERE id=?");
        $stmt->execute([$id]);
        responder(['ok' => true]);
        break;

    // ---------------------------------------------------------
    // Exportar reportes de daños a CSV, para entregar a la
    // entidad encargada de las visitas técnicas - admin
    // ---------------------------------------------------------
    case 'exportar_csv_danos':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $ciudad = ciudadSolicitada();

        $stmt = $pdo->prepare("SELECT * FROM reportes_danos WHERE ciudad = ? ORDER BY FIELD(estado,'pendiente','visita_programada','visitado'), fecha DESC");
        $stmt->execute([$ciudad]);
        $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=reportes_danos_' . $ciudad . '.csv');

        $out = fopen('php://output', 'w');
        fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
        if (count($filas) > 0) {
            fputcsv($out, array_keys($filas[0]));
            foreach ($filas as $fila) fputcsv($out, $fila);
        } else {
            fputcsv($out, ['sin datos']);
        }
        fclose($out);
        exit;

    // ---------------------------------------------------------
    // Verificar contraseña admin
    // ---------------------------------------------------------
    case 'verificar_admin':
        responder(['ok' => esAdmin()]);
        break;

    // ---------------------------------------------------------
    // Exportar CSV - admin
    // ---------------------------------------------------------
    case 'exportar_csv':
        if (!esAdmin()) responder(['error' => 'No autorizado'], 401);
        $ciudad = ciudadSolicitada();

        $stmt = $pdo->prepare("
            SELECT s.ciudad, s.nombre AS sector, s.barrio, s.nivel_afectacion, s.lat, s.lng,
                   c.nombre AS contacto, c.telefono AS contacto_telefono, c.rol AS contacto_rol,
                   n.tipo AS necesidad_tipo, n.descripcion AS necesidad_descripcion, n.fecha AS necesidad_fecha,
                   n.cantidad, n.prioridad, n.estado AS necesidad_estado,
                   n.responsable_nombre, n.responsable_telefono, n.fecha_compromiso,
                   n.reportado_por, n.telefono_reporta, n.created_at
            FROM sectores s
            LEFT JOIN contactos c ON c.sector_id = s.id
            LEFT JOIN necesidades n ON n.sector_id = s.id
            WHERE s.ciudad = ?
            ORDER BY s.id
        ");
        $stmt->execute([$ciudad]);
        $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=sectores_' . $ciudad . '.csv');

        $out = fopen('php://output', 'w');
        fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM para tildes en Excel
        if (count($filas) > 0) {
            fputcsv($out, array_keys($filas[0]));
            foreach ($filas as $fila) fputcsv($out, $fila);
        } else {
            fputcsv($out, ['sin datos']);
        }
        fclose($out);
        exit;

    default:
        responder(['error' => 'Acción no reconocida'], 404);
}
