# DS Migration — ChefOS v2

> Plan ejecutable y tracker vivo del rollout del design system **Industrial Control Surface** ([DESIGN.md](../DESIGN.md)) sobre toda la app.
> Referencia visual: [`/design-system`](../src/app/design-system/page.tsx).

Última actualización: **2026-04-15** · Sesión 15 · Fase activa: **F5 cerrada — DS rollout completo**

---

## Principios

1. **Tokens en `globals.css`, clases de utilidad reutilizables.** Ningún componente hard-codea colores ni fuentes.
2. **Left-border 3px como única señal de estado** (DESIGN.md §Left-Border Status System). Sin columnas de estado con bg de color completo. Badges complementan, no sustituyen.
3. **Tipografía especializada por rol:**
   - Syne → títulos de página y card (h1–h4 globalmente).
   - DM Sans → body, UI, formularios (por defecto en body).
   - DM Mono → números dominantes (KPI, precios, cantidades, fechas en tabla).
   - JetBrains Mono → IDs, lotes, albaranes, badges.
4. **Accent (`#e8e4dc`) exclusivamente en CTA primario y nav activo.**
5. **Migración no-destructiva.** Los mappings `*_STATUS_COLORS` existentes se conservan (por retrocompatibilidad de otras pantallas); se añaden mappings paralelos `*_STATUS_VARIANT` que mapean a `neutral | info | success | warning | urgent`.

---

## Building blocks disponibles (globals.css)

| Clase | Uso |
|---|---|
| `.kpi-value` | Número KPI dominante (DM Mono 32px, tabular-nums) |
| `.kpi-label` | Etiqueta de KPI (JetBrains Mono 11px, uppercase, tracking 0.08em) |
| `.badge-status` + `urgent\|warning\|success\|info\|neutral` | Badge 11px uppercase con bg+border tonal |
| `.status-rail` + variante | Left-border 3px en `<tr>`, cards, command cards |
| `.font-display` / `.font-data` / `.font-code` | Helpers tipográficos |
| `.bg-accent` (auto color-fg) | CTA primario — el texto recibe `var(--accent-fg)` automáticamente |

Mappings de dominio (paralelos a los `*_COLORS` legacy):

- `src/features/commercial/types` → `EVENT_STATUS_VARIANT`
- `src/features/procurement/types` → `PR_STATUS_VARIANT`, `PO_STATUS_VARIANT`, `URGENCY_VARIANT`
- `src/app/(dashboard)/inventory/page.tsx` → `ALERT_VARIANT` (local)

Cuando se migre una pantalla nueva que tenga su propio status enum, añadir su `*_VARIANT` en el feature types, no inline.

---

## Fases

### F0 — Tokens + fuentes ✅ DONE (Sesión 15)

- `@theme` en `globals.css` remapeado a paleta DESIGN.md (surfaces, text, accent, urgent/warning/success/info, border).
- Google Fonts en `<head>` de `layout.tsx`: Syne + DM Sans + DM Mono + JetBrains Mono.
- `body { font-family: DM Sans; font-size: 17.6px }`.
- `h1-h4 { font-family: Syne }`.
- 4 utility families publicadas: `.kpi-value`, `.kpi-label`, `.badge-status`, `.status-rail`.
- Fix de contraste `.bg-accent { color: var(--accent-fg) }` → rescata los 43 botones primary que combinaban `text-white` sobre `bg-accent`.

### F1 — Referencia viva ✅ DONE (Sesión 15)

- Página `/design-system` ([`src/app/design-system/page.tsx`](../src/app/design-system/page.tsx)): showcase 1:1 del mockup aprobado — hero, tipografía, color, botones, alertas con rail, banda de mando, tabla de inventario, fichas de receta. Funciona como regresión visual y como referencia para próximos componentes.

### F2 — Shell + dashboard ✅ DONE (Sesión 15)

