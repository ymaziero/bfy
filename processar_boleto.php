<?php
// Desativar exibição de erros para evitar saída HTML
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Função para normalizar strings (remover acentos, converter para minúsculas, etc.)
function normalizeString($str) {
    if (empty($str)) return '';
    $str = iconv('UTF-8', 'ASCII//TRANSLIT', $str); // Remove acentos
    $str = strtolower($str); // Converte para minúsculas
    $str = preg_replace('/[^a-z0-9\s]/', '', $str); // Remove caracteres especiais
    $str = preg_replace('/\s+/', ' ', trim($str)); // Normaliza espaços
    // Mapeamento de variações comuns
    $replacements = [
        'confec' => 'confeccao',
        'confeccoes' => 'confeccao',
        'ltda' => '',
        'epp' => '',
        'sa' => ''
    ];
    foreach ($replacements as $from => $to) {
        $str = str_replace($from, $to, $str);
    }
    return $str;
}

// Função para validar empresas no banco de dados
function validateCompanies($boletos) {
    $dsn = 'mysql:host=localhost;dbname=boletosai;charset=utf8';
    $username = 'root'; // Substitua pelo usuário do banco
    $password = '';   // Substitua pela senha do banco

    try {
        $pdo = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    } catch (Exception $e) {
        error_log("Erro ao conectar ao banco de dados: " . $e->getMessage());
        return $boletos; // Retorna boletos sem validação em caso de erro
    }

    $validatedBoletos = [];
    try {
        $sql = "SELECT empresa, local FROM empresas";
        $stmt = $pdo->query($sql);
        $empresasDB = $stmt->fetchAll();
    } catch (Exception $e) {
        error_log("Erro ao consultar tabela empresas: " . $e->getMessage());
        return $boletos; // Retorna boletos sem validação em caso de erro
    }

    foreach ($boletos as $boleto) {
        if (!is_array($boleto) || isset($boleto['error'])) {
            $validatedBoletos[] = $boleto;
            continue;
        }

        $empresaBoleto = normalizeString($boleto['empresa'] ?? '');
        $bestMatch = null;
        $minDistance = PHP_INT_MAX;

        // Comparar com empresas no banco de dados
        foreach ($empresasDB as $empresaDB) {
            $empresaDBNormalized = normalizeString($empresaDB['empresa']);
            $distance = levenshtein($empresaBoleto, $empresaDBNormalized);
            if ($distance < $minDistance && $distance <= 7) {
                $minDistance = $distance;
                $bestMatch = $empresaDB;
            }
        }

        if ($bestMatch) {
            $boleto['empresa_validada'] = $bestMatch['empresa'];
            $boleto['local'] = $bestMatch['local'];
            $boleto['validado'] = true;
        } else {
            $boleto['empresa_validada'] = $boleto['empresa'] ?? 'N/A';
            $boleto['local'] = 'N/A';
            $boleto['validado'] = false;
            error_log("Empresa não encontrada no banco: " . ($boleto['empresa'] ?? 'N/A'));
        }

        $validatedBoletos[] = [
            'documento' => $boleto['documento'] ?? 'N/A',
            'empresa' => $boleto['empresa'] ?? 'N/A',
            'empresa_validada' => $boleto['empresa_validada'],
            'local' => $boleto['local'],
            'validado' => $boleto['validado'],
            'emissao' => $boleto['emissao'] ?? 'N/A',
            'vencimento' => $boleto['vencimento'] ?? 'N/A',
            'valor' => $boleto['valor'] ?? 'N/A'
        ];
    }

    return $validatedBoletos;
}

