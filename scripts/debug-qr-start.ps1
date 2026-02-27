$ErrorActionPreference = 'Continue'
$loginBody = @{ email='supervisor@local.dev'; password='admin123' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/auth/login' -ContentType 'application/json' -Body $loginBody
$token = $login.accessToken

$boot = Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/operations/bootstrap' -Headers @{ Authorization = "Bearer $token" }
$accountId = $boot.whatsappAccounts[0].id

try {
  $startBody = @{ accountId = $accountId } | ConvertTo-Json
  $resp = Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/qr/session/start' -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $startBody
  $resp | ConvertTo-Json -Depth 5
} catch {
  $_ | Format-List -Force
}
