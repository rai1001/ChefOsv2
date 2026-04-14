
# Definition of Done (Global)

## Para cada tarea
- Compila
- Lint OK
- Typecheck OK
- Tests OK
- Si toca DB: migración + RLS + policies + tests de acceso
- Si toca UI: responsive + loading/empty/error + accesibilidad básica
- Docs actualizados si cambian contratos/rutas/permisos

## Para módulo MVP
- CRUD mínimo + validaciones
- Estados (si aplica)
- Integración con flujo general (eventos internos)
- Al menos 1 test unit + 1 integration/e2e del flujo
- Si aplica multi-tenant/RLS: tests de scoping hotel_id y policies
