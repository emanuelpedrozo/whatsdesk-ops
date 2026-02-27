$loginBody = @{ email='supervisor@local.dev'; password='admin123' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/auth/login' -ContentType 'application/json' -Body $loginBody
$token = $login.accessToken

$agents = Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/agents' -Headers @{ Authorization = "Bearer $token" }
[PSCustomObject]@{ tokenIssued = [bool]$token; agents = $agents.Count } | ConvertTo-Json -Depth 4
