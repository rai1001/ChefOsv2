# Testing Roadmap — Camino al "90%" realista

> **URGENTE — pendiente de crear**
> Creado: 2026-04-15 (tras Sesión 13 QA + Codex audit)
> Contexto: `docs/TESTING.md` describe el estado actual (4 unit + 3 E2E). Este roadmap es el plan para escalar de ahí a "cobertura útil" antes de piloto.

## Por qué el "90% coverage" clásico NO es la meta correcta

ChefOS es **database-first**. El ratio real:

- **Lógica de negocio en PL/pgSQL**: ~8.000 líneas en `supabase/migrations/` (RPCs, triggers, state machines). Toda la regla de verdad.
- **Código TypeScript en `src/`**: el 80% son componentes React que hacen `useQuery → render tabla`. Cristal fino alrededor de las RPCs.

Testear "90% de cada línea TS" significa escribir tests de componentes que verifican que React renderiza lo que React renderiza. Baja señal, alto mantenimiento. Cada refactor de UI rompe 20 tests.

**El 90% tiene que medirse donde vive la lógica, no donde vive el código.**

## Redefinición de la meta (este es el "90% real" de ChefOS)

| Capa | Dónde vive la lógica | Herramienta | Meta realista |
|---|---|---|---|
| **SQL / RPCs** | `supabase/migrations/*.sql` | pgTAP o TS con cliente anon | **90% de RPCs críticas** cubiertas |
| **RLS / seguridad** | policies en migraciones | TS con anon client + usuarios de test | **100% de tablas con secretos** verificadas |
| **Flujos end-to-end** | Next.js + Supabase juntos | Playwright | **5/5 flujos críticos** de `TESTING_STRATEGY.md` |
| **Lógica TS pura** (formatters, validadores, calculadoras) | `src/lib/domain/` (aún no existe) | Vitest | **90% en ese directorio** (cuando exista) |
| **UI pura** | Componentes React | — | **Smoke E2E solo**, NO unit tests |

---

## Plan por fases

### Fase A — Seed determinista (BLOQUEANTE, ~45 min / 1 sesión)

Sin esto, los E2E de flujos completos son flaky porque dependen del estado actual del hotel de prueba.

**Archivo:** `supabase/seed.sql`

**Contenido:**
- Borra y recrea hotel `ec079cf6-13b1-4be5-9e6f-62c8f604cb1e`
- Crea 7 usuarios, uno por rol (`superadmin`, `direction`, `admin`, `head_chef`, `sous_chef`, `operations`, `cook`) — necesario para tests RLS
- Crea 2 clientes (corporativo + boda), 3 menús (entrante/principal/postre), 10 productos, 2 proveedores con ofertas, stock inicial en 5 productos
- Crea 1 evento en cada estado (`draft`, `pending_confirmation`, `confirmed`, `in_preparation`, `in_operation`, `completed`)

**Script:**
```json
// package.json scripts
"db:reset": "npx supabase db reset --linked && cat supabase/seed.sql | npx supabase db query --linked"
```

**Desbloquea:** Fase B + Fase C.

---

### Fase B — E2E de los 5 flujos críticos (~2 sesiones, ~30 min cada test)

Los de `docs/TESTING_STRATEGY.md`:

| # | Flujo | Archivo | ~líneas | Valor |
|---|---|---|---|---|
| 1 | Login → crear evento → confirmar | `e2e/tests/flow-1-event.spec.ts` | ~80 | Alto |
| 2 | Evento confirmado → workflow → marcar task done | `e2e/tests/flow-2-production.spec.ts` | ~100 | Alto |
| 3 | Crear pedido → aprobar → recibir parcial → inventario actualizado | `e2e/tests/flow-3-procurement.spec.ts` | ~150 | **Crítico** (food cost depende de esto) |
| 4 | Registrar merma → dashboard la refleja | `e2e/tests/flow-4-waste.spec.ts` | ~60 | Medio |
| 5 | Crear etiqueta → `trace_lot` devuelve la trazabilidad | `e2e/tests/flow-5-traceability.spec.ts` | ~80 | Alto (compliance) |

Cada test depende del seed de Fase A — empieza con `await execSync('npm run db:reset')` o equivalente.

**Resultado:** si estos 5 pasan, la app sirve al 80% de los usuarios reales. Regresiones catastróficas capturadas.

---

### Fase C — RLS + seguridad (~45 min / 1 sesión) — ALTA PRIORIDAD

Codex ya lo pidió. Herramienta: **cliente Supabase TypeScript con anon key** (más portable que pgTAP, mismo lenguaje que el resto de tests).

**Archivo propuesto:** `e2e/tests/security-rls.spec.ts` (Playwright test con fetch directo a Supabase) o `src/__tests__/rls.test.ts` con `@supabase/supabase-js` directo.

