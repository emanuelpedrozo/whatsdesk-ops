# ADR 0003: Integracao WhatsApp por Adapter

## Status
Aceito

## Contexto
Pode haver troca de BSP ou entrada tardia na API oficial.

## Decisao
Criar `WhatsappProviderPort` e implementar adapters por provedor.

## Consequencias
- Core de negocio desacoplado do fornecedor.
- Facil introduzir provider oficial/terceiros sem reescrever modulos de conversa.
