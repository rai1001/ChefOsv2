# ChefOS v2

> Control operativo de cocina multi-servicio para hoteles, catering y eventos

## Design System

**Orden de lectura obligatorio al tocar UI:**
1. Abre **[`/design-system`](src/app/design-system/page.tsx)** en dev (`npm run dev` → `localhost:3000/design-system`) — referencia viva con todos los patrones.
2. Consulta **[DESIGN.md](DESIGN.md)** para la spec completa (tokens, tipografía, reglas).
3. Consulta **[docs/DESIGN_COOKBOOK.md](docs/DESIGN_COOKBOOK.md)** para recetas copy-paste (añadir pantalla, enum de estado, KPI, modal, purga light-mode).
4. Consulta **[docs/DESIGN_MIGRATION.md](docs/DESIGN_MIGRATION.md)** para estado del rollout y decisiones.

Resumen de decisiones clave (ver DESIGN.md para especificación completa):
- Fuentes: Syne (display) · DM Sans (body) · DM Mono (datos/números) · JetBrains Mono (badges/IDs)
- Tamaño base: **17.6px** (110%)
- Accent único: `#e8e4dc` (Tungsten White) — SOLO CTA primario y nav activo. Nada más.
- Alertas: `#c0392b` urgente · `#b87333` warning (cobre) · `#5a7a5a` success
- Estado: left-border 3px de color — sin badges de fondo, sin columnas de estado aparte
- Dashboard: banda de mando (turno/servicio/bloqueadores) encima de KPIs
- Radio: 8px cards/botones · 4px tablas/inputs · 10px modales
- Sin gradientes · sin glassmorphism · sin sombras llamativas · sin emojis

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
- Hotel test: `ec079cf6-13b1-4be5-9e6f-62c8f604cb1e` (seed-test, 7 roles)
- Hotel demo Eurostars: `22222222-2222-2222-2222-222222222222` (seed-eurostars-demo, 30 productos Galicia, 6 recetas, 4 eventos)
- Migraciones: 00001-00051 (D0 + M1-M15 + security audits + OCR + idempotency + rate limits)
- Ejecutar migración individual: `cat file.sql | npx supabase db query --linked`
- Deploy edge function: `npx supabase functions deploy <name> --project-ref dbtrgnyfmzqsrcoadcrs --no-verify-jwt`

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
| 00030 | security_audit_fixes | Auditorías Antigraviti+Codex round 3: IDOR create_hotel (tenant check + current_user bypass); check_membership(uuid) overload para HR; enqueue_job bloquea sync_pms/sync_pos/run_agent; triggers events+recipes protegen state-machine de UPDATE directo; drop agent_suggestions_update policy; approve_suggestion whitelist enqueue+fix contrato sync_recipe_costs (product_id→recipe expansion); página /reset-password |
| 00031 | fix_m9_rpcs | Fix check_membership calls en RPCs de M9 compliance (renombrado desde 00023_fix_rpcs — colisión resuelta) |
| 00032 | fix_m12_sync_logs | Fix policies insert/update en integration_sync_logs: solo via SECURITY DEFINER RPCs (renombrado desde 00026_m12_security_fixes — colisión resuelta) |
| 00033 | fix_notifications_rls | Codex audit round 4: añade is_member_of(hotel_id) a notif_read_own, notif_update_own, prefs_own — tenant isolation en notifications |
| 00034 | security_audit_round4 | Codex adversarial round 4: IDOR create_hotel, current_user bypass, triggers state-machine guards, /reset-password, 11 fixes |
| 00035 | fix_beo_missing_columns | get_event_beo referenciaba columns inexistentes: añade recipes.unit_cost, recipes.yield_pct, menu_sections.course_type, event_spaces.setup_style |
| 00036 | head_chef_procurement | generate_purchase_order + transition_purchase_order añaden 'head_chef' a roles (hoteles pequeños donde el chef compra) |
| 00037 | fix_workflow_ingredient_name | generate_event_workflow: `ri.name` → `ri.ingredient_name` |
| 00038 | fix_inventory_catalog_columns | get_stock_levels + get_catalog_prices: `u.symbol` → `u.abbreviation`, remove filtro inexistente is_active |
| 00039 | ocr_infrastructure | Extensiones pg_trgm + unaccent, enum ocr_review_status, columnas OCR en goods_receipt_lines, tabla price_change_log con delta_pct, job_type ocr_receipt, order_line_id nullable |
| 00040 | ocr_rpcs | match_product_by_alias (ranking por similarity) + process_ocr_receipt (JSON Claude → GR lines + price_change_log) + _recalc_recipes_using_product + trigger cascada |
| 00041 | fix_auto_stock_lot_for_ocr | Skip auto_create_stock_lot si quality_status<>accepted OR order_line_id null (OCR pending review no crean lotes hasta resolución) |
| 00042 | rate_limit_infrastructure | rate_limit_buckets tabla + consume_rate_limit(key, max, window) RPC atomic con FOR UPDATE + get_rate_limit_status |
| 00043 | idempotency_infrastructure | idempotency_keys tabla (hotel_id, key) → response_body + status + TTL 24h + check_idempotency / store_idempotency / cleanup_idempotency_keys |
| 00044 | ocr_idempotency | goods_receipts.delivery_note_image_hash + unique index parcial (order_id, hash) + process_ocr_receipt acepta p_image_hash (dedup DB-side antes de insertar) |
| 00045 | po_idempotency | generate_purchase_order con SELECT FOR UPDATE en PRs (serializa concurrentes) + error P0016 si ya consolidated (defense vs doble-click) |
| 00046 | domain_events_dedup | emit_event con p_dedup_window_seconds (default 5s) + index idx_domain_events_dedup: triggers que disparen 2x no duplican eventos/notificaciones |
| 00047 | fix_emit_event_grant | Codex sesión 18: 00046 recreó emit_event (6 params) y regrantó authenticated (revertía 00034 FIX 2). REVOKE public/anon/authenticated + GRANT service_role |
| 00048 | fix_add_kitchen_order_item | Codex sesión 18: UPDATE kitchen_orders por p_order_id sin hotel_id scope → cross-tenant. AND hotel_id = p_hotel_id + search_path |
| 00049 | fix_internal_rpcs_grants | Codex sesión 18: consume_rate_limit/get_rate_limit_status/check_idempotency/store_idempotency eran authenticated. REVOKE → solo service_role (edge functions) |
| 00050 | fix_event_client_hotel_scope | Codex sesión 18: create_event/update_event aceptaban client_id arbitrario; get_events_calendar leak cross-tenant client name. Validación client.hotel_id = event.hotel_id |
| 00051 | security_rpc_tenant_scope | Codex sesión 18: seed_default_categories exige check_membership admin+; get_production_summary scope events.hotel_id en join; receive_goods valida order_line_id.order_id = p_order_id (pre-loop + UPDATE) |

