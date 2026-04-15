# Estado del Plan de Completado ChefOS v2

> **Última sesión:** 2026-04-15 (Israel + Claude)
> **Plan maestro:** `C:\Users\Israel\.claude\plans\misty-petting-haven.md`
> **Alcance aprobado:** TODO el PRD (MVP + Fase 2 + Fase 3 + Fase 4) con OCR + PDF

---

## Arquitectura del coste de receta (aclaración importante)

**El escandallo se alimenta de PRODUCTOS + PROVEEDORES, NO de inventario.** Verificado.

Flujo de precios ya implementado:

| Concepto | Fuente de precio | RPC |
|---|---|---|
| **Coste teórico de receta** (escandallo) | `supplier_offers.is_preferred` → `recipe_ingredients.unit_cost` (snapshot) | `calculate_recipe_cost`, `sync_escandallo_prices` |
| **Precio actual del producto** (simulador) | Último `goods_receipts` real → fallback a `supplier_offers` | `get_catalog_prices` (00014) |
| **Coste real de evento** (post-servicio) | `stock_movements` con `unit_cost` del lote consumido | `calculate_real_cost` (pendiente, etapa 1.2) |

**El inventario (stock_lots) solo se toca cuando hay consumo REAL**, no para calcular escandallos. Israel lo confirmó en sesión.

---

## Sesión 1 — Completada (2026-04-14)

### Etapa 1.1 — M3 extendido ✅

**Migración creada:** `supabase/migrations/00015_m3_extended.sql` (renumerada para evitar colisión con 00013_escandallo_live y 00014_catalog_prices)

**Tablas nuevas:**
- `supplier_configs` — días entrega, hora corte, lead time, pedido mínimo, ventana recepción, entrega urgente
- `supplier_incidents` — tipo (delay/quality/quantity/wrong_product/no_delivery/other), severidad, PO asociada
- `price_history` — auto-poblado vía trigger `log_offer_price_change` en UPDATE/INSERT de `supplier_offers.unit_price`
- `product_supplier_refs` — código proveedor + factor de conversión por producto/proveedor

**RPCs nuevos:**
- `record_supplier_incident` — emite domain event `proveedor.incidencia_created`
- `get_supplier_metrics` — tasa de completado, incidencias 30d, críticas 30d
- `get_price_trend` — histórico de cambios de precio por producto
- `match_product_by_supplier_code` — para OCR albarán futuro

**Frontend:**
- `src/features/catalog/types/index.ts` — tipos `SupplierConfig`, `SupplierIncident`, `PriceHistoryEntry`, `ProductSupplierRef`, `SupplierMetrics` + enums `IncidentType`, `IncidentSeverity` + labels
- `src/features/catalog/hooks/use-supplier-extended.ts` — 9 hooks TanStack Query
- `src/app/(dashboard)/catalog/suppliers/[id]/page.tsx` — refactor con **5 tabs**: Info / Ofertas / Configuración / Incidencias / Métricas
- `src/components/shell/sidebar-config.ts` — añadido grupo **CATÁLOGO** (Productos + Proveedores) al perfil `oficina`

**Verificación:**
- `npm run typecheck` — ✅ limpio
- Sidebar verificado en preview (puerto 3003) — Productos y Proveedores visibles bajo CATÁLOGO

**PENDIENTE (bloqueador para probar UI):**
- ⚠️ **Aplicar migración 00015 a Supabase cloud**:
  ```bash
  cat supabase/migrations/00015_m3_extended.sql | npx supabase db query --linked
  ```
  Hasta aplicarla, los tabs Config/Incidencias/Métricas fallarán con "relation does not exist".

---

## Sesión 2 — Completada (2026-04-14)

### Etapa 1.2 — M5 avanzado ✅

**Migración 00015 aplicada a Supabase cloud** (pendiente desde sesión 1) ✅

**Migración creada y aplicada:** `supabase/migrations/00016_m5_reservations_counts.sql`

**Enums nuevos:**
- `reservation_status` (pending/partial/consumed/released)
- `count_status` (open/in_progress/review/closed)
- `count_type` (full/partial/blind)
- `expiry_treatment` (fresh/cooked/frozen/preserved/chilled/other)

**Columnas añadidas a `events`:** `actual_cost`, `theoretical_cost`

**Tablas nuevas:**
- `stock_reservations` — reservas FIFO por lote/evento, con shortfall flag
- `expiry_rules` — reglas de caducidad por tratamiento/producto
- `stock_counts` — sesiones de conteo (full/partial/blind)
- `stock_count_lines` — una línea por producto/lote, con `variance_qty` computed

**RPCs:**
- `reserve_stock_for_event` — FIFO desde event_menus→recetas→ingredientes, crea shortfalls
- `consume_reservation` — decrementa lote + movimiento de consumo
- `release_reservation` — libera reserva sin consumo
- `calculate_real_cost` — SUM(qty_consumed×unit_cost) desde reservas, actualiza events.actual_cost
- `get_event_reservations` — lista reservas de un evento con detalle producto/lote
- `start_stock_count` — crea sesión + puebla líneas desde stock_lots
- `submit_stock_count_line` — registra cantidad contada en línea
- `review_stock_count` — aplica ajustes y cierra el conteo
- `get_stock_forensics` — analiza merma sistemática por producto (received/consumed/waste/unexplained)
- Trigger `auto_calculate_event_cost_trg` — calcula coste real al completar evento

