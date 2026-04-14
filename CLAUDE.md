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
- Migraciones: 00001-00014 (D0 + fixes + M1-M7 + bug fixes + escandallo live + catalog prices)
- Ejecutar migraciones: `cat file.sql | npx supabase db query --linked`

## Mapa de migraciones
| # | Archivo | Contenido |
|---|---------|-----------|
| 00001 | d0_identity | Multi-tenant, RBAC, audit, memberships, domain_events |
| 00002 | fix_audit_trigger | Fix trigger hotel_id dinamico |
| 00003 | m1_commercial | Eventos, clientes, BEO, state machine |
| 00004 | fix_rls_policies | Fix RLS separacion select/insert/update/delete |
| 00005 | fix_rls_recursion | Fix self-referencing en memberships |
| 00006 | m2_recipes | Recetas, ingredientes, pasos, costeo recursivo, menus |
| 00007 | m3_catalog | Productos, categorias, proveedores, ofertas, aliases |
| 00008 | m4_procurement | PR, PO, GR, state machines, consolidacion |
| 00009 | m5_inventory | FIFO lots, movements, waste, auto-stock trigger, alertas |
| 00010 | m6_production | Planes, tasks, generate_production_plan, progress |
| 00011 | m7_dashboard | get_dashboard_data RPC agregando todos los modulos |
| 00012 | fix_inventory_rpcs | P1 record_waste ownership, P1 transfer_stock split-lot, P2 LEFT JOIN |
| 00013 | escandallo_live | get_escandallo_live, sync_escandallo_prices |
| 00014 | catalog_prices | get_catalog_prices (GR price + offer fallback) |
| 00015 | **m3_extended** | supplier_configs, supplier_incidents, price_history (trigger auto), product_supplier_refs. **PENDIENTE APLICAR A SUPABASE** |

## Estado actual (2026-04-14 — Sesión 1 de plan completado PRD)
- D0 Identidad: COMPLETO — auth flow, app shell, sidebar adaptativa (4 perfiles), audit triggers
- M1 Comercial: COMPLETO — eventos, clientes, state machine, BEO, calendario
- M2 Recetas: COMPLETO — recetas, ingredientes, pasos, costeo recursivo con cycle detection (E5), sub-recetas, menus, state machine (draft→review→approved→deprecated), ficha tecnica
- M3 Catalogo: COMPLETO — productos, categorias (12 default), proveedores, ofertas con preferido, aliases, import masivo, FK recipe_ingredients→products
- M4 Compras: COMPLETO — solicitudes (PR), ordenes (PO), recepcion mercancia (GR), state machines (PR: draft→approved→consolidated, PO: draft→sent→received), consolidacion PRs en POs
- M5 Inventario: COMPLETO + BUGS FIJADOS — storage_locations, stock_lots (FIFO), stock_movements (ledger), waste_records, auto-stock desde goods_receipts (trigger), alertas stock bajo + caducidad; RPCs: get_stock_levels (LEFT JOIN), record_waste (ownership validation), transfer_stock (split-lot), adjust_stock, check_stock_alerts
- M6 Produccion: COMPLETO — production_plans (diario), production_plan_items (por receta/departamento), production_tasks, genera plan desde eventos confirmados (event→menu→recipe chain), state machines, items agrupados por partida, progreso por departamento
- M7 Dashboard: COMPLETO — get_dashboard_data RPC agrega KPIs de todos los modulos, widgets con datos live (eventos, produccion, compras, inventario, recetas, mermas), alertas stock bajo/caducidad, eventos del dia, barra progreso produccion
- Escandallos: COMPLETO — /recipes/[id]/escandallo (live vs albarán, sync precios, proyeccion FC%), /escandallos simulador (sin receta previa, busqueda catalogo con precio GR, calculo live, guardar como borrador)

## Bugs cerrados (codex review 2026-04-14)
- P1 record_waste: validacion ownership lot_id antes de deducir stock
- P1 transfer_stock: split-lot para transferencias parciales (creaba lote nuevo en destino)
- P2 get_stock_levels: INNER JOIN → LEFT JOIN (productos 0 stock visibles)
- P3 inventory/page.tsx: Date.now() fuera de render (React 19 purity)
- P2 app-shell.tsx: errores transitorios → ShellError, solo redirige a onboarding si !hotel sin error
- QA 404s: /reports, /settings, /settings/team (placeholders creados)

## Patrones establecidos
- RLS: `is_member_of(hotel_id)` para reads, `get_member_role(hotel_id)` para writes
- RPCs: `check_membership()` al inicio, `emit_event()` para domain events
- Triggers: `audit_trigger_fn()` en tablas clave, `set_updated_at()` para timestamps
- Frontend: tipos con const arrays + labels, hooks TanStack Query, paginas con skeleton/empty/table
- Escandallo live: useEscandalloLive (refetchOnWindowFocus, 2min interval), useSyncEscandalloPrices
- Precios: GR price (ultimo albarán aceptado) > offer price (proveedor preferido) > manual

## Fase actual: Plan completado PRD en curso
MVP básico (D0+M1-M7) cerrado. Plan maestro aprobado (todo el PRD: MVP+F2+F3+F4).

**Progreso:** Sesión 1/~14 completada — Etapa 1.1 (M3 extendido)
**Plan maestro:** `C:\Users\Israel\.claude\plans\misty-petting-haven.md`
**Estado detallado + roadmap sesiones:** `docs/ESTADO_PLAN_COMPLETADO.md`

### Próximas etapas pendientes (piezas del MVP según PRD que aún faltan):
1. **Etapa 1.2** — M5 reservations FIFO + stock_counts (conteo ciego) + forensics + calculate_real_cost
2. **Etapa 1.3** — M6 workflows + mise_en_place + KDS + generate_shopping_list + plantillas repetitivas
3. **Etapa 1.4** — M1 BEO PDF + event_operational_impact + calculate_event_cost_estimate
4. **Etapa 1.5** — M7 alerts + kpi_snapshots + food_cost_by_service/event + cost_variance

### Fase 2:
5. M10 Documentos PDF (9 plantillas)
6. M8 Automation (jobs queue + worker)
7. M14 Notificaciones
8. M9 Compliance APPCC + etiquetado QR + trazabilidad

### Fase 3:
9. M12 Integraciones PMS/POS (Mews, OPERA, Lightspeed, Simphony)
10. M13 RRHH y turnos
11. M15 Agentes autónomos (5 automejora + 5 coordinación evento)
12. M11 Analytics + ML/Forecast

### Fase 4:
13. M16 Marketplace (esqueleto)

## Arquitectura del escandallo (aclaración)
El coste de receta se alimenta de PRODUCTOS + PROVEEDORES (supplier_offers.is_preferred) + último GR (goods_receipts), snapshot en recipe_ingredients.unit_cost. **NO toca inventario** para calcular coste teórico. El inventario solo se usa para `calculate_real_cost` post-consumo real (Etapa 1.2).
