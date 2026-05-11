$ErrorActionPreference = 'Stop'

$base = 'http://127.0.0.1:9000'
$email = 'semnomelogan@gmail.com'
$pass = 'cocofidido1981'
$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "[TEST] Iniciando teste de duplicação de comanda..." -ForegroundColor Cyan

# Login NextAuth
$csrf = ((Invoke-WebRequest -Uri "$base/api/auth/csrf" -WebSession $sess -UseBasicParsing).Content | ConvertFrom-Json).csrfToken
$form = "csrfToken=$([uri]::EscapeDataString($csrf))&email=$([uri]::EscapeDataString($email))&password=$([uri]::EscapeDataString($pass))&callbackUrl=$([uri]::EscapeDataString("$base/dashboard"))&json=true"
Invoke-WebRequest -Uri "$base/api/auth/callback/credentials" -Method POST -ContentType 'application/x-www-form-urlencoded' -Body $form -WebSession $sess -MaximumRedirection 0 | Out-Null
Write-Host "[LOGIN] ✓ Autenticado como $email" -ForegroundColor Green

# Teste 1: Criar comanda simples
Write-Host "`n[TEST 1] Criando comanda simples compartilhada..." -ForegroundColor Yellow
$testId = "ord-dedup-$(Get-Date -Format 'yyyyMMddHHmmss')"
$nowIso = (Get-Date).ToString('o')
$createBody = @{
  id = $testId
  name = 'Teste Deduplicação'
  isShared = $true
  items = @()
  createdAt = $nowIso
  updatedAt = $nowIso
  customerStatus = 'aceito'
  chatMessages = @()
} | ConvertTo-Json -Depth 10

$createResp = Invoke-WebRequest -Uri "$base/api/db/open-orders" -Method POST -ContentType 'application/json' -Body $createBody -WebSession $sess -UseBasicParsing
Write-Host "[CREATE] POST /api/db/open-orders: $($createResp.StatusCode)" -ForegroundColor Green
Write-Host "[ID] $($testId)" -ForegroundColor Gray

# Teste 2: Listar múltiplas vezes para detectar duplicatas
Write-Host "`n[TEST 2] Listando comandas 5 vezes para detectar duplicatas..." -ForegroundColor Yellow
$duplicateCount = 0
for ($i = 1; $i -le 5; $i++) {
  Start-Sleep -Milliseconds 500
  $listResp = Invoke-WebRequest -Uri "$base/api/db/open-orders" -WebSession $sess -UseBasicParsing
  $orders = $listResp.Content | ConvertFrom-Json
  $countMatching = @($orders | Where-Object { $_.id -eq $testId }).Count
  
  Write-Host "  Tentativa $i`: encontradas $countMatching cópia(s) de $($testId)" -ForegroundColor $(if ($countMatching -gt 1) { 'Red' } else { 'Green' })
  
  if ($countMatching -gt 1) {
    $duplicateCount += ($countMatching - 1)
  }
}

# Teste 3: Enviar mensagem e verificar novamente
Write-Host "`n[TEST 3] Enviando mensagem de cliente..." -ForegroundColor Yellow
$guestMsg = @{ text = 'Teste de deduplicação'; kind = 'quick' } | ConvertTo-Json
$chatResp = Invoke-WebRequest -Uri "$base/api/public/order/$($testId)/chat" -Method POST -ContentType 'application/json' -Body $guestMsg -UseBasicParsing
Write-Host "[CHAT] POST /api/public/order/$($testId)/chat: $($chatResp.StatusCode)" -ForegroundColor Green

Start-Sleep -Seconds 1

# Teste 4: Listar novamente após chat
Write-Host "`n[TEST 4] Listando após chat para detectar duplicatas..." -ForegroundColor Yellow
$listResp = Invoke-WebRequest -Uri "$base/api/db/open-orders" -WebSession $sess -UseBasicParsing
$orders = $listResp.Content | ConvertFrom-Json
$countMatching = @($orders | Where-Object { $_.id -eq $testId }).Count

Write-Host "  Encontradas $countMatching cópia(s) de $($testId)" -ForegroundColor $(if ($countMatching -gt 1) { 'Red' } else { 'Green' })

# Teste 5: Deletar e verificar se ressurge
Write-Host "`n[TEST 5] Deletando comanda..." -ForegroundColor Yellow
$delResp = Invoke-WebRequest -Uri "$base/api/db/open-orders?id=$($testId)" -Method DELETE -WebSession $sess -UseBasicParsing
Write-Host "[DELETE] DELETE /api/db/open-orders?id=$($testId): $($delResp.StatusCode)" -ForegroundColor Green

Start-Sleep -Milliseconds 500

# Teste 6: Verificar se comanda deletada não ressurge
Write-Host "`n[TEST 6] Verificando se comanda não ressurge após DELETE..." -ForegroundColor Yellow
for ($i = 1; $i -le 3; $i++) {
  Start-Sleep -Milliseconds 500
  $listResp = Invoke-WebRequest -Uri "$base/api/db/open-orders" -WebSession $sess -UseBasicParsing
  $orders = $listResp.Content | ConvertFrom-Json
  $countMatching = @($orders | Where-Object { $_.id -eq $testId }).Count
  
  Write-Host "  Tentativa $i após delete: $countMatching cópia(s) encontrada(s)" -ForegroundColor $(if ($countMatching -gt 0) { 'Red' } else { 'Green' })
  
  if ($countMatching -gt 0) {
    Write-Host "    ⚠️ ERRO: Comanda deletada ressurgiu!" -ForegroundColor Red
    $duplicateCount += $countMatching
  }
}

# Resumo
Write-Host "`n" -ForegroundColor White
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
if ($duplicateCount -eq 0) {
  Write-Host "✓ TESTE PASSOU: Nenhuma duplicação detectada" -ForegroundColor Green
} else {
  Write-Host "✗ TESTE FALHOU: $duplicateCount duplicata(s) detectada(s)" -ForegroundColor Red
}
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
