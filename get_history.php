<?php
header('Content-Type: application/json');

$host = 'localhost';
$user = 'root';
$pass = '';
$db = 'boletosai';

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    echo json_encode(['error' => 'Erro de conexão com o banco de dados']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$page = isset($input['page']) ? (int)$input['page'] : 1;
$filters = isset($input['filters']) ? $input['filters'] : [];
$sort = isset($input['sort']) ? $input['sort'] : 'date-desc';

$limit = 10;
$offset = ($page - 1) * $limit;

$where = [];
$params = [];
$types = '';

if (!empty($filters['search'])) {
    $where[] = '(local LIKE ? OR boleto LIKE ?)';
    $params[] = '%' . $filters['search'] . '%';
    $params[] = '%' . $filters['search'] . '%';
    $types .= 'ss';
}
if (!empty($filters['company'])) {
    $where[] = 'local = ?';
    $params[] = $filters['company'];
    $types .= 's';
}
if (!empty($filters['valueMin'])) {
    $where[] = 'valor >= ?';
    $params[] = $filters['valueMin'];
    $types .= 'd';
}
if (!empty($filters['valueMax'])) {
    $where[] = 'valor <= ?';
    $params[] = $filters['valueMax'];
    $types .= 'd';
}
if (!empty($filters['status']) && $filters['status'] !== 'all') {
    $where[] = 'status = ?';
    $params[] = $filters['status'];
    $types .= 's';
}
if (!empty($filters['dateFrom'])) {
    $where[] = 'data_criacao >= ?';
    $params[] = $filters['dateFrom'];
    $types .= 's';
}
if (!empty($filters['dateTo'])) {
    $where[] = 'data_criacao <= ?';
    $params[] = $filters['dateTo'];
    $types .= 's';
}

$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

switch ($sort) {
    case 'date-asc':
        $orderBy = 'ORDER BY data_criacao ASC';
        break;
    case 'value-desc':
        $orderBy = 'ORDER BY valor DESC';
        break;
    case 'value-asc':
        $orderBy = 'ORDER BY valor ASC';
        break;
    default:
        $orderBy = 'ORDER BY data_criacao DESC';
}

$sql = "SELECT id, local, boleto, data_criacao, tipo_arquivo, valor FROM boletos $whereSql $orderBy LIMIT ? OFFSET ?";

$stmt = $conn->prepare($sql);
if ($types) {
    $types .= 'ii';
    $params[] = $limit;
    $params[] = $offset;
    $stmt->bind_param($types, ...$params);
} else {
    $stmt->bind_param('ii', $limit, $offset);
}

$stmt->execute();
$result = $stmt->get_result();
$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

$companies = [];
$companyResult = $conn->query('SELECT DISTINCT local FROM boletos');
while ($row = $companyResult->fetch_assoc()) {
    $companies[] = $row['local'];
}

$stmt->close();
$conn->close();

echo json_encode([
    'items' => $items,
    'companies' => $companies
]);
