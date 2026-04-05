<?php
/**
 * API pública — Clientes
 *
 * GET /lider-app/api/clientes.php?id={id}
 * Devuelve los datos de un cliente por ID.
 * Usada por el frontend para pre-rellenar el formulario de checkout
 * cuando el cliente ya compró anteriormente (cookie cliente_id).
 *
 * Parámetros GET:
 *   id (int, requerido) — ID del cliente
 *
 * Respuesta:
 *   { ok: true, data: { id, nombre, telefono, direccion } }
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$configPath = __DIR__ . '/../../config/db.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'config no encontrado']);
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

// GET: obtener cliente por ID
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$id) {
        echo json_encode(['ok' => false, 'error' => 'ID requerido']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id, nombre, telefono, direccion FROM clientes WHERE id = ?");
    $stmt->execute([$id]);
    $cliente = $stmt->fetch();

    if (!$cliente) {
        echo json_encode(['ok' => false, 'error' => 'Cliente no encontrado']);
        exit;
    }

    echo json_encode(['ok' => true, 'data' => $cliente]);
}
