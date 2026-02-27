# Painel de Atendimento WhatsApp (Contact Center)

Implementacao MVP de um sistema web para gestao de atendentes e operacao de atendimento no WhatsApp.

## O que foi entregue
- Monorepo com:
  - `apps/api`: NestJS + Prisma + PostgreSQL.
  - `apps/web`: Next.js dashboard operacional (KPIs, fila, agentes).
- Fluxos MVP implementados:
  - Webhook de mensagem/status com idempotencia.
  - Persistencia de conversa/mensagem.
  - Envio de mensagem por camada de provider desacoplada.
  - Atribuicao de conversa.
  - Dashboard de operacoes (aguardando, em atendimento, finalizados, SLA).
  - Ranking por agente e consolidado por departamento.
  - Gestao de status de atendentes (online/offline).
  - Realtime via WebSocket para sincronizacao da UI.
- Base documental:
  - Arquitetura, backlog por sprints, ADRs, deploy e plano de evolucao IA.

## Estrutura
- `apps/api/src/modules`: modulos de dominio.
- `apps/api/prisma`: schema, migration bootstrap e seed.
- `apps/web/app`: interface web.
- `docs`: arquitetura, backlog, ADRs, storyboard e evolucao.
- `infra/docker-compose.yml`: postgres + redis local.

## Setup local
1. `./scripts/dev-up.sh`
2. `cp apps/api/.env.example apps/api/.env`
3. `cp apps/web/.env.example apps/web/.env.local`
4. `npm install`
5. `npm run prisma:generate -w @crm/api`
6. `npm run prisma:dev -w @crm/api`
7. `npm run prisma:seed -w @crm/api`
8. `npm run dev`

## Endpoints principais (MVP)
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/webhooks/whatsapp`
- `GET /api/conversations`
- `GET /api/conversations/:id`
- `PATCH /api/conversations/:id/assign`
- `PATCH /api/conversations/:id/status`
- `POST /api/conversations/send-message`
- `GET /api/operations/bootstrap`
- `GET /api/operations/dashboard`
- `GET /api/agents`
- `POST /api/agents`
- `PATCH /api/agents/:id/status`
- `GET /api/departments`
- `POST /api/departments`
- `PATCH /api/departments/:id`

## Realtime
- Namespace: `/realtime`
- Eventos: `conversation.updated`, `message.created`, `deal.moved`, `order.created`

## Observacoes
- `apps/api/prisma/migrations/0001_init/migration.sql` esta como bootstrap minimo; rode `prisma migrate dev` para gerar SQL completo do ambiente.
- Integracao WhatsApp esta preparada via adapter (`WhatsappProviderPort`) com implementacao mock inicial.

## Como testar operacao (sem numero real)
1. Login no painel (`http://localhost:3000`) com:
   - `supervisor@local.dev` / `admin123`
   - `admin@local.dev` / `admin123`
2. Obter IDs base:
   - `GET http://localhost:3001/api/operations/bootstrap` (com token JWT)
3. Simular mensagem recebida (webhook WhatsApp):
   - `POST http://localhost:3001/api/webhooks/whatsapp`
   - body:
     - `eventId`: identificador unico
     - `accountId`: usar `whatsappAccounts[0].id` do bootstrap
     - `messages`: lista com `id`, `from`, `text`, `type`
4. Buscar conversa criada:
   - `GET http://localhost:3001/api/conversations`
5. Atribuir para atendente:
   - `PATCH http://localhost:3001/api/conversations/:id/assign`
   - body: `{ "userId": "<id_atendente>" }`
6. Finalizar atendimento:
   - `PATCH http://localhost:3001/api/conversations/:id/status`
   - body: `{ "status": "RESOLVED" }`
7. Enviar resposta pelo painel:
   - `POST http://localhost:3001/api/conversations/send-message`
8. Acompanhar KPIs:
   - `GET http://localhost:3001/api/operations/dashboard`

## Login e RBAC
- Rotas protegidas exigem `Authorization: Bearer <token>`.
- Perfis suportados:
  - `Admin`: acesso total.
  - `Supervisor` (ou legado `Gerente`): gestao operacional.
  - `Atendente`: operacao de conversas.

## WhatsApp Provider
- `WHATSAPP_PROVIDER=mock` (padrao dev)
- `WHATSAPP_PROVIDER=meta` usa Cloud API:
  - `WHATSAPP_CLOUD_ACCESS_TOKEN`
  - `WHATSAPP_CLOUD_PHONE_NUMBER_ID`

## Conexao por QR (estilo WhatsApp Web)
- Endpoint de sessao QR:
  - `GET /api/qr/session`
  - `POST /api/qr/session/start`
  - `POST /api/qr/session/confirm`
  - `POST /api/qr/session/disconnect`
- No painel, use a secao **Conexao WhatsApp Web (QR)** para gerar/confirmar/desconectar.
- Modo real via Baileys:
  - defina `WHATSAPP_PROVIDER=baileys` no `apps/api/.env`
  - reinicie API
  - faca login no painel e clique em **Gerar QR**
  - escaneie no WhatsApp (Aparelhos conectados)
  - status muda para `CONNECTED`
