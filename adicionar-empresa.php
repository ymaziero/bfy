<?php
header('Content-Type: application/json');

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "boletosai";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $companyName = isset($_POST['company-name']) ? trim($_POST['company-name']) : '';
    $companyStore = isset($_POST['company-store']) ? trim($_POST['company-store']) : '';

    if (empty($companyName) || empty($companyStore)) {
        echo json_encode(['success' => false, 'message' => 'Por favor, preencha todos os campos.']);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO empresas (empresa, local) VALUES (:empresa, :local)");
    $stmt->bindParam(':empresa', $companyName);
    $stmt->bindParam(':local', $companyStore);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => "Empresa $companyName ($companyStore) adicionada com sucesso!"]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erro ao adicionar empresa: ' . $e->getMessage()]);
}

$conn = null;
?>