**Tests concretos (7, ~150 líneas total):**

```typescript
// Usa el seed de Fase A: un usuario 'cook' sin privilegios y un 'admin'
describe('RLS integraciones (Codex 00028)', () => {
  test('cook no puede SELECT credentials de pms_integrations', async () => {
    const { data, error } = await cookClient
      .from('pms_integrations')
      .select('credentials')
    // Con la nueva policy admin-only, cook recibe 0 rows (no error, filtered silently)
    expect(data).toHaveLength(0)
  })

  test('admin SÍ puede SELECT credentials', async () => {
    const { data } = await adminClient
      .from('pms_integrations')
      .select('credentials')
    expect(data?.length).toBeGreaterThan(0)
  })

  test('cook no puede llamar trigger_pos_sync', async () => {
    const { error } = await cookClient.rpc('trigger_pos_sync', {
      p_hotel_id: HOTEL, p_integration_id: POS_ID, p_sync_type: 'sync_sales'
    })
    expect(error?.code).toBe('P0002') // forbidden
  })

  test('admin puede llamar trigger_pos_sync con sync_sales', async () => {
    const { data, error } = await adminClient.rpc('trigger_pos_sync', {
      p_hotel_id: HOTEL, p_integration_id: POS_ID, p_sync_type: 'sync_sales'
    })
    expect(error).toBeNull()
    expect(data).toBeTruthy() // log_id devuelto
  })

  test('admin NO puede push_kitchen_orders (requiere direction+)', async () => {
    const { error } = await adminClient.rpc('trigger_pos_sync', {
      p_hotel_id: HOTEL, p_integration_id: POS_ID, p_sync_type: 'push_kitchen_orders'
    })
    expect(error?.code).toBe('P0002')
  })

  test('trigger_pos_sync rechaza sync_type="hack_attempt" (whitelist P0003)', async () => {
    const { error } = await adminClient.rpc('trigger_pos_sync', {
      p_hotel_id: HOTEL, p_integration_id: POS_ID, p_sync_type: 'hack_attempt'
    })
    expect(error?.code).toBe('P0003')
  })

  test('trigger_pos_sync rechaza push_kitchen_orders si config lo tiene false', async () => {
    // Setup: integración con config.push_kitchen_orders=false
    const { error } = await directionClient.rpc('trigger_pos_sync', {
      p_hotel_id: HOTEL, p_integration_id: POS_ID_DISABLED, p_sync_type: 'push_kitchen_orders'
    })
    expect(error?.message).toMatch(/deshabilitado en config/i)
  })
})
```

**Desbloquea:** cierre definitivo de los 2 audits Codex del 2026-04-15.

---

### Fase D — Extract + unit tests de dominio TS (OPORTUNISTA, 0 sesiones dedicadas)

A medida que vayas refactorizando, cada función pura que identifiques va a `src/lib/domain/`. Ejemplos reales que ya existen inline en el código:

| Función inline | Dónde | Destino |
|---|---|---|
| `calcNet(qty, waste)` | `escandallos/page.tsx:36-38` | `src/lib/domain/recipes.ts` |
| `fmt(n)` formatter EUR | `events/[id]/page.tsx:65-68` | `src/lib/domain/format.ts` |
| merge defaults de `AGENT_DEFAULT_CONFIG` | `agents/config/page.tsx:32-36` | `src/lib/domain/agents.ts` |
| `projectedFCPct`, `pvpSugerido`, `costDelta` | `recipes/[id]/escandallo/page.tsx:87-98` | `src/lib/domain/food-cost.ts` |

**Regla:** Cada vez que toques un archivo y veas una función pura inline, extráela + test. En 2-3 meses tienes 20 funciones en `src/lib/domain/` con 90% coverage. Orgánico, sin esfuerzo dedicado.

**Enforcement:** Añadir threshold en `vitest.config.ts`:

```ts
test: {
  coverage: {
    provider: 'v8',
    include: ['src/lib/**'],
    thresholds: { lines: 90, functions: 90, branches: 85 },
  }
}
```

Vitest falla el run si `src/lib/**` baja del umbral. El resto de `src/` no bloquea.

Requiere `npm install -D @vitest/coverage-v8`.

---

### Fase E — CI GitHub Actions (~30 min / 1 sesión)

Sin CI, los tests se pudren. Con CI, la regresión te avisa antes de que tú la notes.

**Archivo:** `.github/workflows/ci.yml`

**Jobs:**

```yaml
name: CI
on: [push, pull_request]

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

  test-e2e:
    runs-on: ubuntu-latest
    needs: [lint-typecheck, build]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run db:reset
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL_CI }}  # proyecto CI separado
      - run: npm run dev &
      - run: npx wait-on http://localhost:3003
      - run: npm run test:e2e
        env:
          E2E_BASE_URL: http://localhost:3003
          E2E_EMAIL: admin@chefos.test
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
```