**Frontend:**
- `src/features/inventory/types/index.ts` — tipos M5 avanzado: `StockReservation`, `StockCount`, `StockCountLine`, `ExpiryRule`, `StockForensics` + enums + labels
- `src/features/inventory/hooks/use-reservations.ts` — 5 hooks (useEventReservations, useReserveStockForEvent, useConsumeReservation, useReleaseReservation, useCalculateRealCost)
- `src/features/inventory/hooks/use-stock-counts.ts` — 7 hooks (useStockCounts, useStockCount, useStockCountLines, useStartStockCount, useSubmitStockCountLine, useReviewStockCount, useStockForensics)
- `src/app/(dashboard)/inventory/counts/page.tsx` — lista de conteos + formulario nuevo conteo
- `src/app/(dashboard)/inventory/counts/[id]/page.tsx` — detalle con líneas, modo blind, aplicar ajustes
- `src/app/(dashboard)/inventory/forensics/page.tsx` — selector producto + análisis forense con KPIs y alertas
- `src/components/shell/sidebar-config.ts` — Conteos + Forensics en sidebar (perfiles cocina y oficina)

**Verificación:**
- `npm run typecheck` — ✅ limpio (0 errores)
- Preview: /inventory/counts ✅, /inventory/forensics ✅, sidebar OK ✅, zero console errors ✅

---

## Sesión 3 — Completada (2026-04-14)

### Etapa 1.3 — M6 Workflows + KDS + Mise en place + Shopping list ✅

**Migración creada y aplicada:** `supabase/migrations/00017_m6_workflows_kds.sql`
- Fix aplicado: 'service' no es un `app_role` válido → reemplazado por 'operations'

**Enums nuevos:**
- `workflow_status` (draft/active/completed/cancelled)
- `task_status` (todo/in_progress/blocked/done/cancelled) — separado de `plan_item_status` existente
- `ko_status` (pending/acknowledged/in_progress/ready/delivered/cancelled)
- `ko_item_status` (pending/in_progress/ready/skipped)

**Tablas nuevas:**
- `workflows` — workflow por evento o plan, con state machine
- `workflow_tasks` — tareas con estado completo incluyendo 'blocked', depends_on_task_id (auto-ref)
- `mise_en_place_lists` — una lista por workflow + departamento
- `mise_en_place_items` — ítems checklist con quantity/unit/done_by/done_at
- `kitchen_orders` — comandas KDS por partida/estación, sequence_number auto por día
- `kitchen_order_items` — ítems de comanda con ciclo pending→in_progress→ready
- `recurring_task_templates` — plantillas por día de semana (byweekday jsonb 0=Lun..6=Dom)

**RPCs:**
- `generate_event_workflow` — crea workflow + tareas por receta/depto + mise_en_place_lists desde evento
- `generate_shopping_list` — CTE: ingredientes necesarios − stock disponible, agrupado por proveedor
- `assign_workflow_task`, `start_workflow_task`, `block_workflow_task`, `complete_workflow_task` — state machine
- `mark_mise_en_place_item` — toggle done/undone con done_by + done_at
- `create_kitchen_order` — comanda con sequence_number auto por día/estación
- `add_kitchen_order_item` — añade ítem y avanza comanda a 'acknowledged'
- `update_kitchen_order_item_status` — cicla estado ítem + auto-avanza comanda (all ready → ready)
- `generate_tasks_from_recurring_templates` — genera tareas del día según byweekday
- `get_workflow_detail` — JSONB completo: tareas by_department + progreso mise_en_place

**Frontend:**
- `src/features/production/types/index.ts` — tipos M6: Workflow, WorkflowTask, WorkflowDetail, MiseEnPlaceList/Item, KitchenOrder/Item, RecurringTaskTemplate, ShoppingListItem/Group + enums + labels/colors
- `src/features/production/hooks/use-workflows.ts` — 8 hooks (list, event, detail, tasks, generate, assign, start, block, complete, recurring)
- `src/features/production/hooks/use-mise-en-place.ts` — 3 hooks (lists, items, mark)
- `src/features/production/hooks/use-kitchen-orders.ts` — 4 hooks con refetchInterval:10s
- `src/features/production/hooks/use-shopping-list.ts` — 1 hook lazy (queryDate state)
- `src/app/(dashboard)/production/workflows/[id]/page.tsx` — detail con progress bar, DeptSection+TaskRow, block modal, MeP summary
- `src/app/(dashboard)/production/mise-en-place/page.tsx` — workflow selector, MepListCard acordeón, MepItemRow toggle
- `src/app/(dashboard)/production/kds/[station]/page.tsx` — OrderCard grid, item cycling on tap, inline add, polling 10s
- `src/app/(dashboard)/production/kanban/page.tsx` — 4 columnas, workflow selector, KanbanCard quick actions
- `src/app/(dashboard)/production/shopping-list/page.tsx` — date picker lazy, grupos por proveedor, qty+precio
- `src/components/shell/sidebar-config.ts` — grupo "Cocina operativa" en cocina (MeP, KDS, Kanban, Lista compras); Mise en place + Kanban + Lista compras en oficina Operaciones

**Verificación:**
- `npm run typecheck` — ✅ limpio (0 errores)

---

## Sesión 4 — Completada (2026-04-14)

### Etapa 1.4 — M1 BEO PDF + event_operational_impact ✅

