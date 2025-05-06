<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers
header('Content-Type: application/xml; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Database connection
$conn = new mysqli('localhost', 'root', '', 'todo_db');

// Set charset to handle special characters
$conn->set_charset("utf8mb4");

if ($conn->connect_error) {
    outputError('Database connection failed: ' . $conn->connect_error);
}

// Handle different actions
$action = isset($_REQUEST['action']) ? $_REQUEST['action'] : '';

try {
    switch ($action) {
        case 'list':
            listTodos();
            break;
        case 'add':
            if (!isset($_POST['todo'])) {
                outputError('Missing todo data');
            }
            addTodo();
            break;
            
        case 'update':
            if (!isset($_POST['id']) || !isset($_POST['todo'])) {
                outputError('Missing id or todo data');
            }
            updateTodo();
            break;
        case 'delete':
            if (!isset($_POST['id'])) {
                outputError('Missing id');
            }
            deleteTodo();
            break;
        case 'clear_completed':
            clearCompleted();
            break;
        case 'count':
            countTodos();
            break;
        default:
            outputError('Invalid action');
    }
} catch (Exception $e) {
    outputError('Server error: ' . $e->getMessage());
}

// Function to parse incoming XML
function parseIncomingXML($xmlString) {
    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($xmlString);
    
    if ($xml === false) {
        $errors = [];
        foreach(libxml_get_errors() as $error) {
            $errors[] = $error->message;
        }
        libxml_clear_errors();
        outputError('Invalid XML data: ' . implode(', ', $errors));
    }
    
    return $xml;
}

// Function to output XML response
function outputXML($xml) {
    if (!headers_sent()) {
        header('Content-Type: application/xml; charset=utf-8');
    }
    echo $xml;
    exit;
}

// Function to output error in XML format
function outputError($message) {
    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<response>';
    $xml .= '<status>error</status>';
    $xml .= '<message>' . htmlspecialchars($message) . '</message>';
    $xml .= '</response>';
    outputXML($xml);
}

// Function to list todos
function listTodos() {
    global $conn;
    
    $filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';
    $where = '';
    
    switch ($filter) {
        case 'active':
            $where = 'WHERE completed = 0';
            break;
        case 'completed':
            $where = 'WHERE completed = 1';
            break;
    }
    
    $result = $conn->query("SELECT * FROM todos {$where} ORDER BY timestamp DESC");
    
    if (!$result) {
        error_log("Database error in listTodos: " . $conn->error);
        outputError('Database error: ' . $conn->error);
    }
    
    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<response>';
    $xml .= '<status>success</status>';
    $xml .= '<todos>';
    
    while ($row = $result->fetch_assoc()) {
        $xml .= '<todo>';
        $xml .= '<id>' . htmlspecialchars($row['id']) . '</id>';
        $xml .= '<text>' . htmlspecialchars($row['text']) . '</text>';
        $xml .= '<completed>' . ($row['completed'] ? 'true' : 'false') . '</completed>';
        $xml .= '<priority>' . htmlspecialchars($row['priority']) . '</priority>';
        $xml .= '<timestamp>' . htmlspecialchars($row['timestamp']) . '</timestamp>';
        $xml .= '</todo>';
    }
    
    $xml .= '</todos>';
    $xml .= '</response>';
    outputXML($xml);
}

// Function to add todo
function addTodo() {
    global $conn;
    
    try {
        // Check if table exists
        $tableCheck = $conn->query("SHOW TABLES LIKE 'todos'");
        if ($tableCheck->num_rows === 0) {
            // Create table if it doesn't exist
            $createTable = "CREATE TABLE IF NOT EXISTS todos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                text TEXT NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                priority VARCHAR(10) DEFAULT 'normal',
                timestamp BIGINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            
            if (!$conn->query($createTable)) {
                throw new Exception("Failed to create table: " . $conn->error);
            }
        }
        
        $todoXml = parseIncomingXML($_POST['todo']);
        
        if (empty($todoXml->text)) {
            throw new Exception('Todo text cannot be empty');
        }
        
        $text = $conn->real_escape_string((string)$todoXml->text);
        $timestamp = (string)$todoXml->timestamp;
        $priority = $conn->real_escape_string((string)$todoXml->priority ?: 'normal');
        
        if (!is_numeric($timestamp)) {
            throw new Exception('Invalid timestamp');
        }
        
        $sql = "INSERT INTO todos (text, completed, priority, timestamp) VALUES (?, 0, ?, ?)";
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception('Database error: ' . $conn->error);
        }
        
        $stmt->bind_param('sss', $text, $priority, $timestamp);
        
        if ($stmt->execute()) {
            $xml = '<?xml version="1.0" encoding="UTF-8"?>';
            $xml .= '<response>';
            $xml .= '<status>success</status>';
            $xml .= '<id>' . $stmt->insert_id . '</id>';
            $xml .= '</response>';
            $stmt->close();
            outputXML($xml);
        } else {
            throw new Exception('Failed to add todo: ' . $stmt->error);
        }
    } catch (Exception $e) {
        error_log("Error in addTodo: " . $e->getMessage());
        outputError($e->getMessage());
    }
}