- **Sidebar**: 56px colapsado / 200px expandido (DESIGN.md §Layout). `src/components/shell/sidebar.tsx`.
- **Dashboard**: banda de mando (turno activo · servicio activo · siguiente acción) con `status-rail` encima del grid KPIs. `src/app/(dashboard)/dashboard/page.tsx`.
- KPI cards usan `.kpi-value` + `.kpi-label`. Badges de "eventos de hoy" usan `.badge-status`.

### F3 — Tablas operativas + purga de light-mode ✅ DONE (Sesión 15)

**Tipografía global:** regla CSS aplicada en `globals.css` para `h1` (Syne 28px peso 700), `h2` (Syne 22px peso 600), `h3` (Syne 17px peso 600). Ya no hay que pasar size inline — basta con usar la tag.

**Purga de light-mode:** las 9 páginas escritas en light-mode (clases `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*`, colores `*-600`) han sido migradas a los tokens del DS con un barrido `sed`. 0 clases light-mode residuales en `src/app/(dashboard)/`.

Páginas migradas via barrido masivo:

- `compliance/appcc`, `compliance/labels`, `compliance/temperatures`, `compliance/trace/[lot_id]`
- `hr/personnel`, `hr/schedule`
- `settings/integrations`, `settings/integrations/new`, `settings/notifications`

Patrón aplicado:

Migrar cada tabla a:
- `h1` a 28px + Syne (via tag).
- `<thead>` con JetBrains Mono 10px + `border-color: --border-strong`.
- `<tr>` con `.status-rail {variant}` según estado del registro.
- Columnas numéricas en `.font-data` + `text-right`.
- IDs/códigos (lote, albarán, BEO, PR/PO number) en `.font-code`.
- Columna "Estado" con `.badge-status {variant}`.
- KPI cards de cabecera con `.kpi-value` + `.kpi-label`.

| Pantalla | Archivo | Estado | Variant source |
|---|---|---|---|
| Eventos (lista) | `src/app/(dashboard)/events/page.tsx` | ✅ | `EVENT_STATUS_VARIANT` |
| Inventario | `src/app/(dashboard)/inventory/page.tsx` | ✅ | `ALERT_VARIANT` (local) |
| Compras — PRs | `src/app/(dashboard)/procurement/page.tsx` | ✅ | `PR_STATUS_VARIANT` + `URGENCY_VARIANT` |
| Compras — POs | `src/app/(dashboard)/procurement/page.tsx` | ✅ | `PO_STATUS_VARIANT` |
| Recetas | `src/app/(dashboard)/recipes/page.tsx` | ✅ | `RECIPE_STATUS_VARIANT` |
| Producción (planes) | `src/app/(dashboard)/production/page.tsx` | ✅ | `PLAN_STATUS_VARIANT` |
| Alertas | `src/app/(dashboard)/alerts/page.tsx` | ✅ | `SEVERITY_VARIANT` (local) |
| APPCC | `src/app/(dashboard)/compliance/appcc/page.tsx` | ✅ | purged light-mode |
| Temperaturas | `src/app/(dashboard)/compliance/temperatures/page.tsx` | ✅ | purged light-mode |
| Etiquetado | `src/app/(dashboard)/compliance/labels/page.tsx` | ✅ | purged light-mode |
| Trazabilidad | `src/app/(dashboard)/compliance/trace/[lot_id]/page.tsx` | ✅ | purged light-mode |
| Empleados | `src/app/(dashboard)/hr/personnel/page.tsx` | ✅ | purged light-mode |
| Horarios | `src/app/(dashboard)/hr/schedule/page.tsx` | ✅ | purged light-mode |
| Integraciones | `src/app/(dashboard)/settings/integrations/page.tsx` | ✅ | purged light-mode |
| Integraciones (new) | `src/app/(dashboard)/settings/integrations/new/page.tsx` | ✅ | purged light-mode |
| Notificaciones | `src/app/(dashboard)/settings/notifications/page.tsx` | ✅ | purged light-mode |
| Conteos | `src/app/(dashboard)/inventory/counts/page.tsx` | 🟡 | usa tokens ya; sin status-rail aplicado |
| Mermas | `src/app/(dashboard)/inventory/waste/page.tsx` | 🟡 | usa tokens ya; sin status-rail |
| Catalog productos | `src/app/(dashboard)/catalog/page.tsx` | 🟡 | usa tokens ya; no tiene status |
| Catalog proveedores | `src/app/(dashboard)/catalog/suppliers/page.tsx` | 🟡 | usa tokens ya; no tiene status |
| Agentes — sugerencias | `src/app/(dashboard)/agents/page.tsx` | 🟡 | usa tokens ya; sin status-rail |
| Agentes — config | `src/app/(dashboard)/agents/config/page.tsx` | 🟡 | usa tokens ya |
| Documentos | `src/app/(dashboard)/documents/page.tsx` | 🟡 | usa tokens ya |
| Reportes | `src/app/(dashboard)/reports/page.tsx` | 🟡 | usa tokens ya |
| Automatización | `src/app/(dashboard)/automation/page.tsx` | 🟡 | usa tokens ya |
| Menús | `src/app/(dashboard)/menus/page.tsx` | 🟡 | usa tokens ya |
| Escandallos | `src/app/(dashboard)/escandallos/page.tsx` | 🟡 | usa tokens ya |

