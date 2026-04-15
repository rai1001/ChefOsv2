# TODOS · ChefOS v2

> Debt priorizada identificada en reviews. Cada entrada: qué, por qué, cómo.
> Convención: `[ ]` abierta, `[x]` hecha (mueve a "Historial" con fecha).

---

## Design System — F6 polish futuro

### [ ] DS-1 · Tipar las variantes del DS

**Qué:** crear `src/lib/design-system/index.ts` con helpers tipados para `badge-status`, `status-rail`, `kpi-value`, `kpi-label`, re-exports de los 11 mappings `*_STATUS_VARIANT`. Refactor de ~40 callsites.

**Por qué:** hoy las variantes son strings sueltos. `<span className="badge-status urget">` (typo) compila, pasa lint, se renderiza sin estilo, y descubres el bug visualmente 20 minutos después. El DS vale más tipado.

**Pros:**
- Typos imposibles
- Autocompletado en VS Code (ve las 5 variantes válidas)
- Rename global gratis cuando renombres una variante
- Los 11 mappings `*_STATUS_VARIANT` en un solo sitio accesible

**Cons:**
- ~40 callsites a refactorizar (events, inventory, procurement, recipes, production, agents, integrations, automation, compliance, alerts, dashboard)
- Cambio grande en un PR (o bien 1 PR por feature)

**Cómo:**

```ts
// src/lib/design-system/index.ts
export const STATUS_VARIANTS = ['urgent', 'warning', 'success', 'info', 'neutral'] as const
export type StatusVariant = (typeof STATUS_VARIANTS)[number]

export function badgeStatus(v: StatusVariant): string { return `badge-status ${v}` }
export function statusRail(v: StatusVariant): string { return `status-rail ${v}` }

// Re-exports (barrel)
export { EVENT_STATUS_VARIANT } from '@/features/commercial/types'
export { RECIPE_STATUS_VARIANT } from '@/features/recipes/types'
// ... 9 más
```

Refactor:
```tsx
// antes
<span className={cn('badge-status', variant)}>

// después
<span className={badgeStatus(variant)}>
```

**Depends on:** nada.
**Estimación:** ~1h con CC. Hacer en branch aparte, un PR.

---

### [ ] DS-2 · Playwright snapshot de `/design-system` como regresión visual

**Qué:** test E2E que captura `/design-system` con `toHaveScreenshot()` y falla el CI si cambia.

**Por qué:** hoy nada impide que alguien cambie `--color-accent` o rompa `.badge-status.urgent` y no se entere hasta que un usuario lo vea. La página `/design-system` es el canario perfecto: si se ve bien ahí, se ve bien en todo el producto.

**Pros:**
- Imposible romper el DS sin ver el diff en el PR
- Funciona con el CI ya montado (`.github/workflows/ci.yml` Fase E)
- Un test, cobertura de los 50+ usos de utility classes

**Cons:**
- Snapshots son frágiles con fuentes web (Syne/DM Sans). Puede haber flakiness si Google Fonts devuelve una versión distinta.
- Primer run hay que aprobar el baseline.

**Cómo:**

```ts
// e2e/design-system.spec.ts
import { test, expect } from '@playwright/test'

test.describe('design system', () => {
  test('showcase page matches baseline', async ({ page }) => {
    await page.goto('/design-system')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('design-system-full.png', {
      fullPage: true,
      maxDiffPixels: 200,
    })
  })
})
```

Añadir a `playwright.config.ts` si hace falta `use.viewport`.

**Depends on:** servidor dev corriendo en CI. El workflow E2E ya lo gestiona.
**Estimación:** ~20 min con CC. Primer run + aprobar baseline, luego automático.

---

### [ ] DS-3 · CI lint contra tokens inexistentes

**Qué:** script bash que `grep`ea el repo buscando clases que NO existen en `@theme` (`bg-surface`, `bg-background`, `bg-bg-muted`, `badge-status <variante-inválida>`, etc.) y falla con exit 1 si encuentra alguna.

**Por qué:** Tailwind v4 con `@theme` NO emite warnings por clases desconocidas — simplemente no aplica nada. Eso es un silent failure especialmente peligroso porque el dev cree que escribió bien. F3 y F4 ya purgaron el repo, pero hay que impedir la regresión.

**Pros:**
- Bloqueo en CI, no aparece en producción
- Documentación implícita de qué tokens existen (el script es la verdad)
- Incluye chequeo de variantes inválidas de `badge-status` / `status-rail`

**Cons:**
- Grep-based, no semántico. Un false positive si alguien tiene `bg-white` dentro de un comentario.
- Mantenimiento: si añades token nuevo, hay que actualizar el script.

**Cómo:**

```bash
# scripts/check-ds-tokens.sh
#!/usr/bin/env bash
set -e

# Tokens que NO deben aparecer (light-mode leakage o tokens inexistentes)
FORBIDDEN_TOKENS=(
  "bg-white"
  "bg-gray-[0-9]"
  "text-gray-[0-9]"
  "border-gray-[0-9]"
  "bg-surface\b"
  "bg-surface-alt"
  "bg-background\b"
  "bg-bg-muted"
  "bg-bg-subtle"
  "text-green-[0-9]"
  "text-red-[0-9]"
  "text-yellow-[0-9]"
  "text-blue-[0-9]"
  "rounded-xl\b"
  "rounded-2xl"
)

VIOLATIONS=0
for pattern in "${FORBIDDEN_TOKENS[@]}"; do
  MATCHES=$(grep -rEn "$pattern" src/app src/components --include="*.tsx" 2>/dev/null || true)
  if [ -n "$MATCHES" ]; then
    echo "❌ FORBIDDEN TOKEN: $pattern"
    echo "$MATCHES"
    VIOLATIONS=$((VIOLATIONS + $(echo "$MATCHES" | wc -l)))
  fi
done

# Variantes inválidas de badge-status y status-rail
INVALID_VARIANTS=$(grep -rEon 'badge-status (?!urgent|warning|success|info|neutral)[a-z]+' src/app --include="*.tsx" -P 2>/dev/null || true)
if [ -n "$INVALID_VARIANTS" ]; then
  echo "❌ INVALID badge-status variant:"
  echo "$INVALID_VARIANTS"
  VIOLATIONS=$((VIOLATIONS + $(echo "$INVALID_VARIANTS" | wc -l)))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "Total violations: $VIOLATIONS"
  echo "Ver docs/DESIGN_COOKBOOK.md §Receta 5 para el barrido de purga."
  exit 1
fi

echo "✓ DS tokens clean"
```

Integrar en `package.json`:

```json
"scripts": {
  "lint:ds": "bash scripts/check-ds-tokens.sh",
  "lint": "eslint && npm run lint:ds"
}
```

Y en `.github/workflows/ci.yml` job `lint-typecheck` ya ejecuta `npm run lint`.

**Depends on:** nada.
**Estimación:** ~15 min con CC.

---

## Historial