// Função para chamar a API do OpenRouter
function callOpenRouterAPI($imagePath) {
    $apiKey = getenv('OPENROUTER_API_KEY') ?: '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';
    $model = 'qwen/qwen2.5-vl-72b-instruct:free';

    if (!file_exists($imagePath)) {
        error_log("Imagem não encontrada: $imagePath");
        return ['error' => 'Imagem não encontrada'];
    }

    $imageData = @base64_encode(@file_get_contents($imagePath));
    if ($imageData === false) {
        error_log("Falha ao ler a imagem: $imagePath");
        return ['error' => 'Falha ao processar a imagem'];
    }

$prompt = <<<EOD
分析提供的图像，识别所有可见的付款单（boletos），无论其布局、大小或方向如何。从每个付款单中提取数据，并以JSON格式返回一个对象数组，其中每个对象包含以下字段：documento、empresa、valor、emissao 和 vencimento。

使用以下提取规则：

将行中第一个可见的数字识别为文档编号（例如，“10141”）。这将是“documento”字段。
忽略固定字段，例如状态（“Pendente”）和支付方式（“Dinheiro”）。
发行公司名称出现在“Pendente”字段和第一个日期之间。将这两点之间的所有内容视为“empresa”字段。使用完整的公司名称，尽可能避免缩写。
公司名称后第一个以DD/MM/YYYY格式显示的日期表示发行日期（“emissao”）。
第二个以DD/MM/YYYY格式的日期是到期日期（“vencimento”）。
付款单金额始终是行中的最后一个元素，必须以“valor”字段捕获，使用逗号作为小数点分隔符，并保留两位小数（例如，“1.240,00”）。
如果文档编号包含斜杠（例如，“12345/001”），请保留斜杠。
输出格式：
[
{
"documento": "10141",
"empresa": "OCEANO CONFECCAO SURFWEAR LTDA",
"valor": "993,34",
"emissao": "27/03/2025",
"vencimento": "01/05/2025"
},
...
]

如果未找到付款单或图像无效，返回：
{"error": "未识别到付款单或图像无效"}

确保处理图像中所有可见的付款单，即使它们位于不同位置、部分可见或间距不一致。
EOD;


    $payload = [
        'model' => $model,
        'messages' => [
            [
                'role' => 'user',
                'content' => [
                    ['type' => 'text', 'text' => $prompt],
                    ['type' => 'image_url', 'image_url' => ['url' => "data:image/jpeg;base64,$imageData"]]
                ]
            ]
        ]
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://openrouter.ai/api/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 200);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

    $response = curl_exec($ch);
    if ($response === false) {
        $error = curl_error($ch);
        $errno = curl_errno($ch);
        curl_close($ch);
        $logMessage = "Erro ao chamar a API do OpenRouter: $error (Código: $errno)";
        error_log($logMessage);
        return ['error' => "Erro ao chamar a API do OpenRouter: $error"];
    }

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        $logMessage = "Erro ao chamar a API do OpenRouter: HTTP $httpCode. Resposta: " . $response;
        error_log($logMessage);
        return ['error' => "Erro ao chamar a API do OpenRouter: HTTP $httpCode"];
    }

    $data = json_decode($response, true);
    if (isset($data['choices'][0]['message']['content'])) {
        $rawContent = $data['choices'][0]['message']['content'];
        error_log("Conteúdo bruto de choices[0].message.content: " . $rawContent);

        // Tentar extrair JSON, com fallback para conteúdo bruto
        $cleanContent = $rawContent;
        if (preg_match('/```json\s*([\s\S]*?)\s*```/', $rawContent, $matches)) {
            $cleanContent = trim($matches[1]);
        } elseif (preg_match('/{[\s\S]*}/', $rawContent, $matches)) {
            $cleanContent = trim($matches[0]);
        }

        // Tentar decodificar como JSON
        $content = json_decode($cleanContent, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            if (isset($content['error'])) {
                return $content;
            }
            // Substituir o log da resposta completa da API para registrar apenas os boletos identificados
            $logMessage = "Boletos identificados: " . json_encode($content);
            error_log($logMessage);
            return is_array($content) ? $content : ['error' => "Resposta da API não é um array válido. Conteúdo: " . $cleanContent];
        } else {
            $logMessage = "Erro ao decodificar como JSON: " . json_last_error_msg() . ". Conteúdo limpo: " . $cleanContent;
            error_log($logMessage);
            return ['error' => "Não foi possível extrair boletos do texto. Conteúdo: " . $rawContent];
        }
    } else {
        $logMessage = "Resposta inválida da API do OpenRouter. Estrutura esperada não encontrada.";
        error_log($logMessage);
        return ['error' => 'Resposta inválida da API do OpenRouter'];
    }
}

// Processamento principal
header('Content-Type: application/json; charset=utf-8');

try {
    // Verificar se o arquivo foi enviado
    if (!isset($_FILES['image']) || $_FILES['image']['error'] === UPLOAD_ERR_NO_FILE) {
        $errorMessage = 'Nenhuma imagem enviada';
        error_log($errorMessage);
        echo json_encode(['error' => $errorMessage]);
        exit;
    }

    // Verificar erros de upload
    if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        $errorMessage = 'Erro ao fazer upload da imagem: Código ' . $_FILES['image']['error'];
        error_log($errorMessage);
        echo json_encode(['error' => $errorMessage]);
        exit;
    }

    $uploadDir = 'Uploads/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true) || !is_writable($uploadDir)) {
            $errorMessage = 'Não foi possível criar ou escrever no diretório Uploads/';
            error_log($errorMessage);
            echo json_encode(['error' => $errorMessage]);
            exit;
        }
    }

    $imagePath = $uploadDir . basename($_FILES['image']['name']);
    if (!move_uploaded_file($_FILES['image']['tmp_name'], $imagePath)) {
        $errorMessage = 'Erro ao mover a imagem para o diretório Uploads/';
        error_log($errorMessage);
        echo json_encode(['error' => $errorMessage]);
        exit;
    }

    $result = callOpenRouterAPI($imagePath);
    unlink($imagePath); // Remover imagem após uso

    if (isset($result['error'])) {
        error_log("Erro no processamento: " . $result['error']);
        echo json_encode(['error' => $result['error']]);
        exit;
    }

    // Validar as empresas no banco de dados
    $validatedBoletos = validateCompanies($result);

    // Se nenhum boleto for válido
    if (empty($validatedBoletos)) {
        $errorMessage = "Nenhum boleto identificado.";
        error_log($errorMessage);
        echo json_encode(['error' => $errorMessage]);
        exit;
    }

    echo json_encode(['boletos' => $validatedBoletos], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    $errorMessage = 'Erro inesperado: ' . $e->getMessage();
    error_log($errorMessage);
    echo json_encode(['error' => $errorMessage], JSON_UNESCAPED_UNICODE);
}