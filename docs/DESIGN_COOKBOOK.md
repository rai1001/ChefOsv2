# DS Cookbook — ChefOS v2

> Recetas copy-paste para extender el design system sin reinventar patrones.
> Referencia viva: [`http://localhost:3000/design-system`](../src/app/design-system/page.tsx).
> Spec: [`DESIGN.md`](../DESIGN.md). Plan: [`DESIGN_MIGRATION.md`](DESIGN_MIGRATION.md).

---

## Receta 1 · Añadir una pantalla con tabla de estado

**Caso:** necesitas listar registros (X) con columna de estado.

1. Copia como base una pantalla ya migrada. Las cinco de referencia:
   - [events/page.tsx](../src/app/(dashboard)/events/page.tsx) — tabla simple con `EVENT_STATUS_VARIANT`
   - [procurement/page.tsx](../src/app/(dashboard)/procurement/page.tsx) — dos tabs (PRs y POs) con variantes diferentes
   - [inventory/page.tsx](../src/app/(dashboard)/inventory/page.tsx) — KPIs + tabla + filtros
   - [recipes/page.tsx](../src/app/(dashboard)/recipes/page.tsx) — tabla con columnas numéricas (`font-data`)
   - [agents/page.tsx](../src/app/(dashboard)/agents/page.tsx) — cards con `status-rail` (no tabla)

2. Reusa el patrón estándar del `<thead>`:

```tsx
<thead>
  <tr
    className="border-b text-left text-text-muted"
    style={{
      borderColor: 'var(--border-strong)',
      fontFamily: 'var(--font-code)',
      fontSize: '10px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}
  >
    <th className="px-4 py-3 font-medium">Nombre</th>
    <th className="px-4 py-3 text-right font-medium">Cantidad</th>
    <th className="px-4 py-3 font-medium">Estado</th>
  </tr>
</thead>
```

3. En cada `<tr>` aplica `status-rail` con la variante del estado:

```tsx
<tr
  key={row.id}
  className={cn(
    'status-rail border-b border-border last:border-0 hover:bg-bg-hover',
    X_STATUS_VARIANT[row.status]
  )}
>
  <td className="px-4 py-3 text-sm text-text-primary">{row.name}</td>
  <td className="px-4 py-3 text-sm text-text-secondary font-data text-right">
    {row.amount.toFixed(2)}
  </td>
  <td className="px-4 py-3">
    <span className={cn('badge-status', X_STATUS_VARIANT[row.status])}>
      {X_STATUS_LABELS[row.status]}
    </span>
  </td>
</tr>
```

**Reglas:**
- Left-border rail en el `<tr>`, NO en el `<td>`.
- Números siempre a la derecha + `font-data` (DM Mono tabular-nums).
- IDs (lotes, albaranes, BEO) con `font-code` (JetBrains Mono).
- Columna Estado con `badge-status` + la misma variante que el rail.

---

## Receta 2 · Añadir un enum de estado nuevo

**Caso:** estás creando una feature nueva con sus propios estados (ej. `tasting_session_status`).

1. Define el enum en `src/features/<feature>/types/index.ts`:

```ts
export const TASTING_SESSION_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const
export type TastingSessionStatus = (typeof TASTING_SESSION_STATUSES)[number]

export const TASTING_SESSION_STATUS_LABELS: Record<TastingSessionStatus, string> = {
  scheduled: 'Programada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
}
```

2. Añade el mapping `*_STATUS_VARIANT` con las 5 variantes del DS (`'neutral' | 'info' | 'warning' | 'success' | 'urgent'`):

```ts
export const TASTING_SESSION_STATUS_VARIANT: Record<
  TastingSessionStatus,
  'neutral' | 'info' | 'warning' | 'success' | 'urgent'
> = {
  scheduled:   'info',
  in_progress: 'warning',
  completed:   'success',
  cancelled:   'urgent',
}
```

3. Consume en la pantalla igual que la Receta 1 — `badge-status` + `status-rail` reciben el variant.

**Guía de mapeo:**

