# Test para verificar duplicação de comanda
$ErrorActionPreference = 'Stop'

$base = 'http://127.0.0.1:9000'
$email = 'semnomelogan@gmail.com'
$pass = 'cocofidido1981'
$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "TEST: Iniciando teste de duplicacao de comanda" -ForegroundColor Cyan

# Login
$csrf = ((Invoke-WebRequest -Uri "$base/api/auth/csrf" -WebSession $sess -UseBasicParsing).Content | ConvertFrom-Json).csrfToken
$form = "csrfToken=$([uri]::EscapeDataString($csrf))&email=$([uri]::EscapeDataString($email))&password=$([uri]::EscapeDataString($pass))&callbackUrl=$([uri]::EscapeDataString("$base/dashboard"))&json=true"
Invoke-WebRequest -Uri "$base/api/auth/callback/credentials" -Method POST -ContentType 'application/x-www-form-urlencoded' -Body $form -WebSession $sess -MaximumRedirection 0 | Out-Null
Write-Host "LOGIN: OK" -ForegroundColor Green

# Criar comanda
$testId = "ord-dedup-$(Get-Date -Format 'yyyyMMddHHmmss')"
$nowIso = (Get-Date).ToString('o')
$createBody = @{
  id = $testId
  name = 'Teste Deduplicacao'
  isShared = $true
  items = @()
  createdAt = $nowIso
  updatedAt = $nowIso
  customerStatus = 'aceito'
  chatMessages = @()
} | ConvertTo-Json -Depth 10

$createResp = Invoke-WebRequest -Uri "$base/api/db/open-orders" -Method POST -ContentType 'application/json' -Body $createBody -WebSession $sess -UseBasicParsing
Write-Host "CREATE: Status $($createResp.StatusCode) - ID: $testId" -ForegroundColor Green

# Listar 5 vezes
Write-Host "TEST: Listando 5 vezes" -ForegroundColor Yellow
$duplicates = 0
for ($i = 1; $i -le 5; $i++) {
  Start-Sleep -Milliseconds 500
  $listResp = Invoke-WebRequest -Uri "$base/api/db/open-orders" -WebSession $sess -UseBasicParsing
  $orders = $listResp.Content | ConvertFrom-Json
  $count = ($orders | Where-Object { $_.id -eq $testId } | Measure-Object).Count
  
  $attempt = "Tentativa $i"
  if ($count -gt 1) {
    Write-Host "  $attempt - ERRO - $count copias encontradas" -ForegroundColor Red
    $duplicates = $duplicates + ($count - 1)
  } else {
    Write-Host "  $attempt - OK - 1 comanda" -ForegroundColor Green
  }
}

# Enviar mensagem
Write-Host "TEST: Enviando mensagem" -ForegroundColor Yellow
$guestMsg = @{ text = 'Teste dedup'; kind = 'quick' } | ConvertTo-Json
$chatResp = Invoke-WebRequest -Uri "$base/api/public/order/$testId/chat" -Method POST -ContentType 'application/json' -Body $guestMsg -UseBasicParsing
Write-Host "CHAT: Status $($chatResp.StatusCode)" -ForegroundColor Green

# Deletar
Write-Host "TEST: Deletando comanda" -ForegroundColor Yellow
$delResp = Invoke-WebRequest -Uri "$base/api/db/open-orders?id=$testId" -Method DELETE -WebSession $sess -UseBasicParsing
Write-Host "DELETE: Status $($delResp.StatusCode)" -ForegroundColor Green

# Verificar se nao ressurge
Start-Sleep -Milliseconds 500
$listResp = Invoke-WebRequest -Uri "$base/api/db/open-orders" -WebSession $sess -UseBasicParsing
$orders = $listResp.Content | ConvertFrom-Json
$countAfterDelete = ($orders | Where-Object { $_.id -eq $testId } | Measure-Object).Count

Write-Host ""
if ($countAfterDelete -eq 0 -and $duplicates -eq 0) {
  Write-Host "RESULTADO: SUCESSO - Nenhuma duplicacao detectada" -ForegroundColor Green
} else {
  Write-Host "RESULTADO: FALHA - $duplicates duplicatas encontradas, $countAfterDelete apos delete" -ForegroundColor Red
}