## Estado actual (2026-04-17 — Sesión 16: OCR end-to-end + demo Eurostars + a11y WCAG AA + idempotencia + rate limits)
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

## Bugs cerrados (/qa 2026-04-17)
- ISSUE-001 (HIGH): `/procurement/ocr-review` sin link en sidebar — añadido 'Revisar OCR' icon ScanLine en perfiles cocina/oficina/compras
- ISSUE-002 (LOW): emoji ⚠️ en orders/[id]:310 viola DS — eliminado, `text-warning` ya transmite urgencia
- Health score: 97 → 100 (sobre lo accionable)

## Accesibilidad WCAG 2.1 AA (/design:accessibility-review 2026-04-17)
9 de 10 issues del audit arreglados + 1 UX bonus (alert-box vs status-rail):
- **1.4.3 contraste** — `text-muted #6a6a6a → #949494` (2.70:1 → 4.78:1). Nuevos tokens `*-fg` para estados: `#e88070` danger, `#8baf8b` success, `#d4a574` warning, `#8ba6b8` info (todos >5:1 sobre bg-card)
- **1.4.4 resize text** — `html { font-size: 110% }` + `body { 1rem }` (escala con Ctrl+/- del navegador, antes hard-coded 17.6px)
- **2.4.1 skip link** — "Saltar al contenido" en app-shell.tsx (`sr-only focus:not-sr-only`) → `<main id="main-content">`
- **2.4.2 page titled** — hook `useDocumentTitle(page)` + root template `%s — ChefOS`. Aplicado en dashboard, escandallos, recetas, procurement, ocr-review, alerts, agents
- **2.4.6 headings** — dashboard de 0 h2 → 12 h2 (CommandBand + KpiCard + OperationalFeed) manteniendo clase `.kpi-label`
- **3.3.2 labels** — `/escandallos` simulador: 9 inputs envueltos en `<label>` (asociación implícita) + aria-label en buscador
- **4.1.2 name/role/value** — botón "Cerrar sesión" con `aria-label` (antes solo `title`)
- **UX bonus** — alertas unificadas a `.alert-box` (bg entera tintada) en `/alerts`, `/agents`, dashboard feed. Rows `<tr>` urgent/warning tintan desde CSS global. Reporte completo: `.gstack/qa-reports/a11y-audit-2026-04-17.md`
- Deferred: ISSUE-5 (border contrast) — rompe estética del DS, revisable si se audita borders de inputs

## OCR de albaranes (2026-04-16 + hardening 2026-04-17)
Feature estrella: foto de albarán → Claude Sonnet 4.5 Vision → matching por alias → GR lines + cascada de escandallos.

- **Edge function** `supabase/functions/ocr-receipt` — prompt ES específico, parse JSON, backoff exponencial (429+5xx, 3 retries, jitter), rate limit dual (30 req/h/hotel + 5 req/min/user vía `consume_rate_limit`), idempotencia DB-side vía SHA-256 hash pre-upload
- **Frontend** `useUploadDeliveryNote` — `crypto.subtle.digest('SHA-256')` antes de upload, hash en path (upsert:true no duplica), banner "Este albarán ya estaba procesado" si dedup
- **UI review** `/procurement/ocr-review` — agrega líneas pending_review + product_unknown del hotel, con confidence y sugerencias del matcher
- **Cascada precios** — OCR detecta cambio >5% vs PO line → inserta `price_change_log` → trigger `trg_price_change_cascade` recalcula `recipe_ingredients.unit_cost` + `recipes.total_cost/cost_per_serving/food_cost_pct` para TODA receta que usa el producto
- **Storage bucket** `delivery-notes` (privado, 10MB) — path convention `{hotel_id}/{order_id}-{hash16}.{ext}`
- **Validado end-to-end** vía CURL 2026-04-16: Pulpo 18→22€ → Pulpo á feira €36.51/€4.56 → €43.51/€5.44