**Migración creada y aplicada:** `supabase/migrations/00018_m1_beo.sql`
- Tabla: `event_operational_impact` — impacto por producto/departamento escalado a pax real
- RPCs: `generate_event_operational_impact`, `calculate_event_cost_estimate`, `get_event_beo` (JSONB completo)

**Frontend:**
- `src/features/commercial/types/index.ts` — EventBEO, OperationalImpactItem, BeoData + tipos extendidos
- `src/features/commercial/hooks/use-beo.ts` — useEventBEO, useGenerateOperationalImpact, useCalculateCostEstimate
- `src/features/commercial/components/beo-document.tsx` — PDF con header, menus, impacto operacional, coste
- `src/app/(dashboard)/events/[id]/page.tsx` — bloque BEO: coste estimado badge, impacto por depto, botón descargar BEO

**Verificación:** `npm run typecheck` ✅

---

## Sesión 5 — Completada (2026-04-14)

### Etapa 1.5 — M7 Alerts + KPI snapshots ✅

**Migración creada y aplicada:** `supabase/migrations/00019_m7_alerts_kpis.sql`
- Enums: `alert_type` (stock_low/expiry_soon/waste_spike/food_cost_high/event_unplanned/task_overdue), `alert_severity` (info/warning/critical)
- Tablas: `alerts`, `kpi_snapshots`
- RPCs: `generate_daily_snapshot`, `dismiss_alert`, `get_active_alerts`, `get_food_cost_by_event`, `get_food_cost_by_service`, `get_cost_variance_report`

**Frontend:**
- `src/features/reporting/types/` — tipos Alert, KpiSnapshot, FoodCostByEvent/Service, CostVarianceReport
- `src/features/reporting/hooks/use-alerts.ts` — useActiveAlerts, useDismissAlert
- `src/features/reporting/hooks/use-kpis.ts` — useFoodCostByEvent, useFoodCostByService, useCostVarianceReport
- `src/app/(dashboard)/alerts/page.tsx` — lista de alertas activas con dismiss, badges por severidad
- `src/app/(dashboard)/reports/page.tsx` — food cost por evento + por servicio + varianza
- `src/components/shell/sidebar-config.ts` — Alertas en sidebar (oficina + compras)

**Verificación:** `npm run typecheck` ✅

---

## Sesión 6 — Completada (2026-04-14)

### Etapa 2.3 — M10 Documentos PDF (9 plantillas) ✅

**Sin migración** — M10 es módulo de rendering puro. Consume datos de M1/M2/M5/M6/M7.

**Tipos:**
- `src/features/documents/types/index.ts` — TechSheetData, ShoppingListDocData, KitchenBriefingData, WasteReportData, FoodCostReportData, LabelData, APPCCBlankData

**Documentos PDF creados** (todos en `src/features/documents/components/`):
- `tech-sheet-document.tsx` — Ficha técnica: header, info grid, alérgenos, tabla ingredientes 7 cols, pasos, coste
- `production-sheet-document.tsx` — Hoja de producción: workflow detail, tareas por depto, progreso
- `shopping-list-document.tsx` — Lista compras: por proveedor, qty_needed/available/to_order, coste estimado
- `kitchen-briefing-document.tsx` — Briefing diario: stats overview, eventos hoy, producción, alertas
- `waste-report-document.tsx` — Informe mermas: tabla producto/qty/incidencias/valor estimado
- `food-cost-document.tsx` — Informe food cost (landscape A4): por evento + por tipo servicio
- `product-label-document.tsx` — Etiquetas lote 2×col: alérgenos, caducidad, trazabilidad (M9 pendiente)
- `appcc-blank-document.tsx` — Plantilla APPCC imprimible: 4 secciones, firmas, referencia normativa UE
- `beo-document.tsx` — BEO ya existía desde Etapa 1.4

**Hooks de datos creados** (en `src/features/documents/hooks/`):
- `use-tech-sheet.ts` — recipe + ingredients + steps + hotel en Promise.all
- `use-waste-report.ts` — inventory_movements waste, agrupado por producto

**Botones PDF centralizados** (`src/features/documents/components/pdf-buttons.tsx`):
- Módulo 'use client' que importa ESTÁTICAMENTE PDFDownloadLink + todos los documentos
- Se importa con `dynamic(() => ..., { ssr: false })` desde las páginas
- Patrón crítico: evita el crash "su is not a function" de react-pdf reconciler cuando el documento llega como LoadableComponent

**Página hub:**
- `src/app/(dashboard)/documents/page.tsx` — 7 cards: TechSheet (selector receta), ShoppingList (date picker lazy), Briefing (datos dashboard), Waste (rango fechas), FoodCost (rango fechas), APPCC (date picker), Labels (placeholder M9)
- Nota contextual: BEO → evento, hoja producción → workflow

**Integración en páginas existentes:**
- `src/app/(dashboard)/production/workflows/[id]/page.tsx` — botón "Descargar hoja" en header
- `src/app/(dashboard)/production/shopping-list/page.tsx` — botón PDF inline junto a "Generar lista"
- `src/components/shell/sidebar-config.ts` — "Documentos PDF" en sidebar cocina + "Documentos" en Análisis de oficina

