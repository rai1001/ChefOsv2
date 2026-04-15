# ChefOS v2

> Control operativo de cocina multi-servicio para hoteles, catering y eventos.

Dashboard dark-first para jefes de cocina en turnos de 16 horas. Cubre eventos, recetas, compras, inventario, producción, compliance APPCC, RRHH y notificaciones. Multi-tenant sobre Supabase.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript strict |
| Estilos | Tailwind CSS 4 (`@theme`) · utility classes DS en [`src/app/globals.css`](src/app/globals.css) |
| Backend | Supabase (PostgreSQL 17, RLS, RPCs, Edge Functions) |
| Estado | TanStack Query 5 · React Hook Form + Zod v4 |
| Tests | Vitest (unit) · Playwright (E2E) |

## Getting started

```bash
git clone <repo>
cd ChefOsv2
npm install
cp .env.example .env.local   # rellena con credenciales Supabase
npm run dev                   # arranca en http://localhost:3000
```

**Usuario de test** (seed en Supabase local/dev):

```
Email:    admin@chefos.test
Password: Test1234!
Hotel ID: ec079cf6-13b1-4be5-9e6f-62c8f604cb1e
```

## Referencias del Design System

| Qué | Dónde |
|---|---|
| **Referencia viva (showcase)** | [`http://localhost:3000/design-system`](src/app/design-system/page.tsx) — ábrelo en dev, es el primer sitio al que ir |
| Spec del DS (tokens, tipografía, reglas) | [`DESIGN.md`](DESIGN.md) |
| Plan + tracker del rollout (F0–F5) | [`docs/DESIGN_MIGRATION.md`](docs/DESIGN_MIGRATION.md) |
| Cookbook (recetas copy-paste) | [`docs/DESIGN_COOKBOOK.md`](docs/DESIGN_COOKBOOK.md) |

**Al empezar una tarea UI:** abre `/design-system` → copia el patrón que necesitas → consulta el cookbook si es un caso nuevo.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Next dev server con turbopack |
| `npm run build` | Build producción |
| `npm run typecheck` | TypeScript strict check — 0 errores esperado |
| `npm run lint` | ESLint — 0 errores, warnings preexistentes tolerados |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E (requiere servidor dev + seed) |
| `npm run db:seed` | Seed idempotente del hotel de test |
| `npx supabase db query --linked < migration.sql` | Aplicar migración |

## Estructura

```
src/
  app/
    (auth)/          # login, signup, onboarding, reset-password
    (dashboard)/     # rutas protegidas del producto
    design-system/   # referencia viva del DS
    globals.css      # tokens @theme + utility classes DS
    layout.tsx       # root layout + Google Fonts
  features/
    identity/        # multi-tenant, memberships, RBAC
    commercial/      # eventos, BEO, clientes
    recipes/         # recetas, menús, escandallos
    catalog/         # productos, proveedores
    procurement/     # PRs, POs, GRs
    inventory/       # stock, lotes, conteos, forensics, mermas
    production/      # planes, workflows, KDS, mise en place
    reporting/       # dashboard, alertas, KPIs
    compliance/      # APPCC, temperaturas, etiquetado, trazabilidad
    automation/      # jobs queue, worker
    notifications/   # in-app + email
    integrations/    # PMS/POS (Mews, OPERA, Lightspeed...)
    hr/              # personal, turnos, cuadrantes
    agents/          # 10 agentes autónomos (sugerencias)
  components/
    shell/           # sidebar, topbar, notification-bell
supabase/
  migrations/        # 00001-00033 SQL numeradas
docs/                # PRD, módulos, testing, design migration
```

Cada feature sigue el mismo patrón: `components/ hooks/ schemas/ services/ types/ utils/`.

## Principios

- **Database-first.** Reglas de negocio en RPCs Postgres con `SECURITY DEFINER` + `search_path=public`.
- **Multi-tenant vía RLS.** Toda tabla tiene `hotel_id`, aislada con `is_member_of(hotel_id)` y `get_member_role(hotel_id)`.
- **State machines en DB**, no en frontend.
- **Domain events.** Toda mutación emite evento (20 contratos tipados).
- **Audit trail inmutable.**
- **Módulos no se llaman entre sí** — emiten eventos, otros reaccionan.
- **Asistido, NO autónomo.** Los agentes sugieren, el usuario confirma.

## Contribuir

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md) (pendiente).

Convención de commits tipo Conventional Commits: `feat(scope):`, `fix(scope):`, `docs(scope):`, `test(scope):`, `chore(scope):`. Scopes vistos: `design`, `security`, `codex`, `test`, `ci`.

## Estado

Ver [`docs/ESTADO_PLAN_COMPLETADO.md`](docs/ESTADO_PLAN_COMPLETADO.md) para el estado detallado del PRD y roadmap.

**Sesión actual (15, 2026-04-15):** Design System completo (F0–F5). Todas las pantallas operativas usando los tokens + utility classes del DS.
