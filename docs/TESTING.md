# Testing (objetivo >= 90%)

## Niveles
- Unit: reglas de dominio, helpers, validaciones Zod
- Integration: repositorios/adapters (mock Supabase)
- E2E: Playwright (flujos críticos)

## Flujos críticos
- Auth + RLS básico
- CRUD Eventos
- Generación de producción desde evento
- Creación/recepción de pedido (parcial y completo)
- Ajuste de inventario + merma

## CI (futuro)
- ejecutar: lint, typecheck, test, e2e