**Bug crítico resuelto:**
- Error "su is not a function" en react-pdf reconciler cuando `PDFDownloadLink` recibe un `LoadableComponent` (Next.js `dynamic()`) en vez de un elemento `Document` real
- Causa: `useDashboard()` sirve datos desde caché TanStack Query (0ms latencia) → componente renderiza antes de que el `dynamic()` individual del documento resuelva
- Fix: `pdf-buttons.tsx` importa estáticamente todo junto. El `dynamic()` envuelve el botón completo, no el documento aislado

**Verificación:** `npm run typecheck` ✅ (0 errores)

---

## Sesión 7 — Completada (2026-04-14)

### Etapa 2.1 — M8 Automation ✅

**Migración creada y aplicada:** `supabase/migrations/00021_m8_automation.sql`

**Enums nuevos:**
- `job_type` (generate_workflow / generate_shopping_list / send_notification / generate_snapshot / reserve_stock / calculate_cost / export_pdf)
- `job_status` (pending / running / completed / failed / cancelled)
- `log_level` (info / warning / error)

**Tablas nuevas:**
- `automation_jobs` — cola de jobs con payload JSONB, intentos, backoff, scheduled_at/started_at/completed_at
- `automation_job_logs` — log de ejecución por job con nivel y mensaje
- `automation_triggers` — reglas de trigger automático (placeholder para M14)

**RPCs:**
- `enqueue_job` — inserta job en cola, emite domain event `automation.job_enqueued`
- `claim_next_job` — worker reclama job con FOR UPDATE SKIP LOCKED (SECURITY DEFINER, no requiere auth.uid)
- `complete_job` — worker marca job completado, emite `automation.job_completed`
- `fail_job` — worker marca fallido con backoff exponencial (5^attempt minutos), emite `automation.job_failed`
- `cancel_job` — usuario cancela job pendiente
- `get_pending_jobs` — lista para frontend (últimos 50, check_membership)
- `get_job_logs` — logs de un job específico

**Edge Function desplegada:** `supabase/functions/automation-worker/index.ts`
- Deno runtime, MAX_CONCURRENT = 3, timeout 30s por job
- Procesa: generate_workflow, generate_shopping_list, generate_snapshot, reserve_stock, calculate_cost
- Backoff exponencial en fail_job
- Deploy: `npx supabase functions deploy automation-worker --project-ref dbtrgnyfmzqsrcoadcrs`

**Frontend:**
- `src/features/automation/types/index.ts` — JobType, JobStatus, LogLevel, labels, colores, interfaces
- `src/features/automation/hooks/use-automation.ts` — useJobs (refetch 10s), useJobLogs, useEnqueueJob, useCancelJob
- `src/app/(dashboard)/automation/page.tsx` — KPI bar + tabla de jobs con logs expandibles, cancel pendientes
- `src/app/(dashboard)/events/[id]/page.tsx` — bloque "Automatización" con botones "Generar workflow" y "Reservar stock FIFO"
- `src/components/shell/sidebar-config.ts` — "Automatización" en grupo Admin de oficina (icono Zap)
- `tsconfig.json` — supabase/functions excluido de compilación TS

**Verificación:** `npm run typecheck` ✅ (0 errores) · Preview ✅ (página + evento)

---

## Sesión 8 — Completada (2026-04-14)

### Etapa 2.4 — M14 Notificaciones ✅

**Migración creada y aplicada:** `supabase/migrations/00022_m14_notifications.sql`

**Enum nuevo:**
- `notification_type` (event_confirmed / event_completed / task_assigned / stock_alert / job_completed / job_failed / cost_alert / system)

**Tablas nuevas:**
- `notifications` — por usuario, con severity (reusa alert_severity), title, body, action_url, is_read, read_at
- `notification_preferences` — preferencias per tipo: in_app (default true), email (default false); unique(user_id, hotel_id, notification_type)

**RPCs:**
- `create_notification` — SECURITY DEFINER, sin auth check (llamado desde trigger y workers); respeta preferencia in_app
- `mark_notification_read` — marca leída por usuario actual
- `mark_all_notifications_read` — marca todas leídas, devuelve count
- `get_unread_notifications` — últimas N del usuario (todas: leídas y no leídas)
- `get_notification_count` — badge (no leídas)
- `get_notification_preferences` — devuelve defaults para tipos sin fila explícita (LEFT JOIN con enum_range)
- `upsert_notification_preference` — UPSERT, optimistic update en frontend

**Trigger automático:** `trg_auto_notify` en `domain_events` AFTER INSERT
- `automation.job_completed` → notifica al creador del job
- `automation.job_failed` → notifica al creador + admins/direction del hotel
- `event.confirmed` → notifica a superadmin/direction/admin/head_chef
- `event.completed` → notifica a superadmin/direction/admin

**Edge Function desplegada:** `notification-dispatcher`
- Webhook POST desde tabla `notifications` (INSERT)
- Comprueba preferencia email del usuario y lo envía via Resend API
- Requiere configuración: RESEND_API_KEY en Supabase secrets + Database Webhook apuntando a la función

**Feature identity actualizada:**
- `src/features/identity/hooks/use-auth.ts` — añadido `useCurrentUser()` (expone User de supabase.auth)