| Variante | Cuándo |
|---|---|
| `urgent` | Acción inmediata requerida · crítico · cancelado |
| `warning` | Atención · pendiente · en progreso con riesgo |
| `info` | Neutro informativo · enviado · consolidado |
| `success` | Confirmado · aprobado · completado OK |
| `neutral` | Sin estado especial · borrador · archivado |

**Donde viven los mappings existentes (referencia):**
- `EVENT_STATUS_VARIANT` → `src/features/commercial/types/index.ts`
- `RECIPE_STATUS_VARIANT` → `src/features/recipes/types/index.ts`
- `PLAN_STATUS_VARIANT` → `src/features/production/types/index.ts`
- `PR_STATUS_VARIANT`, `PO_STATUS_VARIANT`, `URGENCY_VARIANT` → `src/features/procurement/types/index.ts`
- `COUNT_STATUS_VARIANT` → `src/features/inventory/types/index.ts`
- `SUGGESTION_STATUS_VARIANT` → `src/features/agents/types/index.ts`
- `INTEGRATION_STATUS_VARIANT` → `src/features/integrations/types/index.ts`
- `JOB_STATUS_VARIANT` → `src/features/automation/types/index.ts`
- `SCHEDULE_STATUS_VARIANT` → `src/features/hr/types/index.ts`
- `APPCC_STATUS_VARIANT` → `src/features/compliance/types/index.ts`
- `ALERT_VARIANT` (local) → `src/app/(dashboard)/inventory/page.tsx`

---

## Receta 3 · Añadir un KPI card

**Caso:** número grande + etiqueta pequeña en la parte superior de una pantalla.

```tsx
<div className="rounded-md border border-border bg-bg-card p-4">
  <p className="kpi-label">Productos en stock</p>
  <p className="kpi-value mt-2">{total}</p>
</div>
```

Si quieres rail de estado (ej. "N alertas" que es urgente cuando > 0):

```tsx
<div className={cn(
  'status-rail rounded-r-md bg-bg-card p-4',
  alertCount > 0 ? 'urgent' : ''
)}>
  <p className="kpi-label">Alertas</p>
  <p className="kpi-value mt-2">{alertCount}</p>
</div>
```

**Referencia viva:** grid de 4 KPIs en [inventory/page.tsx:65-101](../src/app/(dashboard)/inventory/page.tsx) o [automation/page.tsx:181-196](../src/app/(dashboard)/automation/page.tsx).

- `kpi-value` — DM Mono 32px tabular-nums
- `kpi-label` — JetBrains Mono 11px uppercase tracking 0.08em
- Si el valor es texto corto (ej. "Sin plan"), `kpi-value` también lo renderiza bien

---

## Receta 4 · Añadir un modal

**Caso:** formulario de edición o confirmación sobre overlay.

```tsx
{open && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-bg-card rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
      <h2 className="text-base font-semibold text-text-primary">Título</h2>
      <p className="text-sm text-text-muted">Subtítulo o contexto</p>

      {/* contenido */}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 py-2 border border-border rounded-md text-sm text-text-secondary hover:bg-bg-hover"
        >
          Cancelar
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          className="flex-1 py-2 bg-accent text-white rounded-md text-sm hover:bg-accent-hover disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
    </div>
  </div>
)}
```

**Reglas:**
- Overlay: `bg-black/60`
- Modal: `rounded-lg` (10px, DESIGN.md §Layout) — NO `rounded-xl` ni `rounded-2xl`
- Botones: primary `bg-accent text-white hover:bg-accent-hover` (el DS auto-contrasta `text-white` sobre cream), secundario `border border-border`
- Padding interior: `p-6`
- Max width: `max-w-lg` (448px) para modales estándar, `max-w-2xl` para formularios amplios

**Referencia viva:** [compliance/appcc/page.tsx:202-279](../src/app/(dashboard)/compliance/appcc/page.tsx) — modal de registro APPCC.

---

## Receta 5 · Purgar clases light-mode de código heredado

**Caso:** integraste una página externa (o copiaste de shadcn/Tailwind docs) y trae `bg-white`, `bg-gray-*`, `text-gray-*`.

Ejecuta desde la raíz del repo:

```bash
find src/app -name "*.tsx" -exec sed -i -E \
  -e 's/\bbg-gray-900\b/bg-accent/g' \
  -e 's/\bbg-gray-100\b/bg-bg-hover/g' \
  -e 's/\bbg-gray-50\b/bg-bg-sidebar/g' \
  -e 's/\bbg-white\b/bg-bg-card/g' \
  -e 's/\btext-gray-900\b/text-text-primary/g' \
  -e 's/\btext-gray-600\b/text-text-secondary/g' \
  -e 's/\btext-gray-500\b/text-text-muted/g' \
  -e 's/\btext-gray-400\b/text-text-muted/g' \
  -e 's/\bborder-gray-200\b/border-border/g' \
  -e 's/\bborder-gray-300\b/border-border/g' \
  -e 's/\btext-green-600\b/text-success/g' \
  -e 's/\btext-yellow-600\b/text-warning/g' \
  -e 's/\btext-red-600\b/text-danger/g' \
  -e 's/\btext-blue-600\b/text-info/g' \
  -e 's/\brounded-2xl\b/rounded-lg/g' \
  -e 's/\brounded-xl\b/rounded-md/g' \
  {} \;
```

Después:

```bash
# Verifica que no queden residuales
grep -rE "bg-gray-|text-gray-|bg-white\b|border-gray-" src/app --include="*.tsx"

# Verifica tipos + lint
npm run typecheck
npm run lint
```

**Tokens inexistentes comunes** (causan clases no-op silenciosas):
- `bg-surface` → usa `bg-bg-card`
- `bg-surface-alt` → usa `bg-bg-sidebar`
- `bg-background` → usa `bg-bg-input` en inputs, `bg-bg-primary` en body
- `bg-bg-muted` → usa `bg-bg-sidebar`

---

## Anti-patrones (lo que NO hacer)

1. **No uses `text-white` sobre `bg-accent`** — el DS ya fuerza `color: var(--accent-fg)` sobre `.bg-accent`, así que el `text-white` queda oculto. Si lo quieres fuera del accent, añade el contexto (ej. `text-white` sobre `bg-danger` está bien).
2. **No hagas custom CSS en componentes.** Si necesitas algo que no existe, añade la utility class a `src/app/globals.css` (@theme si es token, @layer utilities si es clase compuesta) y documéntala aquí.
3. **No uses gradientes, glassmorphism, glow, sombras llamativas, border-radius > 10px, emojis.** (DESIGN.md §Anti-patterns)
4. **No metas estado en columna `<td>` con bg de color completo** — el estado va en el left-border `status-rail` del `<tr>` + `badge-status`. No ambos con fondo.
5. **No uses `rounded-xl`/`rounded-2xl`.** Radios DS: `rounded-sm` (4px tablas/inputs), `rounded-md` (8px cards/botones), `rounded-lg` (10px modales).

---

## Debugging rápido

| Síntoma | Causa probable | Fix |
|---|---|---|
| Botón cream con texto invisible | `text-white` sobre `bg-accent` sin la regla CSS aplicándose | Verifica que `globals.css` tenga `.bg-accent { color: var(--accent-fg) }` |
| `status-rail` no se ve | Falta la variante (`urgent`/`warning`/`success`/`info`) o el `<tr>` no tiene `border-left` | Inspecciona con DevTools: debe haber `border-left-width: 3px` |
| `badge-status` sin estilo | Typo en la variante (ej. `urget` en vez de `urgent`) | Las 5 variantes válidas: `urgent warning success info neutral` |
| Columna numérica desalineada | Falta `font-data` | Añade `className="... font-data text-right"` en `<td>` |
| Skeleton no pulsa | Olvidaste la clase `.skeleton` o usaste `animate-pulse` suelto | Usa `className="skeleton h-4 w-20"` (no `animate-pulse` ni `bg-bg-hover` manuales) |

---

## Cómo añadir una receta nueva

1. Si te encuentras implementando el mismo patrón por segunda vez, escríbelo aquí.
2. Formato: caso concreto + código copy-paste + link a referencia viva + anti-patrones si aplica.
3. Commit: `docs(design): cookbook — receta para <X>`.
