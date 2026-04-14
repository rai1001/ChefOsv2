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
- Hotel test: ec079cf6-13b1-4be5-9e6f-62c8f604cb1e
- Migraciones: 00001-00008 (D0 + fixes + M1 + M2 + M3 + M4)
- Ejecutar migraciones: `cat file.sql | npx supabase db query --linked`

## Estado actual (2026-04-14)
- D0 Identidad: COMPLETO — auth flow, app shell, sidebar adaptativa, audit triggers
- M1 Comercial: COMPLETO — eventos, clientes, state machine, BEO, calendario
- M2 Recetas: COMPLETO — recetas, ingredientes, pasos, costeo recursivo con cycle detection (E5), sub-recetas, menus, state machine (draft→review→approved→deprecated), ficha tecnica
- M3 Catalogo: COMPLETO — productos, categorias (12 default), proveedores, ofertas con preferido, aliases, import masivo, FK recipe_ingredients→products
- M4 Compras: COMPLETO — solicitudes (PR), ordenes (PO), recepcion mercancia (GR), state machines (PR: draft→approved→consolidated, PO: draft→sent→received), consolidacion PRs en POs
- M5 Inventario: PENDIENTE
- M6 Produccion: PENDIENTE
- M7 Dashboard: PENDIENTE

## Patrones establecidos
- RLS: `is_member_of(hotel_id)` para reads, `get_member_role(hotel_id)` para writes
- RPCs: `check_membership()` al inicio, `emit_event()` para domain events
- Triggers: `audit_trigger_fn()` en tablas clave, `set_updated_at()` para timestamps
- Frontend: tipos con const arrays + labels, hooks TanStack Query, paginas con skeleton/empty/table

## Fase actual: MVP (Q2 2026)
Modulos MVP: D0 Identidad, M1 Comercial, M2 Recetas, M3 Catalogo, M4 Compras, M5 Inventario, M6 Produccion, M7 Direccion