**Frontend:**
- `src/features/notifications/types/index.ts` — tipos, labels, colores severidad/tipo
- `src/features/notifications/hooks/use-notifications.ts` — useNotificationCount, useNotifications, useMarkRead, useMarkAllRead, **useNotificationRealtime** (Supabase Realtime subscription por user_id)
- `src/features/notifications/hooks/use-notification-preferences.ts` — useNotificationPreferences, useUpsertNotificationPreference (optimistic update)
- `src/components/shell/notification-bell.tsx` — Bell con badge rojo, dropdown (lista notificaciones, mark-all, link settings), dot pulsante por severidad, click outside para cerrar
- `src/components/shell/topbar.tsx` — reemplazado placeholder por `<NotificationBell>`
- `src/app/(dashboard)/settings/notifications/page.tsx` — tabla 8 tipos × 2 canales, toggles con guardado automático

**NOTA para activar Realtime:**
Supabase Dashboard → Database → Replication → Source tables → añadir `notifications`

**Verificación:** `npm run typecheck` ✅ (0 errores) · Preview ✅ (bell, dropdown "Sin notificaciones", preferencias con 8 tipos cargados)

---

## Sesión 9 — Completada (2026-04-14)

### Etapa 2.2 — M9 Compliance APPCC + Etiquetado + Trazabilidad ✅

**Migraciones aplicadas:**
- `supabase/migrations/00023_m9_compliance.sql` — tablas + RPCs (enums+tablas+seeds)
- `supabase/migrations/00023_fix_rpcs.sql` — fix `check_membership(auth.uid(), p_hotel_id)`

**Enums nuevos:** `appcc_category`, `appcc_record_status`, `label_type`, `treatment_type`, `label_origin`

**Tablas nuevas:**
- `appcc_templates` — plantillas APPCC por categoría, punto de control, límite crítico, acción correctora
- `appcc_records` — registros diarios con upsert por (hotel, template, fecha)
- `temperature_logs` — registros de temperatura con rango permitido y flag `is_within_range`
- `labels` — etiquetas con barcode único, caducidad, trazabilidad lote/evento/tarea

**RPCs:** `create_appcc_record` (upsert+domain_event), `log_temperature` (alerta si fuera de rango), `create_label` (barcode CHF-UUID), `print_label`, `get_appcc_records`, `get_temperature_logs`, `get_labels`, `trace_lot` (JSONB completo), `seed_appcc_defaults`

**Seeds:** 20 plantillas APPCC estándar hostelería (4 recepción, 5 almacén, 4 preparación, 3 cocción, 2 enfriamiento, 2 servicio)

**Frontend:**
- `src/features/compliance/types/index.ts` — enums + labels + colores + interfaces
- `src/features/compliance/hooks/use-appcc.ts` — useAppccRecords, useCreateAppccRecord, useSeedAppccDefaults
- `src/features/compliance/hooks/use-temperatures.ts` — useTemperatureLogs, useLogTemperature
- `src/features/compliance/hooks/use-labels.ts` — useLabels, useCreateLabel, usePrintLabel, useTraceLot
- `src/app/(dashboard)/compliance/appcc/page.tsx` — checklist diario: filtros fecha+categoría, KPI bar, tabla 20 plantillas, modal registro con estados
- `src/app/(dashboard)/compliance/temperatures/page.tsx` — KPIs 24h, formulario log rápido, tabla con color-coding
- `src/app/(dashboard)/compliance/labels/page.tsx` — formulario crear etiqueta (tipo, tratamiento, caducidad con presets), tabla con expiryBadge
- `src/app/(dashboard)/compliance/trace/[lot_id]/page.tsx` — búsqueda por lot_id, chain completa: lote+movimientos+reservas+etiquetas
- `src/components/shell/sidebar-config.ts` — grupo COMPLIANCE en perfiles cocina (APPCC+Temperaturas+Etiquetado) y oficina (APPCC+Temperaturas+Etiquetado+Trazabilidad)

**Verificación:** `npm run typecheck` ✅ · Preview ✅ (20 plantillas en vivo, modal con estados, Temperaturas vacío OK, Etiquetado vacío OK)

---

## Sesión 10 — Completada (2026-04-15)

### Etapa 3.2 — M12 Integraciones PMS/POS ✅

**Migración creada y aplicada:** `supabase/migrations/00025_m12_integrations.sql`

**Enums nuevos:**
- `pms_type` (mews / opera_cloud / cloudbeds / protel)
- `pos_type` (lightspeed / simphony / square / revel)
- `integration_status` (draft / active / error / disabled)
- `sync_log_status` (running / success / partial / failed)
- `job_type` extendido con `sync_pms` y `sync_pos`

**Tablas nuevas:**
- `pms_integrations` — credenciales + config por tipo de PMS; unique (hotel_id, pms_type)
- `pos_integrations` — credenciales + config por tipo de POS; unique (hotel_id, pos_type)
- `integration_sync_logs` — audit trail inmutable con check: exactamente una FK (pms o pos) no-null

**RPCs:**
- `create_pms_integration` / `create_pos_integration` — crea integración + domain event
- `update_pms_integration` / `update_pos_integration` — actualiza nombre/credentials/config; si cambian credentials → reset status a 'draft'
- `disable_pms_integration` / `disable_pos_integration` — desactiva integración
- `trigger_pms_sync(hotel_id, integration_id, sync_type)` — crea log 'running' + encola job automation; devuelve log_id
- `trigger_pos_sync(hotel_id, integration_id, sync_type)` — ídem para POS
- `mark_sync_complete` — SECURITY DEFINER solo service_role; cierra log + actualiza estado integración
- `get_pms_integrations` / `get_pos_integrations` — sin credentials (nunca al frontend)
- `get_integration_sync_logs` — últimos N logs con filtros opcionales por integración

