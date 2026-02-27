$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api'

function Get-Dashboard {
  return Invoke-RestMethod -Method Get -Uri "$base/operations/dashboard"
}

function New-InboundMessage($accountId, $phone, $text, $suffix) {
  $payload = @{
    eventId = "evt-$suffix-$(Get-Date -Format 'yyyyMMddHHmmssfff')"
    accountId = $accountId
    messages = @(
      @{
        id = "wamid-$suffix-$(Get-Date -Format 'yyyyMMddHHmmssfff')"
        from = $phone
        text = $text
        type = 'text'
      }
    )
  } | ConvertTo-Json -Depth 6

  Invoke-RestMethod -Method Post -Uri "$base/webhooks/whatsapp" -ContentType 'application/json' -Body $payload | Out-Null
}

$bootstrap = Invoke-RestMethod -Method Get -Uri "$base/operations/bootstrap"
$accountId = $bootstrap.whatsappAccounts[0].id
$agentId = $bootstrap.attendants[0].id

$initial = Get-Dashboard

# Cenario 1: agente offline
Invoke-RestMethod -Method Patch -Uri "$base/agents/$agentId/status" -ContentType 'application/json' -Body (@{ online = $false } | ConvertTo-Json) | Out-Null
$afterOffline = Get-Dashboard

# Cenario 2: fila sem responsavel
$phoneQueue = '5511997001001'
New-InboundMessage -accountId $accountId -phone $phoneQueue -text 'Cheguei na fila sem responsavel' -suffix 'queue'
$afterQueue = Get-Dashboard

# Cenario 3: pico de mensagens (5 entradas rapidas)
$phonesBurst = @('5511997002001','5511997002002','5511997002003','5511997002004','5511997002005')
foreach ($p in $phonesBurst) {
  New-InboundMessage -accountId $accountId -phone $p -text 'Pico de mensagens em lote' -suffix 'burst'
}
$afterBurst = Get-Dashboard

# volta agente online para nao deixar ambiente degradado
Invoke-RestMethod -Method Patch -Uri "$base/agents/$agentId/status" -ContentType 'application/json' -Body (@{ online = $true } | ConvertTo-Json) | Out-Null
$afterRestore = Get-Dashboard

$result = [PSCustomObject]@{
  baseline = [PSCustomObject]@{
    totalAtendimentos = $initial.kpis.totalAtendimentos
    aguardandoAtendimento = $initial.kpis.aguardandoAtendimento
    emAtendimento = $initial.kpis.emAtendimento
    agentesOnline = $initial.kpis.agentesOnline
  }
  scenario1_agentOffline = [PSCustomObject]@{
    agentesOnline = $afterOffline.kpis.agentesOnline
  }
  scenario2_queueWithoutOwner = [PSCustomObject]@{
    aguardandoAtendimento = $afterQueue.kpis.aguardandoAtendimento
    totalAtendimentos = $afterQueue.kpis.totalAtendimentos
  }
  scenario3_messageSpike = [PSCustomObject]@{
    totalAtendimentos = $afterBurst.kpis.totalAtendimentos
    aguardandoAtendimento = $afterBurst.kpis.aguardandoAtendimento
  }
  restored = [PSCustomObject]@{
    agentesOnline = $afterRestore.kpis.agentesOnline
  }
}

$result | ConvertTo-Json -Depth 6
