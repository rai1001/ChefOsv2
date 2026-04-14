# Estado del Plan de Completado ChefOS v2

> **Última sesión:** 2026-04-14 (Israel + Claude)
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

## Roadmap de sesiones futuras

Cada sesión = 1 etapa (aprox 1–2h). Orden según plan maestro:

### Sesión 2 — Etapa 1.2 (M5 avanzado)
- Migración `00016_m5_reservations_counts.sql`
- Tablas: `stock_reservations`, `stock_counts`, `stock_count_lines`, `expiry_rules`
- RPCs: `reserve_stock_for_event` (FIFO), `consume_reservation`, `release_reservation`, `calculate_real_cost`, `start_stock_count`, `submit_stock_count_line`, `review_stock_count`, `get_stock_forensics`
- UI: `/inventory/counts`, `/inventory/forensics`, reservas en detalle evento

### ~~Sesión 3 — Etapa 1.3 (M6 workflows + KDS)~~ ✅ COMPLETADA

### Sesión 4 — Etapa 1.4 (M1 BEO + PDF)
- Migración `00018_m1_beo.sql`
- Tabla: `event_operational_impact`
- RPCs: `get_event_beo`, `calculate_event_cost_estimate`, `generate_event_operational_impact`
- Deps nuevas: `npm install @react-pdf/renderer`
- `src/features/commercial/pdf/beo-document.tsx`, API route `/api/events/[id]/beo`

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
- 10: Etapa 3.2 M12 Integraciones PMS/POS (Mews, OPERA, Lightspeed, Simphony)
- 11: Etapa 3.3 M13 RRHH y turnos
- 12: Etapa 3.4 M15 Agentes autónomos (5 automejora + 5 coordinación evento)
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