**Adaptadores TypeScript** (`src/features/integrations/adapters/`):
- `base.ts` — interfaces PmsAdapter, PosAdapter, OccupancyData, ReservationData, SalesData, ConnectionTestResult
- `mews.ts` — Mews Connector API v1 (api_token + property_id + environment)
- `opera-cloud.ts` — OPERA Cloud REST API v21.5+ (OAuth client_credentials)
- `lightspeed.ts` — Lightspeed Restaurant API v3 (access_token simplificado)
- `simphony.ts` — Oracle Simphony Cloud (auth + transaction services)

**Frontend:**
- `src/features/integrations/types/index.ts` — tipos, labels, colores, PMS/POS_CREDENTIAL_FIELDS (campos dinámicos)
- `src/features/integrations/hooks/use-integrations.ts` — 12 hooks TanStack Query
- `src/app/(dashboard)/settings/integrations/page.tsx` — lista PMS/POS en tabs + KPI bar + historial sync (polling 10s)
- `src/app/(dashboard)/settings/integrations/new/page.tsx` — wizard 4 pasos: categoría → tipo → credenciales → test
- `src/components/shell/sidebar-config.ts` — "Integraciones" en grupo Admin de oficina (icono Plug)

**automation-worker extendido:**
- Casos `sync_pms` y `sync_pos` con stubs demo (testConnection/fetchOccupancy/fetchSales/pushKitchenOrders)
- En producción, reemplazar stubs por llamadas reales a los adaptadores

**Seguridad:** credentials nunca se devuelven al frontend; `mark_sync_complete` restringido a service_role

**Verificación:** `npm run typecheck` ✅ (0 errores) · Migración aplicada ✅

---

## Sesión 11 — Completada (2026-04-15)

### Etapa 3.3 — M13 RRHH y Turnos ✅

**Migración creada y aplicada:** `supabase/migrations/00026_m13_hr.sql`

**Enums nuevos:**
- `personnel_role` (chef_ejecutivo / sous_chef / chef_partida / cocinero / ayudante / pastelero / sumiller / camarero / otro)
- `contract_type` (indefinido / temporal / formacion / autonomo / becario)
- `shift_type` (normal / refuerzo / evento)
- `schedule_origin` (regla / evento / ajuste)
- `schedule_status` (propuesto / confirmado / cancelado)

**Tablas nuevas:**
- `personnel` — personal operativo con rol, contrato, horas semanales, notas, activo flag
- `shift_definitions` — turnos reutilizables (nombre único por hotel, inicio, fin, tipo); unique (hotel_id, name)
- `schedule_rules` — reglas automáticas: rol + days_of_week (int[]) + turno + min_persons + prioridad; unique (hotel_id, personnel_role, shift_definition_id)
- `schedule_assignments` — asignaciones del cuadrante; unique (personnel_id, assignment_date, shift_definition_id)

**RPCs:**
- `create_personnel` / `update_personnel` — CRUD empleados con emit_event
- `create_shift_definition` / `update_shift_definition` — CRUD turnos
- `create_schedule_rule` / `update_schedule_rule` / `delete_schedule_rule` — CRUD reglas con toggle activo
- `generate_monthly_schedule` — itera cada día del mes, aplica reglas según days_of_week, asigna personal disponible por rol con ON CONFLICT DO NOTHING (idempotente)
- `update_assignment` — cicla estado (propuesto→confirmado→cancelado→propuesto)
- `delete_assignment` — elimina asignación individual
- `get_personnel` — lista con activos por defecto, JOIN shift_assignments count
- `get_shift_definitions` / `get_schedule_rules` / `get_schedule_assignments` — lecturas tipadas con JOINs

**Frontend:**
- `src/features/hr/types/index.ts` — tipos Personnel, ShiftDefinition, ScheduleRule, ScheduleAssignment + const arrays + labels + formatTime / shiftDurationHours
- `src/features/hr/hooks/use-hr.ts` — 15 hooks TanStack Query
- `src/app/(dashboard)/hr/personnel/page.tsx` — tabla empleados + modal create/edit (rol, contrato, horas, notas, toggle activo)
- `src/app/(dashboard)/hr/schedule/page.tsx` — 3 tabs:
  - **Cuadrante:** grid mensual sticky (personas × días), celda = turno abreviado coloreado (gris=propuesto, verde=confirmado, rojo=cancelado), clic cyclea estado, botón "Generar mes"
  - **Turnos:** tabla shift_definitions + modal create/edit + toggle activo
  - **Reglas:** tabla schedule_rules + modal create (selector días L/M/X/J/V/S/D) + toggle activo + delete
- Patrón Tailwind puro (sin shadcn/ui): `text-text-primary / border-border / bg-bg-card`, modales `fixed inset-0 bg-black/50 z-50`, errores por state local

**Sidebar:**
- Grupo "Personal" añadido en perfil `oficina`: Empleados (/hr/personnel) + Horarios (/hr/schedule)
- "Mi horario" añadido en perfil `cocina` (icono Calendar, link /hr/schedule)

**Verificación:** `npm run typecheck` ✅ (0 errores) · Migración aplicada a cloud ✅

---

---

## Sesión 12 — Completada (2026-04-15)

### Etapa 3.4 — M15 Agentes Autónomos ✅

