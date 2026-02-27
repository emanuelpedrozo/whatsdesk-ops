$loginBody = @{ email='supervisor@local.dev'; password='admin123' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/auth/login' -ContentType 'application/json' -Body $loginBody
$token = $login.accessToken
$qr = Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/qr/session' -Headers @{ Authorization = "Bearer $token" }
$qr | ConvertTo-Json -Depth 4
