# ADR 0002: PostgreSQL + Prisma

## Status
Aceito

## Contexto
Dominio transacional com auditoria e forte relacao entre entidades.

## Decisao
- PostgreSQL como banco principal.
- Prisma ORM para produtividade no MVP.

## Consequencias
- Forte consistencia transacional e simplicidade operacional.
- Evolucao para SQL tunado em pontos de performance quando necessario.