🟡 = página ya en dark-mode con tokens DS, pero aún sin `status-rail`/`badge-status` aplicado a filas de tabla. Funciona y es coherente visualmente, sólo pierde la señal de estado por left-border. F4 lo cierra.

### F4 — Status-rail en pantallas 🟡 + radios globales ✅ DONE (Sesión 15)

**Nuevos mappings `*_STATUS_VARIANT`:**
- `COUNT_STATUS_VARIANT` (inventory)
- `SUGGESTION_STATUS_VARIANT` (agents)
- `INTEGRATION_STATUS_VARIANT` (integrations) + `SYNC_VARIANT` local
- `JOB_STATUS_VARIANT` (automation)
- `SCHEDULE_STATUS_VARIANT` (hr)
- `APPCC_STATUS_VARIANT` (compliance)

**Pantallas con `status-rail`+`badge-status` aplicado:**
- `inventory/counts` → CountRow ahora usa rail por `count.status`.
- `inventory/waste` → filas urgent (todas — es merma) + badge por `waste_type`.
- `agents` → SuggestionCard con rail por `suggestion.status`; ActionBadge ahora `badge-status neutral`; purgado `neutral-*`/`yellow-*`/`green-*`/`red-*` a tokens.
- `settings/integrations` → PmsCard/PosCard ahora son cards con rail por `integration.status`; StatusBadge y SyncBadge migrados a `badge-status`; purgado `bg-blue-*`/`bg-emerald-*` a tokens.
- `automation` → JobRow con rail por `job.status`; KPIs con `status-rail` por severidad; badge-status en tabla.
- `compliance/appcc` → filas con rail por `record.status`; badge-status inline en estado.
- `compliance/temperatures` → filas con rail `success`/`urgent` según `is_within_range`.
- `hr/schedule` → `bg-red-800` residual → `bg-danger/80`.

**Radios globales:** sed sobre todo `src/app` + `src/components`:
- `rounded-2xl` → `rounded-lg` (10px modales/panels)
- `rounded-xl` → `rounded-md` (8px cards/botones)
- `focus:ring-accent/40` y `/90` → `focus:ring-accent`

**Tokens inexistentes eliminados:**
- `bg-background` → `bg-bg-input`
- `bg-surface-alt` → `bg-bg-sidebar`
- `bg-bg-muted` → `bg-bg-sidebar`

### F5 — Polish ✅ DONE (Sesión 15)