**Gate:** merge bloqueado si falla cualquier job. Configurar en GitHub → Branch protection → Require status checks.

---

## Orden y esfuerzo acumulado

| Fase | Sesiones CC | Bloquea a | Valor |
|---|---|---|---|
| A — Seed determinista | 1 | B, C | Habilitador (sin esto, flaky) |
| B — E2E 5 flujos | 2 | — | 80% de la confianza funcional |
| C — RLS/seguridad | 1 | — | Cierra los 3 findings Codex |
| D — Extract oportunista | 0 dedicadas | — | Compuesto, sin esfuerzo extra |
| E — CI GitHub Actions | 1 | — | Evita que se pudra |

**Total: ~5 sesiones Claude Code de 30-45 min cada una.**

Después de esto:
- **E2E: 8/8 tests** (3 actuales + 5 flujos) cubren los flujos por los que un usuario te paga
- **SQL/RLS: 7/7 tests** sobre la superficie auditada por Codex
- **TS domain: 90%+** en `src/lib/**` cuando exista (oportunista)
- **CI** falla ruidosamente si rompes algo

Eso es "90% de verdad" para ChefOS v2.

---

## Decisión pendiente — elegir antes de empezar

**Opción A — "Ir rápido a piloto"**: hacer solo **Fase A + Fase C** ahora. 2 sesiones. Cubre los audits Codex, valida que la seguridad aguanta. Los E2E de flujos se escriben a medida que un usuario piloto reporta algo.

**Opción B — "Ir completo antes del piloto"**: hacer **A → B → C → E** en secuencia. 5 sesiones. Llegas al piloto con red de seguridad completa.

**Recomendación:** Opción A. Validas seguridad (que es lo que Codex rompió hoy) sin bloquear piloto. Los flujos E2E se escriben mejor después de ver a un usuario real usarlo y saber dónde rompe.

---

## Prerrequisitos técnicos (ya resueltos)

- [x] Vitest + @testing-library instalados (commit `114bf8e`)
- [x] Playwright + chromium instalados (commit `114bf8e`)
- [x] `vitest.config.ts`, `playwright.config.ts`, `vitest.setup.ts` creados
- [x] Infra probada con 4 unit + 3 E2E pasando
- [x] **Fase A completa** — seed idempotente (commit `e47574f` + `6a9cc40`)
- [x] **Fase B parcial** — 4 E2E de flujos (commit `6a9cc40`). Flujo 2 (producción) defer por falta de menús/recetas en seed.
- [x] **Fase C completa** — 9 tests RLS cierran Codex (commit `5627868`)
- [x] **Fase E completa** — CI GitHub Actions (archivo `.github/workflows/ci.yml`)
- [ ] `@vitest/coverage-v8` (para Fase D cuando se haga extract oportunista)
- [x] `wait-on` dev dep (para CI E2E)

## Estado actual (2026-04-15)

- **4 unit tests** (`src/lib/utils.test.ts`) — pasan en 1.5s
- **16 E2E tests** — pasan en 21.3s:
  - 3 smoke (login + regresión ISSUE-001 escandallo + ISSUE-005 BEO)
  - 4 flujos (1 evento draft→pending, 3 PR create, 4 waste, 5 label)
  - 9 RLS (3 credentials + 4 sync auth + 2 whitelist/config)
- **CI** listo en `.github/workflows/ci.yml` con 4 jobs: lint-typecheck, test-unit, build, test-e2e (este último gated por `vars.E2E_ENABLED == 'true'` hasta que Israel configure secrets en GitHub)

## Acciones manuales pendientes para activar CI completo

En GitHub → Settings del repo `rai1001/ChefOsv2`:

1. **Secrets** (Settings → Secrets and variables → Actions → New repository secret):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (rotar primero, ver alerta de 2026-04-15)

2. **Variable** (misma sección → Variables):
   - `E2E_ENABLED = true` (activa el job test-e2e)

3. **Branch protection** (Settings → Branches → main → Branch protection rule):
   - Require status checks to pass: `lint-typecheck`, `test-unit`, `build`, opcionalmente `test-e2e`

Hasta que esto esté hecho, el workflow correrá en cada push pero test-e2e se saltará.

---

## Enlaces

- Estado actual: `docs/TESTING.md`
- Estrategia original (desfasada, mantener como referencia): `docs/TESTING_STRATEGY.md`
- Plan de CI (sin ejecutar): `docs/CI_RULES.md`, `docs/GITHUB_ACTIONS_CI_YAML.md`
- Audits Codex que justifican Fase C: commits `f7a5bad` (00028) y `789354b` (00029)
