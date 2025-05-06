<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    require_once 'config.php';
    
    // Test connection
    if (!$pdo) {
        throw new Exception("Database connection failed");
    }
    
    $stmt = $pdo->query("SELECT * FROM todos ORDER BY id DESC");
    if (!$stmt) {
        throw new Exception("Query failed");
    }
    
    $todos = $stmt->fetchAll();
    echo json_encode($todos);
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to load todos',
        'details' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?> 