// Function to update todo
function updateTodo() {
    global $conn;
    
    $id = filter_var($_POST['id'], FILTER_VALIDATE_INT);
    if ($id === false) {
        outputError('Invalid ID');
    }
    
    $todoXml = parseIncomingXML($_POST['todo']);
    
    if (empty($todoXml->text)) {
        outputError('Todo text cannot be empty');
    }
    
    $text = $conn->real_escape_string((string)$todoXml->text);
    $completed = ((string)$todoXml->completed === 'true') ? 1 : 0;
    
    $sql = "UPDATE todos SET text = ?, completed = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        outputError('Database error: ' . $conn->error);
    }
    
    $stmt->bind_param('sii', $text, $completed, $id);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            $xml = '<?xml version="1.0" encoding="UTF-8"?>';
            $xml .= '<response><status>success</status></response>';
            $stmt->close();
            outputXML($xml);
        } else {
            $stmt->close();
            outputError('Todo not found');
        }
    } else {
        $stmt->close();
        outputError('Failed to update todo: ' . $stmt->error);
    }
}

// Function to delete todo
function deleteTodo() {
    global $conn;
    
    $id = filter_var($_POST['id'], FILTER_VALIDATE_INT);
    if ($id === false) {
        outputError('Invalid ID');
    }
    
    $sql = "DELETE FROM todos WHERE id = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        outputError('Database error: ' . $conn->error);
    }
    
    $stmt->bind_param('i', $id);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            $xml = '<?xml version="1.0" encoding="UTF-8"?>';
            $xml .= '<response><status>success</status></response>';
            $stmt->close();
            outputXML($xml);
        } else {
            $stmt->close();
            outputError('Todo not found');
        }
    } else {
        $stmt->close();
        outputError('Failed to delete todo: ' . $stmt->error);
    }
}

// Function to clear completed todos
function clearCompleted() {
    global $conn;
    
    $sql = "DELETE FROM todos WHERE completed = 1";
    
    if ($conn->query($sql)) {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<response><status>success</status></response>';
        outputXML($xml);
    } else {
        outputError('Failed to clear completed todos: ' . $conn->error);
    }
}

// Function to count remaining todos
function countTodos() {
    global $conn;
    
    $result = $conn->query("SELECT COUNT(*) as count FROM todos WHERE completed = 0");
    
    if (!$result) {
        outputError('Database error: ' . $conn->error);
    }
    
    $count = $result->fetch_assoc()['count'];
    
    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<response>';
    $xml .= '<status>success</status>';
    $xml .= '<count>' . htmlspecialchars($count) . '</count>';
    $xml .= '</response>';
    outputXML($xml);
}

// Close the database connection
$conn->close();
?> 