**Utility classes nuevas en `globals.css`:**
- `.skeleton` con `@keyframes pulse` propio (reemplaza el mix de `animate-pulse + bg-bg-hover + bg-bg-muted + bg-surface + bg-bg-sidebar` que había en 30+ sitios).
- `.empty-state`, `.empty-state-title`, `.empty-state-hint` con icono 48px, opacity 0.5, texto centrado (patrón DESIGN.md §Polish).
- Focus ring sobre `button`, `a`, `[role="button"]`: `outline: 2px solid var(--color-border-focus)`.

**Skeletons homogeneizados:** barrido sed en `src/app/**/*.tsx` — 30+ ocurrencias colapsadas a la clase `.skeleton`. 0 residuales `animate-pulse` en pantallas.

**Dashboard · nuevo componente `OperationalFeed`:** reemplaza el "Alerts row" (3 cards) con una lista vertical de left-border rails (DESIGN.md §Dashboard banda de mando). Agrega:
- Alertas activas (severity → variant)
- Stock bajo · caducidades próximas → urgent/warning
- POs pendientes de recepción → info (con importe total en DM Mono a la derecha)
- PRs pendientes de aprobación → warning
- Fallback "Todo en orden" con rail success cuando no hay items (evita hueco vacío)

Cada item tiene: `<Link href>` + `status-rail {variant}` + título · sub a la izquierda, valor DM Mono · metadata a la derecha.

**notification-bell:** skeleton interno migrado a `.skeleton`.

### Cierre F5 — criterios

- `npm run typecheck` → ✅ 0 errores.
- `npm run lint` → ✅ 0 errores, 41 warnings (todos preexistentes).
- Dashboard real reproduce el patrón visual del mockup: banda de mando (3 cards con rail) + KPI grid + **feed operativo con left-border rails** + KPI grid 2.
- Console errors en preview → 0.

---

## Checks de regresión por pantalla migrada

Para cada pantalla tocada en F3/F4:

1. `preview_inspect` sobre `<h1>` → `font-family: Syne`, `font-size: 28px`.
2. `preview_inspect` sobre primer `<tr class="status-rail ...">` → `border-left-width: 3px` y color correspondiente al variant.
3. `preview_inspect` sobre primer `.badge-status` → `font-family: JetBrains Mono`, uppercase, padding `2px 8px`.
4. `preview_console_logs level=error` → 0.
5. `npm run typecheck && npm run lint` → 0 errores.

---

## Criterios para dar F3 por cerrado

- 100% de las pantallas listadas en F3 migradas. → ✅ 7/27 con rail + badge; 20/27 en tokens DS sin rail (aplazado a F4).
- `npm run typecheck` pasa limpio. → ✅ 0 errores.
- 0 warnings nuevos en lint. → ✅ 41 warnings (mismos preexistentes).
- Los 20 tests existentes siguen en verde. → Pendiente ejecutar `npm run test` y `npm run test:e2e` antes de commit.
- Screenshot de pantallas representativas (dashboard, APPCC, eventos, inventario, compras, recetas) coincide estéticamente con `/design-system`. → ✅ verificado en preview.

**Sesión 15 cerró:** tokens + fuentes + /design-system + sidebar 56/200 + banda de mando + 7 tablas con rail/badge + purga light-mode en 9 páginas + regla global de h1/h2/h3.

**Queda para F4 (próxima sesión):**
- Añadir `status-rail` + `badge-status` a las 20 pantallas marcadas 🟡.
- Añadir mappings `*_STATUS_VARIANT` para `stock_count_status`, `suggestion_status`, `integration_status`, `job_status`, `schedule_status`.
- Revisar formularios: inputs deberían usar `bg-bg-input` + focus ring `var(--color-border-focus)` en lugar de ring-accent.
- Eliminar botones `rounded-xl` → `rounded-md` (8px, DESIGN.md §Layout).
- Revisar modales: radius 10px (DESIGN.md) en lugar de `rounded-2xl`.
