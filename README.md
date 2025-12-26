# CulinaryOs v2.0

SaaS de gestión para cocinas profesionales con arquitectura limpia y tecnología moderna.

## Descripción

CulinaryOs v2.0 es una reescritura completa desde cero del sistema de gestión para cocinas profesionales. Implementa Clean Architecture, patrones modernos y herramientas de última generación para ofrecer una solución escalable y mantenible.

## Funcionalidades Core

1. **Gestión de Inventario FIFO** - Trazabilidad de lotes con control de caducidad
2. **Fichas Técnicas Versionadas** - Cálculo de costos con historial completo
3. **Compras Automáticas** - Generación basada en demanda predecible
4. **HACCP Digital** - Control de calidad con alertas críticas
5. **Producción Kanban** - Scheduling inteligente de producción
6. **Analytics & Menu Engineering** - Análisis con Matriz de Boston
7. **Integración de IA (Gemini 2.0)** - Escaneo de facturas, BEO, Zero Waste Engine

## Stack Tecnológico

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Functions, Storage)
- **Estado**: Zustand con arquitectura modular
- **IA**: Gemini 2.0 Flash (Firebase AI SDK)
- **Testing**: Vitest + Playwright + Testing Library
- **Monorepo**: pnpm workspaces

## Estructura del Proyecto

```
CulinaryOs-v2/
├── packages/
│   ├── core/          # Domain entities, use cases, interfaces
│   ├── web/           # React web application
│   ├── functions/     # Firebase Cloud Functions
│   ├── ui/            # Design system components
│   └── e2e/           # End-to-end tests
├── docs/              # Documentation
└── firebase/          # Firebase configuration
```

## Primeros Pasos

### Prerrequisitos

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Firebase CLI

### Instalación

```bash
# Instalar dependencias
pnpm install

# Copiar variables de entorno
cp packages/web/.env.example packages/web/.env

# Iniciar Firebase Emulators
pnpm emulators

# En otra terminal, iniciar dev server
pnpm dev
```

### Scripts Disponibles

- `pnpm dev` - Inicia el servidor de desarrollo
- `pnpm build` - Compila todos los packages
- `pnpm test` - Ejecuta tests unitarios
- `pnpm test:e2e` - Ejecuta tests E2E
- `pnpm lint` - Ejecuta el linter
- `pnpm format` - Formatea el código
- `pnpm storybook` - Inicia Storybook
- `pnpm emulators` - Inicia Firebase Emulators

## Arquitectura

CulinaryOs v2.0 sigue los principios de Clean Architecture:

- **Domain Layer**: Entidades de negocio y value objects
- **Application Layer**: Use cases y lógica de aplicación
- **Infrastructure Layer**: Implementaciones de Firebase, Gemini, etc.
- **Presentation Layer**: Componentes React y UI

Ver [ARCHITECTURE.md](docs/ARCHITECTURE.md) para más detalles.

## Testing

El proyecto mantiene >80% de cobertura de código:

```bash
# Tests unitarios
pnpm test

# Tests con coverage
pnpm test -- --coverage

# Tests E2E
pnpm test:e2e

# Tests E2E en modo UI
pnpm --filter @culinaryos/e2e test:ui
```

## Estándares de Código

- TypeScript strict mode
- ESLint con reglas estrictas
- Prettier para formateo
- Conventional Commits
- Pre-commit hooks con Husky

## Contribuir

1. Crear una rama desde `main`
2. Hacer cambios siguiendo los estándares
3. Asegurar que los tests pasen
4. Crear un Pull Request

## Licencia

Propietario - Todos los derechos reservados

## Contacto

Para más información, consulta la documentación en `docs/`.
