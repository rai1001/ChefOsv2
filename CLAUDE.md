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
| 00015 | m3_extended | supplier_configs, supplier_incidents, price_history (trigger auto), product_supplier_refs |
| 00016 | m5_reservations_counts | stock_reservations, expiry_rules, stock_counts, stock_count_lines; RPCs: reserve_stock_for_event (FIFO), consume/release_reservation, calculate_real_cost, start/submit/review_stock_count, get_stock_forensics; trigger auto_calculate_event_cost |
| 00017 | m6_workflows_kds | workflows, workflow_tasks, mise_en_place_lists/items, kitchen_orders/items, recurring_task_templates; RPCs: generate_event_workflow, generate_shopping_list, task state machine, mark_mep_item, create_kitchen_order, update_ko_item_status, generate_recurring_tasks, get_workflow_detail |
| 00018 | m1_beo | event_operational_impact tabla+RLS; RPCs: generate_event_operational_impact, calculate_event_cost_estimate, get_event_beo (JSONB completo) |
| 00019 | m7_alerts_kpis | alerts, kpi_snapshots; enums alert_type/severity; RPCs: generate_daily_snapshot, dismiss_alert, get_active_alerts, get_food_cost_by_event, get_food_cost_by_service, get_cost_variance_report |
| 00020 | fixes_code_review | varios fixes post code-review |
| 00021 | m8_automation | automation_jobs, automation_job_logs, automation_triggers; enums job_type/status; RPCs: enqueue_job, claim_next_job, complete_job, fail_job, cancel_job, get_pending_jobs, get_job_logs |
| 00022 | m14_notifications | notifications, notification_preferences; enum notification_type; RPCs: create_notification, mark_read/all, get_unread, get_count, get_preferences, upsert_preference; trigger trg_auto_notify |
| 00023 | m9_compliance | appcc_templates, appcc_records, temperature_logs, labels; enums appcc_category/record_status/label_type; RPCs: create_appcc_record, log_temperature, create_label, trace_lot, seed_appcc_defaults (20 plantillas) |
| 00024 | security_fixes | REVOKE/GRANT worker+notify RPCs a service_role; backoff cap 120min; XSS fix email |
| 00025 | m12_integrations | pms_integrations, pos_integrations, integration_sync_logs; enums pms_type/pos_type/integration_status/sync_log_status; job_type+sync_pms/sync_pos; RPCs: create/update/disable pms+pos, trigger_pms/pos_sync, mark_sync_complete, get_pms/pos_integrations, get_sync_logs |
| 00026 | m13_hr | personnel, shift_definitions, schedule_rules, schedule_assignments; enums personnel_role/contract_type/shift_type/schedule_origin/schedule_status; RPCs: create/update_personnel, create/update_shift_definition, create/update/delete_schedule_rule, generate_monthly_schedule, update/delete_assignment, get_personnel/shift_definitions/schedule_rules/schedule_assignments |
| 00027 | m15_agents | agent_configs, agent_suggestions; enums agent_type/suggestion_status/suggestion_action; job_type+=run_agent; 10 RPCs agentes (price_watcher, waste_analyzer, stock_optimizer, recipe_cost_alert, compliance_reminder, event_planner, shopping_optimizer, kds_coordinator, post_event, forecast_prep) + get/approve/reject/upsert_config; trigger event.confirmed→event_planner, event.completed→post_event; seed 10 configs hotel test |
| 00028 | security_hardening | Codex audit round 1: SELECT policies pms/pos_integrations restringidas a admin+ (credentials ya no exfiltrables por cualquier miembro); trigger_pms/pos_sync + get_integration_sync_logs exigen rol admin+ (push_kitchen_orders exige direction+); search_path=public en 18 funciones M15; REVOKE EXECUTE en run_*_agent + _create_agent_suggestion a service_role |
| 00029 | sync_type_and_config_validation | Codex audit round 2: whitelist sync_type (errcode P0003 en valores fuera de lista); validación config.push_kitchen_orders/sync_sales/sync_occupancy/sync_reservations activa antes de encolar job |

