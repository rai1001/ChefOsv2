# Testing — ChefOS v2

## Estado actual (2026-04-15)

Infra operativa. Pocos tests escritos (estratégico pre-piloto — ver sección "Qué NO testeamos aún y por qué").

### Cómo ejecutar

```bash
npm run test         # Vitest (unit + component) — headless
npm run test:watch   # Vitest en modo watch
npm run test:e2e     # Playwright — requiere dev server en http://localhost:3003
```

### Infra instalada

- **Vitest 4** + `@vitejs/plugin-react` — test runner unit/component
- **@testing-library/react** + `@testing-library/jest-dom` + `@testing-library/user-event` — React testing
- **jsdom** — DOM en Node
- **@playwright/test** — E2E contra browser real (chromium headless)

### Config

- `vitest.config.ts` — incluye `src/**/*.test.{ts,tsx}` co-localizados
- `vitest.setup.ts` — cleanup entre tests + `@testing-library/jest-dom/vitest`
- `playwright.config.ts` — baseURL `http://localhost:3003` (configurable via `E2E_BASE_URL`), serial (login compartido)
- E2E NO arranca dev server — asume que ya corre (patrón Claude Preview)

### Variables de entorno E2E

Obligatorias (los tests lanzan error si faltan — sin defaults hardcoded):

- `E2E_EMAIL` — email del usuario principal para `smoke.spec.ts`
- `E2E_PASSWORD` — password compartido del seed y del usuario principal

Opcionales:

- `E2E_BASE_URL` (default `http://localhost:3003`)

Ponlas en `.env.test.local` (ya en `.gitignore`) o en el shell antes de
`npm run test:e2e`. Los emails por rol (`test-admin@chefos.test`,
`test-cook@chefos.test`, …) están hardcoded porque los crea el script de
seed — no son secretos; el único secreto es la password.

## Filosofía (database-first)

ChefOS es **database-first**: toda la lógica de dominio vive en RPCs PL/pgSQL con RLS. El frontend es thin (UI + TanStack Query wrappers). Eso cambia la pirámide clásica:

```
         E2E    ← El 80% del valor. Flujos reales contra Supabase.
        /      \
    Component   ← Regresiones específicas de hooks/render
      /          \
   Unit           ← Solo para helpers puros (cn, formatters, etc.)
  /                \
 SQL (pgTAP)        ← Pendiente. Aquí vive la lógica de negocio real.
```

**Unit tests TypeScript tienen ROI bajo** porque las reglas de negocio no están en TypeScript. Priorizar E2E + tests SQL cuando se añadan.

## Tests actuales

### Unit / component (Vitest)

| Archivo | Qué prueba |
|---|---|
| `src/lib/utils.test.ts` | `cn()` — combinación de classnames + resolución twMerge |

### E2E (Playwright)

| Archivo | Qué prueba |
|---|---|
| `e2e/tests/smoke.spec.ts::login → dashboard carga` | Login end-to-end + dashboard renderiza sin errores de consola |
| `e2e/tests/smoke.spec.ts::regresión ISSUE-001` | `/recipes/[id]/escandallo` muestra "Actualizado hace Ns" y el contador avanza en vivo (setInterval del fix React 19 purity) |
| `e2e/tests/smoke.spec.ts::regresión ISSUE-005` | `/events/[id]` renderiza sin errores de `@react-pdf/renderer` (valida el wrapper `BeoBtn` en `pdf-buttons.tsx`) |

## Qué NO testeamos aún y por qué

### Tests RLS / seguridad (pendiente, alto valor)

Codex audit (00028/00029) pidió tests de regresión SQL para demostrar que:
- Un usuario no-admin NO puede `select credentials from pms_integrations` vía PostgREST
- Un cook NO puede llamar `trigger_pos_sync('push_kitchen_orders')`
- La whitelist de `sync_type` rechaza valores fuera de lista

Requiere:
- Cliente Supabase con anon key + sesión de usuario no-admin
- Hotel + usuario de prueba con rol bajo (cook/head_chef sin admin) poblado
- Fixtures SQL reproducibles

Defer hasta que haya un segundo hotel de fixtures en el proyecto de dev. Los fixes están aplicados en BD y verificados manualmente.

### E2E de flujos críticos (pendiente, medio valor)

`docs/TESTING_STRATEGY.md` lista 5 flujos críticos:
1. Login → crear evento → confirmar
2. Evento confirmado → crear orden producción → marcar done
3. Crear pedido → aprobar → recibir parcial → inventario actualizado
4. Registrar merma → aparece en dashboard
5. Crear preparación (etiqueta) → trazabilidad visible

Cada uno requiere setup de datos (crear cliente, menú, productos, proveedor, stock…). Defer hasta tener un **seed script determinista** que resetea el hotel de prueba a un estado conocido. Sin eso los tests son flaky.

### Unit tests de features (bajo valor)

Las carpetas `src/features/*/schemas/` están vacías. No hay schemas Zod ni helpers puros de dominio a testear. Si en algún momento se extraen funciones puras (calcular food cost %, validar menú, etc.) entonces tests unit valen. Ahora mismo cualquier test frontend unit es de UI (setup complejo, bajo ROI).

## Próximos pasos ordenados por ROI

1. **Seed script** (`supabase/seed.sql` o equivalente) — reset determinista del hotel de prueba con clientes, menús, productos, stock. Sin esto los E2E son frágiles.
2. **E2E flujo evento completo** (flujo 1 de TESTING_STRATEGY.md).
3. **E2E flujo pedido + recepción** (flujo 3 — crítico para food cost).
4. **Tests RLS** — con pgTAP o un test TypeScript que use cliente Supabase con anon key y cuenta no-admin.
5. **Extraer funciones puras** a medida que se vayan identificando en refactors (formatters, validadores, calculadoras) y testearlas.

## CI

No hay GitHub Actions configurado aún. Cuando se añada:
- `npm run lint && npm run typecheck && npm run test && npm run build` en cada PR
- `npm run test:e2e` como job aparte con su propio `preview deployment` o dev server

Ver `docs/CI_RULES.md` y `docs/GITHUB_ACTIONS_CI_YAML.md` para el plan de CI.

## Regla

La regla antigua ("ninguna tarea se cierra sin tests relevantes", objetivo 90%) NO es realista pre-piloto para este proyecto. La regla actual:

- **Bug fix con alto riesgo de regresión** → test E2E o component que lo capture (p. ej. los 3 tests de `smoke.spec.ts`)
- **Feature nueva que añade lógica TypeScript** → test unit si la lógica es aislable
- **Cambio de RPC / RLS** → verificación manual + test RLS cuando haya seed
- **Cambio de UI sin lógica** → smoke manual en el preview, sin test formal

Post-piloto con datos reales se revalúa y se apunta a los objetivos de `TESTING_STRATEGY.md`.
