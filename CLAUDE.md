# ChefOS v2

> Control operativo de cocina multi-servicio para hoteles, catering y eventos

## Stack
- Next.js 16+ (App Router), React 19, TypeScript 5 strict
- Supabase (PostgreSQL 17, Auth, RLS, RPCs, Storage, Edge Functions)
- Tailwind CSS 4, shadcn/ui, TanStack Query 5, React Hook Form + Zod v4
- Vitest (unit), Playwright (E2E), Recharts

## Estructura
- `src/features/` — 15 modulos de negocio (identity, commercial, recipes, catalog, procurement, inventory, production, reporting, automation, compliance, documents, analytics, integrations, hr, notifications)
- Cada feature: components/, hooks/, schemas/, services/, types/, utils/
- `src/app/(dashboard)/` — rutas protegidas
- `src/app/(auth)/` — login, signup, callback
- `supabase/migrations/` — migraciones SQL numeradas
- `docs/PRD.md` — PRD completo (16 modulos, 80+ tablas, 15 agentes, 4 modelos ML)
- `docs/MODULO_*.md` — specs detalladas por modulo (del GitHub original)

## Principios
- Database-first: reglas de negocio en RPCs PostgreSQL (security definer)
- Multi-tenant via RLS: hotel_id en toda tabla, aislamiento por memberships
- State machines validadas en DB, no en frontend
- Domain events: toda mutacion emite evento (20 contratos tipados)
- Audit trail inmutable
- Modulos nunca se llaman entre si: emiten eventos, otros reaccionan
- Asistido NO autonomo: agentes sugieren, usuario confirma

## Comandos
- `npm run dev` — Next.js dev server
- `npm run build` — build produccion
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript strict
- `npm run test` — Vitest
- `npm run test:e2e` — Playwright
- `npx supabase start` — Supabase local
- `npx supabase db reset` — reset + migraciones + seed

## Supabase
- Proyecto: dbtrgnyfmzqsrcoadcrs (cuenta raisada1001@gmail.com)
- Migracion actual: 00001_d0_identity.sql

## Estado actual
- D0 Identidad: migracion completa, auth flow, app shell con sidebar adaptativa
- Pendiente: ejecutar migracion en Supabase, M1 Comercial

## Fase actual: MVP (Q2 2026)
Modulos MVP: D0 Identidad, M1 Comercial, M2 Recetas, M3 Catalogo, M4 Compras, M5 Inventario, M6 Produccion, M7 Direccion