## Estado actual (2026-04-15 — Sesión 13: QA + Codex security audit)
- D0 Identidad: COMPLETO — auth flow, app shell, sidebar adaptativa (4 perfiles), audit triggers
- M1 Comercial: COMPLETO — eventos, clientes, state machine, BEO, calendario
- M2 Recetas: COMPLETO — recetas, ingredientes, pasos, costeo recursivo con cycle detection (E5), sub-recetas, menus, state machine (draft→review→approved→deprecated), ficha tecnica
- M3 Catalogo: COMPLETO — productos, categorias (12 default), proveedores, ofertas con preferido, aliases, import masivo, FK recipe_ingredients→products; M3 extendido: supplier_configs, incidents, price_history, product_supplier_refs
- M4 Compras: COMPLETO — solicitudes (PR), ordenes (PO), recepcion mercancia (GR), state machines (PR: draft→approved→consolidated, PO: draft→sent→received), consolidacion PRs en POs
- M5 Inventario: COMPLETO + AVANZADO — stock_reservations (FIFO por evento), stock_counts (conteo ciego), stock_count_lines, expiry_rules; RPCs: reserve_stock_for_event, consume/release_reservation, calculate_real_cost, start/submit/review_stock_count, get_stock_forensics; UI: /inventory/counts, /inventory/forensics
- M6 Produccion: COMPLETO + AVANZADO — production_plans originales + workflows (generate_event_workflow), mise_en_place_lists/items, kitchen_orders KDS (polling 10s), kanban de tareas, shopping list por fecha; UI: /production/workflows/[id], /production/mise-en-place, /production/kds/[station], /production/kanban, /production/shopping-list
- M7 Dashboard: COMPLETO — get_dashboard_data RPC agrega KPIs de todos los modulos, widgets con datos live (eventos, produccion, compras, inventario, recetas, mermas), alertas stock bajo/caducidad, eventos del dia, barra progreso produccion
- Escandallos: COMPLETO — /recipes/[id]/escandallo (live vs albarán, sync precios, proyeccion FC%), /escandallos simulador (sin receta previa, busqueda catalogo con precio GR, calculo live, guardar como borrador)

## Bugs cerrados (codex review 2026-04-14)
- P1 record_waste: validacion ownership lot_id antes de deducir stock
- P1 transfer_stock: split-lot para transferencias parciales (creaba lote nuevo en destino)
- P2 get_stock_levels: INNER JOIN → LEFT JOIN (productos 0 stock visibles)
- P3 inventory/page.tsx: Date.now() fuera de render (React 19 purity)
- P2 app-shell.tsx: errores transitorios → ShellError, solo redirige a onboarding si !hotel sin error
- QA 404s: /reports, /settings, /settings/team (placeholders creados)

## Bugs cerrados (/qa 2026-04-15)
- ISSUE-001: Date.now() en render de escandallo/page.tsx → useState+setInterval (React 19 purity)
- ISSUE-002: 12 comillas sin escapar en JSX → `&ldquo;/&rdquo;` (7 archivos)
- ISSUE-003: Date.now() en simulador escandallos → useRef counter
- ISSUE-004: setState síncrono en useEffect de agents/config → render-phase state sync
- ISSUE-005: BEO PDF rompía build Turbopack (dynamic sobre @react-pdf/renderer external) → wrapper BeoBtn en pdf-buttons.tsx
- Resultado: `npm run build` compila 48 rutas, lint 0 errores (antes 25), typecheck limpio

## Security hardening (Codex audit 2026-04-15)
- CRITICAL resuelto: policies SELECT sobre pms_integrations/pos_integrations restringidas a admin+ (credentials ya no exfiltrables por PostgREST)
- HIGH #1 resuelto: notification-dispatcher exige Bearer == SUPABASE_SERVICE_ROLE_KEY + reconstruye email desde DB (no confía en payload) + safeUrl solo rutas internas
- HIGH #2 resuelto: trigger_pms_sync/trigger_pos_sync/get_integration_sync_logs exigen rol admin+; push_kitchen_orders exige direction+
- Defense in depth: whitelist de sync_type + validación config activa antes de encolar
- Bonus: search_path=public en 18 funciones SECURITY DEFINER de M15 + REVOKE EXECUTE a service_role en RPCs service-only

## Acciones manuales pendientes post-hardening
1. Rotar credenciales de las 5 integraciones de prueba (Mews/OPERA/Lightspeed/Simphony/etc) — pudieron haber sido leídas antes del fix
2. `npx supabase functions deploy notification-dispatcher --linked`
3. Añadir `APP_BASE_URL` en Supabase Dashboard → Edge Functions → Secrets
4. Verificar que el webhook DB de `notifications` manda `Authorization: Bearer <service_role>`

## Testing (estado 2026-04-15 — Fases A+B+C+E completadas)
Plan completo en `docs/TESTING_ROADMAP.md`.

**20 tests pasando** en 22.8s:
- 4 unit (`src/lib/utils.test.ts`) — 1.5s
- 16 E2E (3 smoke + 4 flujos + 9 RLS) — 21.3s

