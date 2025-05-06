<?php
header('Content-Type: application/json');
require_once 'config.php';

$input = json_decode(file_get_contents('php://input'), true);
$id = isset($_POST['id']) ? $_POST['id'] : $input['id'];
$completed = isset($_POST['completed']) ? $_POST['completed'] : $input['completed'];

if (empty($id)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("UPDATE todos SET completed = ? WHERE id = ?");
    $stmt->execute([$completed ? 1 : 0, $id]);
    echo json_encode(['success' => true]);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update todo']);
}
?> 