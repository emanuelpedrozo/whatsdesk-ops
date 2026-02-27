$body = @{ email='supervisor@local.dev'; password='admin123' } | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/auth/login' -ContentType 'application/json' -Body $body
$r | ConvertTo-Json -Depth 4