- ✅ **Fase A** — seed idempotente (`scripts/seed-test.ts`, `npm run db:seed`) — hotel test aislado `11111111-...` con 7 usuarios uno por rol, 2 clientes, 10 productos + stock, integraciones PMS/POS
- ✅ **Fase B parcial** — 4 E2E flujos críticos (evento draft→pending, PR, merma, label). Flujo 2 (producción) defer: requiere seed con menús+recetas
- ✅ **Fase C** — 9 tests RLS cierran los 3 audits Codex (credentials, sync auth, whitelist+config)
- ⏳ **Fase D** — Extract oportunista de funciones puras a `src/lib/domain/` (hacer a medida que refactorices)
- ✅ **Fase E** — CI GitHub Actions en `.github/workflows/ci.yml` (jobs: lint-typecheck, test-unit, build, test-e2e gated por `vars.E2E_ENABLED`)

**Pendiente manual en GitHub:** añadir secrets (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) + variable `E2E_ENABLED=true` + branch protection sobre `main`.

## Patrones establecidos
- RLS: `is_member_of(hotel_id)` para reads **metadata**, `get_member_role(hotel_id)` para writes **y para reads de columnas sensibles** (credentials, tokens, payloads operativos)
- RPCs: `check_membership()` al inicio; si toca operación sensible, pasar `array['superadmin','direction','admin']::public.app_role[]` como tercer argumento
- Triggers: `audit_trigger_fn()` en tablas clave, `set_updated_at()` para timestamps
- SECURITY DEFINER: SIEMPRE `set search_path = public` (hijacking mitigation)
- RPCs service-only (worker-invoked): `REVOKE EXECUTE ... FROM public, anon, authenticated` + `GRANT EXECUTE ... TO service_role`
- Edge Functions con service_role: SIEMPRE validar `Authorization` header antes de crear el cliente Supabase (patrón automation-worker)
- PDFs con @react-pdf/renderer: dynamic() SOLO sobre el botón completo (pdf-buttons.tsx), nunca sobre el documento o sobre la lib externa (rompe Turbopack SSR)
- Frontend: tipos con const arrays + labels, hooks TanStack Query, paginas con skeleton/empty/table
- Escandallo live: useEscandalloLive (refetchOnWindowFocus, 2min interval), useSyncEscandalloPrices
- Precios: GR price (ultimo albarán aceptado) > offer price (proveedor preferido) > manual

## Fase actual: Plan completado PRD en curso
MVP básico (D0+M1-M7) cerrado. Plan maestro aprobado (todo el PRD: MVP+F2+F3+F4).

**Progreso:** Sesión 12/~14 completada — Etapas 1.1 + 1.2 + 1.3 + 1.4 + 1.5 + 2.3 + 2.1 + 2.4 + 2.2 + 3.2 + 3.3 + 3.4 completas
**Plan maestro:** `C:\Users\Israel\.claude\plans\misty-petting-haven.md`
**Estado detallado + roadmap sesiones:** `docs/ESTADO_PLAN_COMPLETADO.md`

### Próximas etapas pendientes (piezas del MVP según PRD que aún faltan):
1. ~~**Etapa 1.1** — M3 extendido~~ ✅
2. ~~**Etapa 1.2** — M5 reservations FIFO + stock_counts (conteo ciego) + forensics + calculate_real_cost~~ ✅
3. ~~**Etapa 1.3** — M6 workflows + mise_en_place + KDS + generate_shopping_list + plantillas repetitivas~~ ✅
4. ~~**Etapa 1.4** — M1 BEO PDF + event_operational_impact + calculate_event_cost_estimate~~ ✅
5. ~~**Etapa 1.5** — M7 alerts + kpi_snapshots + food_cost_by_service/event + cost_variance~~ ✅

### Fase 2:
5. ~~M10 Documentos PDF (9 plantillas)~~ ✅
6. ~~M8 Automation (jobs queue + worker Edge Function)~~ ✅
7. ~~M14 Notificaciones (in-app Realtime + email Resend + preferencias)~~ ✅
8. ~~M9 Compliance APPCC + etiquetado QR + trazabilidad~~ ✅

### Fase 3:
9. ~~M12 Integraciones PMS/POS (Mews, OPERA, Lightspeed, Simphony)~~ ✅ (00025)
10. ~~M13 RRHH y turnos~~ ✅ (00026)
11. ~~M15 Agentes autónomos (5 automejora + 5 coordinación evento)~~ ✅ (00027)
12. M11 Analytics + ML/Forecast

### Fase 4:
13. M16 Marketplace (esqueleto)

## Arquitectura del escandallo (aclaración)
El coste de receta se alimenta de PRODUCTOS + PROVEEDORES (supplier_offers.is_preferred) + último GR (goods_receipts), snapshot en recipe_ingredients.unit_cost. **NO toca inventario** para calcular coste teórico. El inventario solo se usa para `calculate_real_cost` post-consumo real (Etapa 1.2).
