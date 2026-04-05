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

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("
            INSERT INTO pedidos (numero, cliente, telefono, direccion, notas, total, estado, lat, lng)
            VALUES (?, ?, ?, ?, ?, ?, 'recibido', ?, ?)
        ");
        $stmt->execute([
            $numero,
            $body['cliente'],
            $body['telefono'] ?? '',
            $body['direccion'] ?? '',
            $body['notas'] ?? '',
            $total,
            isset($body['lat']) && $body['lat'] !== '' ? (float)$body['lat'] : null,
            isset($body['lng']) && $body['lng'] !== '' ? (float)$body['lng'] : null,
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
            'cliente'   => $body['cliente'],
            'telefono'  => $body['telefono'] ?? '',
            'direccion' => $body['direccion'] ?? '',
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
