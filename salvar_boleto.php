<?php
// php/salvar_boleto.php

// Desativar exibição de erros para evitar saída HTML
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Configuração do banco de dados
$dsn = 'mysql:host=localhost;dbname=boletosai;charset=utf8';
$username = 'root'; // Substitua pelo usuário do banco
$password = '';   // Substitua pela senha do banco

header('Content-Type: application/json; charset=utf-8');

try {
    // Conectar ao banco de dados
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Verificar se os dados foram enviados
    if (!isset($_POST['local']) || !isset($_POST['pdf']) || !isset($_POST['data_criacao']) || !isset($_POST['valor'])) {
        $errorMessage = 'Dados incompletos: local, pdf, data_criacao ou valor não enviados';
        error_log($errorMessage);
        echo json_encode(['error' => $errorMessage]);
        exit;
    }

    $local = $_POST['local'];
    $pdfBase64 = $_POST['pdf'];
    $dataCriacao = $_POST['data_criacao'];
    $valor = floatval($_POST['valor']);

    // Validar data_criacao
    $dataCriacaoFormatted = date('Y-m-d H:i:s', strtotime($dataCriacao));
    if ($dataCriacaoFormatted === false) {
        $errorMessage = 'Formato de data_criacao inválido';
        error_log($errorMessage);
        echo json_encode(['error' => $errorMessage]);
        exit;
    }

    // Decodificar o PDF de base64
    $pdfData = base64_decode($pdfBase64, true);
    if ($pdfData === false || substr($pdfData, 0, 5) !== '%PDF-') {
        $errorMessage = 'Erro ao decodificar o PDF ou conteúdo inválido';
        error_log($errorMessage);
        echo json_encode(['error' => $errorMessage]);
        exit;
    }

    // Definir o caminho da pasta 'boletos' no diretório pai (fora da pasta 'php')
    $pastaBoletos = '../boletos'; // '../' sobe um nível na estrutura de diretórios
    if (!is_dir($pastaBoletos)) {
        if (!mkdir($pastaBoletos, 0755, true)) {
            $errorMessage = 'Erro ao criar a pasta boletos';
            error_log($errorMessage);
            echo json_encode(['error' => $errorMessage]);
            exit;
        }
    }

    // Gerar um nome único para o arquivo PDF (usando timestamp e um número aleatório)
    $nomeArquivo = 'boleto_' . time() . '_' . rand(1000, 9999) . '.pdf';
    $caminhoArquivo = $pastaBoletos . '/' . $nomeArquivo;

    // Salvar o arquivo PDF na pasta
    if (!file_put_contents($caminhoArquivo, $pdfData)) {
        $errorMessage = 'Erro ao salvar o arquivo PDF na pasta';
        error_log($errorMessage);
        echo json_encode(['error' => $errorMessage]);
        exit;
    }

    // Preparar e executar a inserção no banco (armazenando o caminho do arquivo)
    $sql = "INSERT INTO boletos (local, boleto, data_criacao, valor) VALUES (:local, :boleto, :data_criacao, :valor)";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':local', $local);
    $stmt->bindParam(':boleto', $caminhoArquivo); // Armazenar o caminho do arquivo
    $stmt->bindParam(':data_criacao', $dataCriacaoFormatted);
    $stmt->bindParam(':valor', $valor);

    $stmt->execute();

    echo json_encode(['success' => 'Boleto salvo com sucesso']);
} catch (Exception $e) {
    $errorMessage = 'Erro ao salvar boleto: ' . $e->getMessage();
    error_log($errorMessage);
    echo json_encode(['error' => $errorMessage]);
}