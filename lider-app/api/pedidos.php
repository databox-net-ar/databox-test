<?php
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$configPath = __DIR__ . '/../../config/db.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'config/db.php no encontrado', 'path' => realpath(__DIR__), 'expected' => $configPath]);
    exit;
}
require_once $configPath;

try {
    $pdo = getDB();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'DB: ' . $e->getMessage()]);
    exit;
}

// Auto-migración: agregar columnas lat/lng si no existen
try {
    $pdo->query("SELECT lat FROM pedidos LIMIT 1");
} catch (Exception $e) {
    $pdo->exec("ALTER TABLE pedidos ADD COLUMN lat DECIMAL(10,7) DEFAULT NULL, ADD COLUMN lng DECIMAL(10,7) DEFAULT NULL");
}

// Auto-migración: agregar columna distancia_km
try {
    $pdo->query("SELECT distancia_km FROM pedidos LIMIT 1");
} catch (Exception $e) {
    $pdo->exec("ALTER TABLE pedidos ADD COLUMN distancia_km DECIMAL(8,2) DEFAULT NULL");
}

// Auto-migración: agregar columna tiempo_min
try {
    $pdo->query("SELECT tiempo_min FROM pedidos LIMIT 1");
} catch (Exception $e) {
    $pdo->exec("ALTER TABLE pedidos ADD COLUMN tiempo_min INT UNSIGNED DEFAULT NULL");
}

// Obtener distancia y tiempo por calles usando Google Distance Matrix API
function calcDistanciaYTiempo($lat1, $lng1, $lat2, $lng2) {
    $apiKey = 'AIzaSyDXN7-CpoFdxh_6V-_7UQkPzWFbX6_T1p0';
    $url = 'https://maps.googleapis.com/maps/api/distancematrix/json?'
         . 'origins=' . $lat1 . ',' . $lng1
         . '&destinations=' . $lat2 . ',' . $lng2
         . '&mode=driving&language=es&key=' . $apiKey;
    $resp = @file_get_contents($url);
    if ($resp) {
        $data = json_decode($resp, true);
        $el = isset($data['rows'][0]['elements'][0]) ? $data['rows'][0]['elements'][0] : null;
        if ($el && isset($el['distance']['value']) && isset($el['duration']['value'])) {
            return array(
                'km'  => round($el['distance']['value'] / 1000, 2),
                'min' => round($el['duration']['value'] / 60)
            );
        }
    }
    return array('km' => 0, 'min' => 0);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);

    if (empty($body['items']) || empty($body['cliente'])) {
        echo json_encode(['ok' => false, 'msg' => 'Faltan datos del pedido.']);
        exit;
    }

    $numero = 'PED-' . strtoupper(substr(uniqid(), -6));
    $total  = 0;
    foreach ($body['items'] as $it) {
        $total += $it['precio'] * $it['cantidad'];
    }

    $pedLat = isset($body['lat']) && $body['lat'] !== '' ? (float)$body['lat'] : null;
    $pedLng = isset($body['lng']) && $body['lng'] !== '' ? (float)$body['lng'] : null;

    // Calcular distancia y tiempo desde centro de distribución
    $distanciaKm = 0;
    $tiempoMin = 0;
    if ($pedLat !== null && $pedLng !== null) {
        $stmtCfg = $pdo->prepare("SELECT clave, valor FROM configuracion WHERE clave IN ('centro_dist_lat','centro_dist_lng')");
        $stmtCfg->execute();
        $cfgRows = $stmtCfg->fetchAll();
        $cfg = [];
        foreach ($cfgRows as $r) { $cfg[$r['clave']] = $r['valor']; }
        if (!empty($cfg['centro_dist_lat']) && !empty($cfg['centro_dist_lng'])) {
            $result = calcDistanciaYTiempo(
                (float)$cfg['centro_dist_lat'], (float)$cfg['centro_dist_lng'],
                $pedLat, $pedLng
            );
            $distanciaKm = $result['km'];
            $tiempoMin = $result['min'];
        }
    }

    $pdo->beginTransaction();
    try {
        // Buscar o crear cliente
        $clienteNombre = trim($body['cliente']);
        $clienteTel = trim($body['telefono'] ?? '');
        $clienteDir = trim($body['direccion'] ?? '');
        $clienteId = null;

        // Buscar por nombre + teléfono
        $stmtCli = $pdo->prepare("SELECT id FROM clientes WHERE nombre = ? AND telefono = ? LIMIT 1");
        $stmtCli->execute([$clienteNombre, $clienteTel]);
        $existente = $stmtCli->fetch();

        if ($existente) {
            $clienteId = (int)$existente['id'];
            // Actualizar dirección si cambió
            $pdo->prepare("UPDATE clientes SET direccion = ?, updated_at = NOW() WHERE id = ?")->execute([$clienteDir, $clienteId]);
        } else {
            $pdo->prepare("INSERT INTO clientes (nombre, telefono, direccion) VALUES (?, ?, ?)")->execute([$clienteNombre, $clienteTel, $clienteDir]);
            $clienteId = (int)$pdo->lastInsertId();
        }

        $stmt = $pdo->prepare("
            INSERT INTO pedidos (numero, cliente_id, cliente, telefono, direccion, notas, total, estado, lat, lng, distancia_km, tiempo_min)
            VALUES (?, ?, ?, ?, ?, ?, 'recibido', ?, ?, ?, ?)
        ");
        $stmt->execute([
            $numero,
            $clienteId,
            $clienteNombre,
            $clienteTel,
            $clienteDir,
            $body['notas'] ?? '',
            $total,
            $pedLat,
            $pedLng,
            $distanciaKm,
            $tiempoMin,
        ]);
        $pedidoId = $pdo->lastInsertId();

        $stmtItem = $pdo->prepare("
            INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio, cantidad)
            VALUES (?, ?, ?, ?, ?)
        ");
        foreach ($body['items'] as $item) {
            $stmtItem->execute([
                $pedidoId,
                $item['id'] ?? null,
                $item['nombre'],
                $item['precio'],
                $item['cantidad'],
            ]);
        }

        $pdo->commit();

        $pedido = [
            'numero'    => $numero,
            'fecha'     => date('Y-m-d H:i:s'),
            'cliente'   => $clienteNombre,
            'cliente_id' => $clienteId,
            'telefono'  => $clienteTel,
            'direccion' => $clienteDir,
            'notas'     => $body['notas'] ?? '',
            'items'     => $body['items'],
            'total'     => $total,
            'estado'    => 'recibido',
        ];

        echo json_encode(['ok' => true, 'pedido' => $pedido]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Error al guardar pedido']);
    }
    exit;
}

// GET: listar últimos pedidos
$stmt = $pdo->query("
    SELECT id, numero, cliente, telefono, direccion, notas, total, estado, created_at as fecha
    FROM pedidos ORDER BY id DESC LIMIT 20
");
$pedidos = $stmt->fetchAll();

foreach ($pedidos as &$ped) {
    $stmtItems = $pdo->prepare("SELECT nombre, precio, cantidad FROM pedido_items WHERE pedido_id = ?");
    $stmtItems->execute([$ped['id']]);
    $ped['items'] = $stmtItems->fetchAll();
    $ped['total'] = (float)$ped['total'];
}

echo json_encode(['ok' => true, 'data' => $pedidos]);
