
# AUTOPILOT (Plan ejecutable)

## Scripts obligatorios (pnpm)
- pnpm dev
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm test:coverage
- pnpm e2e
- pnpm build

## Orden de ejecución
1) tasks/0000_BOOTSTRAP.md
2) tasks/0001_REPO_TURBOREPO.md
3) ... secuencial hasta tasks/0020_RELEASE.md

## Regla de progreso
Después de cada tarea:
- ejecutar lint/typecheck/test
- si falla, reparar antes de continuar

## Anti-deriva
Si una tarea necesita algo no especificado:
- documentar en DECISIONS.md
- implementar lo mínimo viable
