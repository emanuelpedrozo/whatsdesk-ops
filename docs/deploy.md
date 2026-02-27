# Deploy

## Desenvolvimento
1. `./scripts/dev-up.sh`
2. `cp apps/api/.env.example apps/api/.env`
3. `cp apps/web/.env.example apps/web/.env.local`
4. `npm install`
5. `npm run prisma:generate -w @crm/api`
6. `npm run prisma:dev -w @crm/api`
7. `npm run prisma:seed -w @crm/api`
8. `npm run dev`

## Producao (referencia)
- API e Web containerizadas em ECS ou Kubernetes.
- PostgreSQL gerenciado + Redis gerenciado.
- Segredos no Secret Manager/Vault.
- CI/CD: lint + testes + migrate deploy + rollout blue/green.
