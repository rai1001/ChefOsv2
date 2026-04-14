
# AGENT (Modo Automático)

## Objetivo
Construir ChefOS completo (PC/tablet/móvil) con:
- Supabase (Postgres + Auth + Storage + Edge Functions)
- Next.js en Vercel
- Clean + Hexagonal
- Turborepo monorepo
- Testing >= 90% + E2E críticos

## Forma de trabajo
- Ejecutar `tasks/` en orden numérico.
- No cerrar una tarea si el repo no está en estado verde:
  - pnpm lint
  - pnpm typecheck
  - pnpm test

## En caso de ambigüedad
- NO improvisar.
- Registrar decisión en `docs/DECISIONS.md`.
- Elegir la opción más simple y coherente con el stack.

## Reglas de oro
- Contratos (packages/contracts) y migraciones (supabase/migrations) mandan.
- Multi-tenant por `hotel_id` en todas las tablas.
- RLS activo en todas las tablas sensibles.
- UI debe seguir referencias Stitch.
