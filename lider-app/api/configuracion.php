<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/db.php';

try {
    $pdo = getDB();
    $stmt = $pdo->query("SELECT clave, valor FROM configuracion");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $config = [];
    foreach ($rows as $row) {
        $config[$row['clave']] = $row['valor'];
    }
    echo json_encode(['ok' => true, 'data' => $config]);
} catch (Exception $e) {
    echo json_encode(['ok' => true, 'data' => ['pedido_minimo' => '0']]);
}
