# ADR-001: Monorepo Structure

**Status**: Accepted
**Date**: 2025-12-25
**Decision Makers**: Development Team

## Context

Necesitamos decidir cómo organizar el código del proyecto CulinaryOs v2.0, considerando que tenemos múltiples packages relacionados (web app, functions, UI components, core domain).

## Decision

Adoptamos una estructura de monorepo usando pnpm workspaces con los siguientes packages:

- `@culinaryos/core` - Domain entities, interfaces, use cases
- `@culinaryos/web` - React web application
- `@culinaryos/functions` - Firebase Cloud Functions
- `@culinaryos/ui` - Design system components
- `@culinaryos/e2e` - End-to-end tests

## Rationale

### Ventajas del Monorepo:

1. **Code Sharing Simplificado**: Los packages pueden importar código entre sí sin necesidad de publicar a npm
2. **Refactorings Atómicos**: Cambios que afectan múltiples packages se hacen en un solo commit
3. **Dependency Management**: Una sola versión de dependencias compartidas
4. **Tooling Compartido**: ESLint, Prettier, TypeScript configs compartidos
5. **Testing Integrado**: Fácil ejecutar tests de todos los packages

### Ventajas de pnpm:

1. **Espacio en Disco**: Usa hard links para compartir dependencias
2. **Velocidad**: Instalación más rápida que npm/yarn
3. **Strict Mode**: No permite acceder a dependencias no declaradas
4. **Workspaces Nativos**: Soporte de primera clase para monorepos

## Consequences

### Positivas:

- Desarrollo más rápido al compartir código fácilmente
- Sincronización garantizada de versiones
- Setup de CI/CD simplificado
- Mejor DX (Developer Experience)

### Negativas:

- Build times pueden aumentar si no se usa caché correctamente
- Requiere discipline para no crear dependencias circulares
- Todos los developers necesitan instalar pnpm

## Alternatives Considered

1. **Multiple Repos**: Rechazado por complejidad de sincronización y overhead de publicación
2. **npm workspaces**: Rechazado por menor performance que pnpm
3. **yarn workspaces**: Rechazado por issues de compatibilidad y performance

## Implementation Notes

- Usar `workspace:*` protocol para dependencias internas
- Configurar `tsconfig.json` con project references
- Usar scripts en root para ejecutar comandos en todos los packages