**Patrón:** ASISTIDO, NO AUTÓNOMO — agentes analizan, sugieren; usuario confirma antes de ejecutar.

**Migración creada y aplicada:** `supabase/migrations/00027_m15_agents.sql`

**Enums nuevos:**
- `agent_type` (10 valores: price_watcher, waste_analyzer, stock_optimizer, recipe_cost_alert, compliance_reminder, event_planner, shopping_optimizer, kds_coordinator, post_event, forecast_prep)
- `suggestion_status` (pending/approved/rejected/applied/expired)
- `suggestion_action` (enqueue_job/sync_recipe_costs/create_notification/none)
- `job_type` extendido con `run_agent`

**Tablas nuevas:**
- `agent_configs` — configuración por hotel+agente (umbrales, is_active); unique(hotel_id, agent_type)
- `agent_suggestions` — sugerencias generadas; deduplicación 12h; expires_at; revisión con nota

**Helper interno:**
- `public._create_agent_suggestion` — SECURITY DEFINER, deduplicada (no crea duplicados en 12h para mismo hotel+agent+title+context)

**RPCs — Grupo A (automejora):**
- `run_price_watcher_agent(hotel_id)` — variación precio >threshold% en 7d vs avg 30d → sync_recipe_costs
- `run_waste_analyzer_agent(hotel_id)` — mermas >threshold€ por producto en 7d → none (informativo)
- `run_stock_optimizer_agent(hotel_id)` — stock < reservas en lookahead_days → enqueue_job generate_shopping_list
- `run_recipe_cost_alert_agent(hotel_id)` — recetas aprobadas con FC% > target → none (informativo)
- `run_compliance_reminder_agent(hotel_id)` — APPCC templates sin registro hoy → create_notification
- `run_all_automejora_agents(hotel_id)` — ejecuta los 5 de una vez, devuelve conteo por agente

**RPCs — Grupo B (coordinación evento):**
- `run_event_planner_agent(hotel_id, event_id)` — genera sugerencias: workflow + reserva stock + coste estimado
- `run_shopping_optimizer_agent(hotel_id)` — PRs sin PO agrupadas por proveedor (≥2 PRs)
- `run_kds_coordinator_agent(hotel_id, event_id)` — verifica kitchen_orders existentes para el evento
- `run_post_event_agent(hotel_id, event_id)` — coste real + snapshot KPI tras evento completado
- `run_forecast_prep_agent(hotel_id)` — snapshot KPI diario si no existe

**RPCs de gestión:**
- `get_agent_suggestions(hotel_id, status, limit)` — auto-expira pendientes vencidas antes de devolver
- `approve_suggestion(hotel_id, suggestion_id)` — ejecuta la acción (enqueue/sync/notify/none) + marca 'applied'
- `reject_suggestion(hotel_id, suggestion_id, note)` — marca 'rejected' con nota opcional
- `get_agent_configs(hotel_id)` — todos los agentes con defaults para tipos sin fila
- `upsert_agent_config(hotel_id, agent_type, is_active, config)` — UPSERT con ON CONFLICT

**Trigger extendido:**
- `auto_notify_on_domain_event` reemplazado: añade `event.confirmed` → encola run_agent(event_planner), `event.completed` → encola run_agent(post_event)

**automation-worker extendido:**
- Caso `run_agent` con dispatcher por `agent_type` — llama RPC correspondiente

**Frontend:**
- `src/features/agents/types/index.ts` — tipos, labels, colores, config fields por agente
- `src/features/agents/hooks/use-agents.ts` — useAgentSuggestions (polling 30s), useApproveSuggestion, useRejectSuggestion, useAgentConfigs, useUpsertAgentConfig, usePendingSuggestionsCount
- `src/app/(dashboard)/agents/page.tsx` — panel sugerencias: tabs pending/applied/rejected/expired, KPI bar, SuggestionCard con aprobar/rechazar+nota
- `src/app/(dashboard)/agents/config/page.tsx` — AgentRow con toggle+campos configurables+guardar
- `src/components/shell/sidebar-config.ts` — grupo "Agentes" en oficina (Sugerencias + Config agentes)

**Seeds:** 10 agent_configs con umbrales por defecto para hotel test (ec079cf6...)

**Verificación:** `npm run typecheck` ✅ (0 errores) · Migración aplicada a cloud ✅

---

## Roadmap de sesiones futuras

Cada sesión = 1 etapa (aprox 1–2h). Orden según plan maestro:

### Sesión 2 — Etapa 1.2 (M5 avanzado)
- Migración `00016_m5_reservations_counts.sql`
- Tablas: `stock_reservations`, `stock_counts`, `stock_count_lines`, `expiry_rules`
- RPCs: `reserve_stock_for_event` (FIFO), `consume_reservation`, `release_reservation`, `calculate_real_cost`, `start_stock_count`, `submit_stock_count_line`, `review_stock_count`, `get_stock_forensics`
- UI: `/inventory/counts`, `/inventory/forensics`, reservas en detalle evento

### ~~Sesión 3 — Etapa 1.3 (M6 workflows + KDS)~~ ✅ COMPLETADA

