<?php
header('Content-Type: application/json');
require_once 'config.php';

$input = json_decode(file_get_contents('php://input'), true);
$text = isset($_POST['text']) ? $_POST['text'] : $input['text'];

if (empty($text)) {
    http_response_code(400);
    echo json_encode(['error' => 'Text is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO todos (text, completed) VALUES (?, false)");
    $stmt->execute([$text]);
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to add todo']);
}
?> 