$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api'
$accountId = 'cmm4xuy93000bzw8iiimdbvvg'
$attendantId = 'cmm4xuqtq0002g5enxavzfipe'

$inbound = @{
  eventId = 'evt-auto-3001'
  accountId = $accountId
  messages = @(
    @{
      id = 'wamid-auto-3001'
      from = '5511991112222'
      text = 'Oi, quero simular atendimento completo'
      type = 'text'
    }
  )
} | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri "$base/webhooks/whatsapp" -ContentType 'application/json' -Body $inbound | Out-Null

$convs = Invoke-RestMethod -Method Get -Uri "$base/conversations"
$conv = $convs | Where-Object { $_.contact.phone -eq '5511991112222' } | Select-Object -First 1
if (-not $conv) { throw 'Conversa nao encontrada' }
$convId = $conv.id

Invoke-RestMethod -Method Patch -Uri "$base/conversations/$convId/assign" -ContentType 'application/json' -Body (@{ userId = $attendantId } | ConvertTo-Json) | Out-Null

Invoke-RestMethod -Method Post -Uri "$base/conversations/send-message" -ContentType 'application/json' -Body (@{
  conversationId = $convId
  accountId = $accountId
  to = '5511991112222'
  text = 'Perfeito, vou montar sua proposta.'
} | ConvertTo-Json) | Out-Null

$full = Invoke-RestMethod -Method Get -Uri "$base/conversations/$convId"
$contactId = $full.contact.id

$stages = Invoke-RestMethod -Method Get -Uri "$base/pipeline/stages"
$novoLead = ($stages | Where-Object { $_.name -eq 'Novo Lead' } | Select-Object -First 1).id
$emConversa = ($stages | Where-Object { $_.name -eq 'Em conversa' } | Select-Object -First 1).id

$deal = Invoke-RestMethod -Method Post -Uri "$base/pipeline/deals" -ContentType 'application/json' -Body (@{
  title = 'Lead simulado - 5511991112222'
  contactId = $contactId
  conversationId = $convId
  pipelineStageId = $novoLead
  valueCents = 129900
} | ConvertTo-Json)

Invoke-RestMethod -Method Patch -Uri "$base/pipeline/deals/$($deal.id)/move" -ContentType 'application/json' -Body (@{
  toStageId = $emConversa
  note = 'Cliente pediu prazo de entrega'
} | ConvertTo-Json) | Out-Null

$order = Invoke-RestMethod -Method Post -Uri "$base/orders" -ContentType 'application/json' -Body (@{
  contactId = $contactId
  dealId = $deal.id
  conversationId = $convId
  shippingCents = 1500
  discountCents = 500
  items = @(
    @{ name = 'Produto A'; quantity = 2; unitCents = 3000 },
    @{ name = 'Produto B'; quantity = 1; unitCents = 5000 }
  )
} | ConvertTo-Json -Depth 6)

$sales = Invoke-RestMethod -Method Get -Uri "$base/reports/sales/monthly"

[PSCustomObject]@{
  conversationId = $convId
  contactId = $contactId
  dealId = $deal.id
  orderId = $order.id
  pedidosNoMes = $sales.orders
  totalVendidoNoMes = $sales.totalCents
} | ConvertTo-Json -Depth 5
