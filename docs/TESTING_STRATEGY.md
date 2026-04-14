
# Testing Strategy (>=90%)

## Herramientas
- Unit/Integration: Vitest
- E2E: Playwright
- Validación: Zod (contracts)

## Cobertura
- Objetivo: >= 90% en packages/domain y packages/application.
- UI: tests de componentes/acciones críticas, sin obsesión por 90% UI.

## Flujos E2E mínimos
1) Login -> crear evento -> confirmar
2) Evento confirmado -> crear orden producción -> marcar done
3) Crear pedido -> aprobar -> recibir parcial -> inventario actualizado
4) Registrar merma -> aparece en dashboard
5) Crear preparación (etiqueta) -> trazabilidad visible

## Regla
Ninguna tarea se cierra sin tests relevantes.
