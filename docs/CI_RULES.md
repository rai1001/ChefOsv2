
# CI Rules

## Checks obligatorios
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm test:coverage (threshold >= 90% donde aplique)
- pnpm e2e (mínimo en main/release)

## Bloqueos
No se permite merge si falla cualquiera de los checks anteriores.
