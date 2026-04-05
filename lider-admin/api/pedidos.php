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

    // ---- GET: listar pedidos ----
    case 'GET':
        $estado = isset($_GET['estado']) ? trim($_GET['estado']) : '';
        $q      = isset($_GET['q'])      ? trim($_GET['q'])      : '';

        $where = [];
        $params = [];

        if ($estado && $estado !== 'todos') {
            $where[] = 'p.estado = ?';
            $params[] = $estado;
        }
        if ($q) {
            $where[] = '(p.numero LIKE ? OR p.cliente LIKE ? OR p.telefono LIKE ?)';
            $like = "%$q%";
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $sql = "SELECT p.id, p.numero, p.cliente, p.telefono, p.direccion, p.notas, p.total, p.estado, p.lat, p.lng, p.created_at as fecha
                FROM pedidos p"
             . (count($where) ? ' WHERE ' . implode(' AND ', $where) : '')
             . " ORDER BY p.id DESC LIMIT 100";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $pedidos = $stmt->fetchAll();

        foreach ($pedidos as &$ped) {
            $stmtItems = $pdo->prepare("SELECT nombre, precio, cantidad FROM pedido_items WHERE pedido_id = ?");
            $stmtItems->execute([$ped['id']]);
            $ped['items'] = $stmtItems->fetchAll();
            $ped['total'] = (float)$ped['total'];
        }

        // Stats
        $stmtStats = $pdo->query("
            SELECT estado, COUNT(*) as cant, SUM(total) as monto
            FROM pedidos GROUP BY estado
        ");
        $statsRaw = $stmtStats->fetchAll();
        $stats = [];
        foreach ($statsRaw as $s) {
            $stats[$s['estado']] = ['cant' => (int)$s['cant'], 'monto' => (float)$s['monto']];
        }

        echo json_encode(['ok' => true, 'data' => $pedidos, 'stats' => $stats]);
        break;

    // ---- PUT: cambiar estado ----
    case 'PUT':
        $body = json_decode(file_get_contents('php://input'), true);
        $id     = isset($body['id'])     ? (int)$body['id']       : 0;
        $estado = isset($body['estado']) ? trim($body['estado'])  : '';

        $estados_validos = ['recibido', 'preparando', 'listo', 'entregado', 'cancelado'];

        if (!$id || !in_array($estado, $estados_validos)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'ID y estado válido requeridos']);
            break;
        }

        $stmt = $pdo->prepare("UPDATE pedidos SET estado = ? WHERE id = ?");
        $stmt->execute([$estado, $id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Pedido no encontrado']);
            break;
        }

        echo json_encode(['ok' => true, 'id' => $id, 'estado' => $estado]);
        break;

    // ---- DELETE: eliminar pedido ----
    case 'DELETE':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'ID requerido']);
            break;
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM pedido_items WHERE pedido_id = ?")->execute([$id]);
            $stmt = $pdo->prepare("DELETE FROM pedidos WHERE id = ?");
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                $pdo->rollBack();
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Pedido no encontrado']);
                break;
            }

            $pdo->commit();
            echo json_encode(['ok' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Error al eliminar']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
}