## Idempotencia + Rate limits (Sesión 16, 2026-04-17)
Críticos aplicados antes del primer cliente. Memoria: `pattern_idempotency_pending.md` + `pattern_rate_limits_pending.md` (actualizadas a ✅).

- **00042** rate_limit_buckets — token bucket atómico (FOR UPDATE) con ventana configurable. `consume_rate_limit(key, max, window_s)` devuelve `(allowed, remaining, reset_at)`. Fail-open si la BD cae.
- **00043** idempotency_keys — cache (hotel_id, key) → response_body JSONB + TTL 24h + cleanup_idempotency_keys() para cron
- **00044** OCR idempotency — hash SHA-256 browser-side → `goods_receipts.delivery_note_image_hash` + unique (order_id, hash) + early check en process_ocr_receipt (sin cargo Anthropic si duplicado)
- **00045** PO idempotency — SELECT FOR UPDATE en PRs de generate_purchase_order + validación 'no consolidated' errcode P0016 (defense vs doble-click)
- **00046** domain_events dedup — `emit_event` ventana 5s por (hotel, agg_type, agg_id, event_type) + index dedicado → triggers disparados 2x no duplican eventos/notifs/jobs
- **Edge function OCR** — Anthropic backoff respeta `Retry-After` si viene o exponencial 2^n*1000ms + jitter<500ms, cap 30s. Headers X-RateLimit-Limit/Remaining/Reset-Hotel + Retry-After en 429.

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
- **Tokens de estado** (sesión 16): tokens base `--color-{success|warning|danger|info}` son para bg-/border-tintados; tokens `*-fg` (#8baf8b, #d4a574, #e88070, #8ba6b8) son foregrounds claros que pasan WCAG AA 4.5:1 sobre bg-card. `.text-*` classes override Tailwind auto-generated con los FG.
- **alert-box vs status-rail** (sesión 16): `.alert-box` (bg entera tintada + alert-title FG) para mensajes que requieren atención (alertas, sugerencias, feed operativo); `.status-rail` (solo border-left 3px) para estado de trabajo o rows de tabla con semáforo. Rows `<tr>` urgent/warning tintan automáticamente vía CSS global (`tbody tr.status-rail.urgent { background: var(--urgent-bg) }`).
- **Metadata título en client components** (sesión 16): las pages `'use client'` no pueden exportar `metadata`. Usar hook `useDocumentTitle('Dashboard')` de `@/lib/use-document-title`. Root layout tiene `title: { template: '%s — ChefOS', default: '...' }` — server components lo componen automático.
- **Skip link** (sesión 16): `<a href="#main-content" class="sr-only focus:not-sr-only...">` como primer focusable en app-shell.tsx. `<main id="main-content">` como destino. WCAG 2.4.1 Bypass Blocks.
- **OCR idempotency** (sesión 16): cliente calcula `crypto.subtle.digest('SHA-256')` del File antes de upload → path incluye `hash.slice(0,16)` + `upsert:true`. Edge function hace early check vía `goods_receipts.delivery_note_image_hash` → devuelve `already_processed:true` sin llamar a Claude. Ahorra coste Anthropic + dedup a nivel DB.
- **Rate limit wrapper**: cualquier edge function sensible llama `consume_rate_limit('feature:scope:id:window', max, window_s)` al inicio. Fail-open si la BD cae. Devuelve headers `X-RateLimit-*` + `Retry-After` en 429.
- **Anthropic backoff**: `callAnthropicWithBackoff(url, init, retries=3)` respeta `Retry-After` si viene, si no exponencial `2^n * 1000ms + jitter<500ms` cap 30s. Solo reintenta 429 + 5xx; 4xx sale directo.

## Fase actual: MVP + OCR + a11y + hardening completado — pre-demo Eurostars
MVP básico (D0+M1-M7) cerrado. Plan maestro ejecutado (PRD + OCR + hardening pre-cliente).

**Progreso:** Sesiones 1-16 completadas. Feature OCR end-to-end deployed. App accesible WCAG 2.1 AA (9/10 issues). Idempotencia + rate limits aplicados. Hotel demo Eurostars sembrado. Playbook demo Iago listo (`docs/DEMO_IAGO_PLAYBOOK.md`).
**Plan maestro:** `C:\Users\Israel\.claude\plans\misty-petting-haven.md`
**Estado detallado + roadmap sesiones:** `docs/ESTADO_PLAN_COMPLETADO.md`
**Deploy producción:** https://chefos-v2.vercel.app

**Próxima milestone:** Demo Iago (Eurostars Ourense) sábado 19 abril 2026.

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
