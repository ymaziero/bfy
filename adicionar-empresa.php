<?php
header('Content-Type: application/json');

// Configuração da conexão com o banco de dados
$servername = "localhost"; // Substitua pelo seu servidor MySQL
$username = "root"; // Substitua pelo seu usuário do MySQL
$password = ""; // Substitua pela sua senha do MySQL
$dbname = "boletosai";

try {
    // Conexão com o banco de dados
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Receber dados do formulário
    $companyName = isset($_POST['company-name']) ? trim($_POST['company-name']) : '';
    $companyStore = isset($_POST['company-store']) ? trim($_POST['company-store']) : '';

    // Validação
    if (empty($companyName) || empty($companyStore)) {
        echo json_encode(['success' => false, 'message' => 'Por favor, preencha todos os campos.']);
        exit;
    }

    // Inserir no banco de dados
    $stmt = $conn->prepare("INSERT INTO empresas (empresa, local) VALUES (:empresa, :local)");
    $stmt->bindParam(':empresa', $companyName);
    $stmt->bindParam(':local', $companyStore);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => "Empresa $companyName ($companyStore) adicionada com sucesso!"]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erro ao adicionar empresa: ' . $e->getMessage()]);
}

// Fechar conexão
$conn = null;
?>