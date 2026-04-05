<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

require_once __DIR__ . '/../../config/db.php';

try {
    $pdo = getDB();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'DB: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // ---- GET: listar clientes ----
    case 'GET':
        $q = isset($_GET['q']) ? trim($_GET['q']) : '';

        $where = [];
        $params = [];

        if ($q) {
            $where[] = '(c.nombre LIKE ? OR c.telefono LIKE ? OR c.direccion LIKE ?)';
            $like = "%$q%";
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $sql = "SELECT c.id, c.nombre, c.telefono, c.direccion, c.created_at,
                       COUNT(p.id) as total_pedidos,
                       COALESCE(SUM(p.total), 0) as total_gastado,
                       MAX(p.created_at) as ultimo_pedido
                FROM clientes c
                LEFT JOIN pedidos p ON p.cliente_id = c.id"
             . (count($where) ? ' WHERE ' . implode(' AND ', $where) : '')
             . " GROUP BY c.id ORDER BY c.id DESC LIMIT 200";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $clientes = $stmt->fetchAll();

        foreach ($clientes as &$cli) {
            $cli['total_pedidos'] = (int)$cli['total_pedidos'];
            $cli['total_gastado'] = (float)$cli['total_gastado'];
        }

        // Stats
        $totalClientes = $pdo->query("SELECT COUNT(*) FROM clientes")->fetchColumn();
        $conPedidos = $pdo->query("SELECT COUNT(DISTINCT cliente_id) FROM pedidos WHERE cliente_id IS NOT NULL")->fetchColumn();

        echo json_encode([
            'ok' => true,
            'data' => $clientes,
            'stats' => [
                'total' => (int)$totalClientes,
                'con_pedidos' => (int)$conPedidos
            ]
        ]);
        break;

    // ---- PUT: editar cliente ----
    case 'PUT':
        $body = json_decode(file_get_contents('php://input'), true);
        $id = isset($body['id']) ? (int)$body['id'] : 0;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'ID requerido']);
            break;
        }

        $campos = [];
        $params = [];

        if (isset($body['nombre']) && trim($body['nombre']) !== '') {
            $campos[] = 'nombre = ?';
            $params[] = trim($body['nombre']);
        }
        if (isset($body['telefono'])) {
            $campos[] = 'telefono = ?';
            $params[] = trim($body['telefono']);
        }
        if (isset($body['direccion'])) {
            $campos[] = 'direccion = ?';
            $params[] = trim($body['direccion']);
        }

        if (empty($campos)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Nada que actualizar']);
            break;
        }

        $params[] = $id;
        $stmt = $pdo->prepare("UPDATE clientes SET " . implode(', ', $campos) . " WHERE id = ?");
        $stmt->execute($params);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Cliente no encontrado']);
            break;
        }

        echo json_encode(['ok' => true, 'id' => $id]);
        break;

    // ---- DELETE: eliminar cliente ----
    case 'DELETE':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'ID requerido']);
            break;
        }

        // Desvincular pedidos
        $pdo->prepare("UPDATE pedidos SET cliente_id = NULL WHERE cliente_id = ?")->execute([$id]);

        $stmt = $pdo->prepare("DELETE FROM clientes WHERE id = ?");
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Cliente no encontrado']);
            break;
        }

        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
}