### Sesión 4 — Etapa 1.4 (M1 BEO + PDF) — EN PROGRESO
**Migración creada (NO aplicada):** `supabase/migrations/00018_m1_beo.sql`
- Tabla: `event_operational_impact` (hotel_id, event_id, product_id, product_name, quantity_needed, unit, department; unique event+product+dept)
- RLS: read para miembros, write para head_chef+
- RPC `generate_event_operational_impact` — DELETE + INSERT desde event_menus→recipes→ingredients escalados por pax
- RPC `calculate_event_cost_estimate` — SUM(unit_cost × qty × pax/servings), guarda en events.theoretical_cost
- RPC `get_event_beo` — JSONB completo: cabecera evento + cliente + hotel + menús anidados + impacto por departamento + espacios

**PENDIENTE para próxima sesión (continuar Etapa 1.4):**
1. Aplicar migración: `cat supabase/migrations/00018_m1_beo.sql | npx supabase db query --linked`
2. `npm install @react-pdf/renderer`
3. `src/features/commercial/types/index.ts` — añadir EventBEO, OperationalImpactItem, etc.
4. `src/features/commercial/hooks/use-beo.ts` — useEventBEO, useGenerateOperationalImpact, useCalculateCostEstimate
5. `src/features/commercial/pdf/beo-document.tsx` — ReactPDF Document (dynamic import con ssr:false)
6. `src/features/commercial/pdf/beo-download-button.tsx` — PDFDownloadLink wrapper
7. Expandir `src/app/(dashboard)/events/[id]/page.tsx`:
   - Bloque coste estimado (badge FC%)
   - Bloque impacto operacional (tabla por departamento, botón generar)
   - Botones: Descargar BEO, Generar workflow, Reservar stock
8. `npm run typecheck`

**Nota sobre ReactPDF en Next.js:**
- Usar `dynamic(() => import(...), { ssr: false })` para el PDFDownloadLink
- Fuentes: Helvetica base es suficiente para acentos del español básico; si falla usar Courier
- No crear API route — usar PDFDownloadLink client-side (más simple y fiable con App Router)

### Sesión 5 — Etapa 1.5 (M7 alerts + KPIs)
- Migración `00019_m7_alerts_kpis.sql`
- Tablas: `kpi_snapshots`, `alerts`, `alert_rules`
- RPCs: `generate_daily_snapshot`, `check_alert_thresholds`, `dismiss_alert`, `get_food_cost_by_service`, `get_food_cost_by_event`, `get_cost_variance_report`
- UI: `/alerts`, `/reports/food-cost-service`, `/reports/variance`

### Sesiones 6–9 — Fase 2
- 6: Etapa 2.3 M10 Documentos PDF (9 plantillas)
- 7: Etapa 2.1 M8 Automation (jobs queue + worker Edge Function)
- 8: Etapa 2.4 M14 Notificaciones (in-app Realtime + email Resend + push web)
- 9: Etapa 2.2 M9 Compliance APPCC + etiquetado QR + trazabilidad

### Sesiones 10–13 — Fase 3
- 10: ~~Etapa 3.2 M12 Integraciones PMS/POS (Mews, OPERA, Lightspeed, Simphony)~~ ✅
- 11: ~~Etapa 3.3 M13 RRHH y turnos~~ ✅ (00026 aplicada — personnel, shift_definitions, schedule_rules, schedule_assignments; /hr/personnel + /hr/schedule)
- 12: ~~Etapa 3.4 M15 Agentes autónomos (5 automejora + 5 coordinación evento)~~ ✅ (00027 aplicada)
- 13: Etapa 3.1 M11 Analytics + ML/Forecast (requiere 180d datos — dejar para último)

### Sesión 14 — Etapa 4
- M16 Marketplace (esqueleto de tablas, sin funcionalidad)

---

## Cómo retomar en siguiente sesión

1. Abrir Claude Code desde `C:\APLICACIONES\ChefOsv2`
2. Leer este archivo + `C:\Users\Israel\.claude\plans\misty-petting-haven.md`
3. Consultar la siguiente etapa marcada como `pending` en TODOs
4. Si Etapa 1.1 no está aplicada a Supabase, hacerlo primero:
   ```bash
   cat supabase/migrations/00015_m3_extended.sql | npx supabase db query --linked
   ```
5. Al terminar cada sesión, actualizar este archivo con lo completado

---

## Dependencias/servicios externos a planificar

| Servicio | Se usa en | Coste | Notas |
|---|---|---|---|
| `@react-pdf/renderer` | Etapa 1.4, 2.3 | npm gratis | Librería Node/client |
| OpenAI GPT-4 Vision | Etapa 4 (OCR albaranes) | ~$0.01-0.03/albarán | Clave en Supabase secrets |
| `qrcode` | Etapa 2.2 (etiquetas) | npm gratis | — |
| `web-push` + `resend` | Etapa 2.4 | resend $0 hasta 3k/mes | VAPID keys + Resend API |
| OpenWeatherMap, nager.date, football-data.org, Ticketmaster | Etapa 3.1 | Gratis | Rate-limited, llamar 1×/día |
| Servicio Python ML (Fly.io o Modal) | Etapa 3.1 | ~$5/mes Fly o pay-per-run Modal | XGBoost no corre en Supabase/Deno |

---

## Riesgos activos

- **pg_cron no habilitado**: alternativa Supabase Cron (beta) o GitHub Actions cron
- **Realtime**: KDS y notificaciones in-app requieren habilitar Realtime en las tablas en Supabase dashboard
- **Paro (autónomo)**: Israel cobra paro — NO dar de alta como autónomo hasta >1000€/mes. Este trabajo es para terminar producto.
