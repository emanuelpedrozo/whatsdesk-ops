# Backlog Priorizado (4 sprints)

## Sprint 1 - Fundacao Tecnica
- Setup monorepo + CI inicial (lint/test/build).
- Modelagem de banco + migrations iniciais.
- Seed (roles, usuario admin, estagios do funil, conta WhatsApp demo).
- Webhook WhatsApp com idempotencia e persistencia de mensagens.
- Inbox API (lista, detalhe, atribuicao).

## Sprint 2 - Operacao Comercial
- Envio de mensagens via camada de provider.
- Pipeline: criar lead/deal, mover etapas, historico, motivo de perda.
- Pedidos: criacao com itens e calculo de total.
- Auditoria de acoes principais.
- Realtime (mensagem/conversa/deal/pedido).

## Sprint 3 - Produtividade e Regras
- Macros/snippets e placeholders.
- Lembretes de follow-up sem resposta.
- Automacoes basicas por gatilho de evento.
- Filtros por tags, responsavel e SLA.
- Relatorios (vendas por periodo, SLA, conversao de funil).

## Sprint 4 - Hardening e Go-live
- RBAC completo + 2FA opcional.
- Observabilidade com OTel + dashboards.
- Politicas LGPD (opt-out/export/delete/retencao).
- Testes E2E de fluxos criticos.
- Deploy prod (ECS/K8s + Terraform).
