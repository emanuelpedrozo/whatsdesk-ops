$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api'

$bootstrap = Invoke-RestMethod -Method Get -Uri "$base/operations/bootstrap"
$accountId = $bootstrap.whatsappAccounts[0].id
$agentId = $bootstrap.attendants[0].id

$inbound = @{
  eventId = "evt-op-$(Get-Date -Format 'yyyyMMddHHmmss')"
  accountId = $accountId
  messages = @(
    @{
      id = "wamid-op-$(Get-Date -Format 'yyyyMMddHHmmss')"
      from = '5511995551000'
      text = 'Olá, preciso de ajuda no atendimento'
      type = 'text'
    }
  )
} | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri "$base/webhooks/whatsapp" -ContentType 'application/json' -Body $inbound | Out-Null

$convs = Invoke-RestMethod -Method Get -Uri "$base/conversations"
$conv = $convs | Where-Object { $_.contact.phone -eq '5511995551000' } | Select-Object -First 1
if (-not $conv) { throw 'Conversa nao criada' }
$convId = $conv.id

Invoke-RestMethod -Method Patch -Uri "$base/conversations/$convId/assign" -ContentType 'application/json' -Body (@{ userId = $agentId } | ConvertTo-Json) | Out-Null
Invoke-RestMethod -Method Post -Uri "$base/conversations/send-message" -ContentType 'application/json' -Body (@{
  conversationId = $convId
  accountId = $accountId
  to = '5511995551000'
  text = 'Atendente online. Vamos seguir com seu atendimento.'
} | ConvertTo-Json) | Out-Null

$dashboard = Invoke-RestMethod -Method Get -Uri "$base/operations/dashboard"

[PSCustomObject]@{
  accountId = $accountId
  agentId = $agentId
  conversationId = $convId
  totalAtendimentos = $dashboard.kpis.totalAtendimentos
  emAtendimento = $dashboard.kpis.emAtendimento
  agentesOnline = $dashboard.kpis.agentesOnline
  tempoMedioEspera = $dashboard.kpis.tempoMedioEspera
} | ConvertTo-Json -Depth 5
