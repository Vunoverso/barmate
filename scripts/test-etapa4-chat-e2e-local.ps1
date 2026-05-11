$ErrorActionPreference = 'Stop'

$base = 'http://127.0.0.1:9000'
$email = 'semnomelogan@gmail.com'
$pass = 'cocofidido1981'
$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Login NextAuth
$csrf = ((Invoke-WebRequest -Uri "$base/api/auth/csrf" -WebSession $sess -UseBasicParsing).Content | ConvertFrom-Json).csrfToken
$form = "csrfToken=$([uri]::EscapeDataString($csrf))&email=$([uri]::EscapeDataString($email))&password=$([uri]::EscapeDataString($pass))&callbackUrl=$([uri]::EscapeDataString("$base/dashboard"))&json=true"
Invoke-WebRequest -Uri "$base/api/auth/callback/credentials" -Method POST -ContentType 'application/x-www-form-urlencoded' -Body $form -WebSession $sess -MaximumRedirection 0 | Out-Null

# Criar comanda teste compartilhada
$testId = "ord-chat-local-$(Get-Date -Format 'yyyyMMddHHmmss')"
$nowIso = (Get-Date).ToString('o')
$createBody = @{
  id = $testId
  name = 'Teste Chat Local E2E'
  isShared = $true
  items = @()
  createdAt = $nowIso
  updatedAt = $nowIso
  customerStatus = 'aceito'
  orderOrigin = 'link_enviado'
  chatMessages = @()
} | ConvertTo-Json -Depth 10
Invoke-WebRequest -Uri "$base/api/db/open-orders" -Method POST -ContentType 'application/json' -Body $createBody -WebSession $sess -UseBasicParsing | Out-Null

# Cliente envia mensagem na API publica nova
$guestMsg = @{ text = 'Pode trocar por suco sem gelo?'; kind = 'quick' } | ConvertTo-Json
$guestResp = Invoke-WebRequest -Uri "$base/api/public/order/$testId/chat" -Method POST -ContentType 'application/json' -Body $guestMsg -UseBasicParsing
$guestJson = $guestResp.Content | ConvertFrom-Json

# Operacao responde via API autenticada
$allOrders = (Invoke-WebRequest -Uri "$base/api/db/open-orders" -WebSession $sess -UseBasicParsing).Content | ConvertFrom-Json
$order = $allOrders | Where-Object { $_.id -eq $testId } | Select-Object -First 1
$chat = @()
if ($null -ne $order.chatMessages) { $chat = @($order.chatMessages) }
$chat += [pscustomobject]@{
  id = "msg-s-$(Get-Date -Format 'yyyyMMddHHmmss')"
  sender = 'staff'
  text = 'Pode sim. Ajustado para suco sem gelo.'
  createdAt = (Get-Date).ToString('o')
  kind = 'quick'
}

$updateBody = @{
  id = $order.id
  name = $order.name
  isShared = $order.isShared
  items = $order.items
  createdAt = $order.createdAt
  updatedAt = (Get-Date).ToString('o')
  customerStatus = $order.customerStatus
  orderOrigin = $order.orderOrigin
  chatMessages = $chat
} | ConvertTo-Json -Depth 20
Invoke-WebRequest -Uri "$base/api/db/open-orders" -Method POST -ContentType 'application/json' -Body $updateBody -WebSession $sess -UseBasicParsing | Out-Null

# Validar leitura publica
$publicChat = (Invoke-WebRequest -Uri "$base/api/public/order/$testId/chat" -UseBasicParsing).Content | ConvertFrom-Json
$publicOrder = (Invoke-WebRequest -Uri "$base/api/public/order/$testId" -UseBasicParsing).Content | ConvertFrom-Json

Write-Output "TEST_ORDER_ID=$testId"
Write-Output "GUEST_POST_OK=$($guestJson.ok)"
Write-Output "PUBLIC_CHAT_COUNT=$(@($publicChat.messages).Count)"
Write-Output "PUBLIC_ORDER_CHAT_COUNT=$(@($publicOrder.chatMessages).Count)"
Write-Output "LAST_PUBLIC_MESSAGE_SENDER=$($publicChat.messages[-1].sender)"
Write-Output "LAST_PUBLIC_MESSAGE_TEXT=$($publicChat.messages[-1].text)"

# Cleanup
Invoke-WebRequest -Uri "$base/api/db/open-orders?id=$testId" -Method DELETE -WebSession $sess -UseBasicParsing | Out-Null
Write-Output 'CLEANUP=OK'
