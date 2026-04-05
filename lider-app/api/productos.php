<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/db.php';

$cat = $_GET['categoria'] ?? 'todos';
$q   = trim($_GET['q'] ?? '');

try {
    $pdo = getDB();

    $sql    = "SELECT id, nombre, precio, categoria, emoji, imagen, unidad, stock FROM productos WHERE 1=1";
    $params = [];

    if ($cat !== 'todos') {
        $sql .= " AND categoria = ?";
        $params[] = $cat;
    }
    if ($q !== '') {
        $sql .= " AND nombre LIKE ?";
        $params[] = "%{$q}%";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $productos = $stmt->fetchAll();

    // Convertir stock a booleano para compatibilidad con el frontend
    foreach ($productos as &$p) {
        $p['stock']  = (bool)$p['stock'];
        $p['precio'] = (float)$p['precio'];
    }

    echo json_encode(['ok' => true, 'data' => $productos]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error al consultar productos']);
}
