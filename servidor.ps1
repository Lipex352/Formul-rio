# ==============================================================================
# STANLEY FELLIPE - SERVIDOR LOCAL REST & ESTÁTICO (POWERSHELL / .NET)
# Zero dependências externas (Funciona nativamente em qualquer Windows)
# ==============================================================================

$port = 3000
$rootPath = $PSScriptRoot
$dataFile = Join-Path $rootPath "respostas.json"

# Garantir existência do arquivo respostas.json
if (-not (Test-Path $dataFile)) {
    Set-Content -Path $dataFile -Value "[]" -Encoding UTF8
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "[ERRO] Nao foi possivel iniciar na porta $port. Verifique se ja esta em uso." -ForegroundColor Red
    exit 1
}

Write-Host "============================================================" -ForegroundColor DarkYellow
Write-Host "  <SF> STANLEY FELLIPE - SERVIDOR DE BRIEFINGS ONLINE" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor DarkYellow
Write-Host "  Formulario do Cliente : http://localhost:$port/" -ForegroundColor Green
Write-Host "  Painel de Respostas   : http://localhost:$port/admin.html" -ForegroundColor Cyan
Write-Host "  Banco de Dados Local  : $dataFile" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor DarkYellow
Write-Host "  Pressione Ctrl + C para encerrar o servidor." -ForegroundColor DarkGray
Write-Host ""

# Mapa de Content-Types
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".txt"  = "text/plain; charset=utf-8"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Headers
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $rawUrl = $request.Url.LocalPath

        # ROTA API: GET /api/respostas
        if ($rawUrl -eq "/api/respostas" -and $request.HttpMethod -eq "GET") {
            $jsonContent = Get-Content -Path $dataFile -Raw -Encoding UTF8
            if (-not $jsonContent) { $jsonContent = "[]" }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonContent)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        # ROTA API: POST /api/respostas (Nova resposta)
        if ($rawUrl -eq "/api/respostas" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Close()

            if ($body) {
                try {
                    $newSubmission = $body | ConvertFrom-Json
                    $existingRaw = Get-Content -Path $dataFile -Raw -Encoding UTF8
                    $existing = if ($existingRaw) { $existingRaw | ConvertFrom-Json } else { @() }
                    
                    if (-not ($existing -is [System.Collections.IList] -or $existing -is [Array])) {
                        $existing = @($existing)
                    }

                    # Prepend new submission
                    $updatedList = @($newSubmission) + $existing
                    $updatedJson = $updatedList | ConvertTo-Json -Depth 10
                    Set-Content -Path $dataFile -Value $updatedJson -Encoding UTF8
                    
                    Write-Host "[API] Novo briefing registrado com sucesso: $($newSubmission.segmento)" -ForegroundColor Green

                    $resMsg = '{"success":true,"message":"Briefing gravado com sucesso no arquivo respostas.json"}'
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($resMsg)
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $bytes.Length
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                    $response.StatusCode = 200
                } catch {
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"error":"Erro ao processar JSON"}')
                    $response.StatusCode = 400
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
            }
            $response.Close()
            continue
        }

        # ROTA API: POST /api/respostas/sync (Sincronização completa de lista)
        if ($rawUrl -eq "/api/respostas/sync" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Close()

            if ($body) {
                Set-Content -Path $dataFile -Value $body -Encoding UTF8
                $resMsg = '{"success":true,"message":"Sincronizacao concluida"}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($resMsg)
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.StatusCode = 200
            }
            $response.Close()
            continue
        }

        # SERVIR ARQUIVOS ESTÁTICOS
        if ($rawUrl -eq "/" -or $rawUrl -eq "") {
            $relPath = "index.html"
        } else {
            $relPath = $rawUrl.TrimStart("/").Replace("/", "\")
        }

        $filePath = Join-Path $rootPath $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.StatusCode = 200
        } else {
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 - Arquivo nao encontrado</h1>")
            $response.ContentType = "text/html; charset=utf-8"
            $response.StatusCode = 404
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
        }

        $response.Close()
    } catch {
        # Ignorar abortos normais ao fechar
    }
}

$listener.Close()
