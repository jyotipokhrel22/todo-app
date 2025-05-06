<?php
header('Content-Type: application/xml; charset=utf-8');

// Database connection
$conn = new mysqli('localhost', 'root', '', 'todo_db');

if ($conn->connect_error) {
    outputError('Database connection failed: ' . $conn->connect_error);
}

// Handle different actions
$action = $_REQUEST['action'] ?? '';

switch ($action) {
    case 'list':
        listTodos();
        break;
    case 'add':
        addTodo();
        break;
    case 'update':
        updateTodo();
        break;
    case 'delete':
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

// Function to parse incoming XML
function parseIncomingXML($xmlString) {
    $xml = simplexml_load_string($xmlString);
    if ($xml === false) {
        outputError('Invalid XML data');
    }
    return $xml;
}

// Function to output XML response
function outputXML($xml) {
    echo $xml;
    exit;
}

// Function to output error in XML format
function outputError($message) {
    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<error>' . htmlspecialchars($message) . '</error>';
    outputXML($xml);
}

// Function to list todos
function listTodos() {
    global $conn;
    
    $filter = $_GET['filter'] ?? 'all';
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
    
    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<todos>';
    
    while ($row = $result->fetch_assoc()) {
        $xml .= '<todo>';
        $xml .= '<id>' . $row['id'] . '</id>';
        $xml .= '<text>' . htmlspecialchars($row['text']) . '</text>';
        $xml .= '<completed>' . ($row['completed'] ? 'true' : 'false') . '</completed>';
        $xml .= '<timestamp>' . $row['timestamp'] . '</timestamp>';
        $xml .= '</todo>';
    }
    
    $xml .= '</todos>';
    outputXML($xml);
}

// Function to add todo
function addTodo() {
    global $conn;
    
    $todoXml = parseIncomingXML($_POST['todo']);
    $text = $conn->real_escape_string($todoXml->text);
    $timestamp = $todoXml->timestamp;
    
    $sql = "INSERT INTO todos (text, completed, timestamp) VALUES ('$text', 0, '$timestamp')";
    
    if ($conn->query($sql)) {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<response>';
        $xml .= '<status>success</status>';
        $xml .= '<id>' . $conn->insert_id . '</id>';
        $xml .= '</response>';
        outputXML($xml);
    } else {
        outputError('Failed to add todo');
    }
}

// Function to update todo
function updateTodo() {
    global $conn;
    
    $id = (int)$_POST['id'];
    $todoXml = parseIncomingXML($_POST['todo']);
    $text = $conn->real_escape_string($todoXml->text);
    $completed = ($todoXml->completed == 'true') ? 1 : 0;
    
    $sql = "UPDATE todos SET text = '$text', completed = $completed WHERE id = $id";
    
    if ($conn->query($sql)) {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<response><status>success</status></response>';
        outputXML($xml);
    } else {
        outputError('Failed to update todo');
    }
}

// Function to delete todo
function deleteTodo() {
    global $conn;
    
    $id = (int)$_POST['id'];
    $sql = "DELETE FROM todos WHERE id = $id";
    
    if ($conn->query($sql)) {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<response><status>success</status></response>';
        outputXML($xml);
    } else {
        outputError('Failed to delete todo');
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
        outputError('Failed to clear completed todos');
    }
}

// Function to count remaining todos
function countTodos() {
    global $conn;
    
    $result = $conn->query("SELECT COUNT(*) as count FROM todos WHERE completed = 0");
    $count = $result->fetch_assoc()['count'];
    
    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<response>';
    $xml .= '<count>' . $count . '</count>';
    $xml .= '</response>';
    outputXML($xml);
}

$conn->close();
?> 