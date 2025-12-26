# Arquitectura de CulinaryOs v2.0

## Visión General

CulinaryOs v2.0 implementa Clean Architecture (también conocida como Arquitectura Hexagonal o Ports & Adapters) para lograr máxima separación de concerns, testabilidad e independencia de frameworks.

## Principios Fundamentales

1. **Independencia de Frameworks**: La lógica de negocio no depende de React, Firebase o ningún framework externo
2. **Testabilidad**: La lógica de negocio puede testearse sin UI, base de datos o servicios externos
3. **Independencia de UI**: La UI puede cambiarse sin afectar la lógica de negocio
4. **Independencia de Base de Datos**: Firestore puede reemplazarse sin cambiar la lógica de negocio
5. **Regla de Dependencia**: Las dependencias apuntan hacia adentro (hacia el dominio)

## Capas de la Arquitectura

```
┌─────────────────────────────────────────────┐
│         Presentation Layer (React)          │
│  Components, Pages, Layouts, Hooks, Stores  │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│          Application Layer (Use Cases)       │
│    Providers, DI Container, Orchestration    │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│       Domain Layer (Business Logic)         │
│  Entities, Value Objects, Interfaces (Ports) │
└─────────────────────────────────────────────┘
                     ↑
┌─────────────────────────────────────────────┐
│     Infrastructure Layer (Adapters)         │
│  Firebase, Gemini, External APIs, Storage   │
└─────────────────────────────────────────────┘
```

### 1. Domain Layer (`@culinaryos/core`)

**Responsabilidad**: Define el modelo de negocio puro, sin dependencias externas.

**Contenido**:

- **Entities**: Modelos de negocio (Ingredient, Batch, FichaTecnica, etc.)
- **Value Objects**: Money, Quantity, Unit (con lógica de conversión)
- **Interfaces**: Contratos para repositorios y servicios (Ports)
- **Use Cases**: Lógica de negocio (próxima fase)

**Reglas**:

- ❌ NO puede depender de ningún framework
- ❌ NO puede importar código de otras capas
- ✅ Debe ser puro TypeScript
- ✅ Todas las dependencias son inyectadas via interfaces

### 2. Infrastructure Layer (`packages/web/src/infrastructure`)

**Responsabilidad**: Implementa las interfaces definidas en el Domain Layer usando tecnologías concretas.

**Contenido**:

- **Firebase Repositories**: Implementaciones de `IIngredientRepository`, etc.
- **Gemini Service**: Implementación de `IAIService`
- **Storage Service**: Implementación de `IStorageService`
- **Resilience**: Circuit Breakers, Retry Policies

**Reglas**:

- ✅ Implementa interfaces del Domain Layer
- ✅ Depende de frameworks externos (Firebase, Gemini)
- ❌ NO contiene lógica de negocio

### 3. Application Layer (`packages/web/src/application`)

**Responsabilidad**: Orquesta el flujo de datos entre layers y maneja el estado de la aplicación.

**Contenido**:

- **DI Container**: Dependency Injection para servicios
- **Providers**: React Context providers
- **Hooks**: Custom hooks para acceso a servicios
- **Stores**: Zustand stores para estado global

**Reglas**:

- ✅ Usa Use Cases del Domain Layer
- ✅ Inyecta dependencias de Infrastructure Layer
- ❌ NO contiene lógica de negocio

### 4. Presentation Layer (`packages/web/src/presentation`)

**Responsabilidad**: UI y componentes React.

**Contenido**:

- **Components**: Atomic Design (atoms, molecules, organisms, templates)
- **Pages**: Páginas de rutas
- **Layouts**: Layouts compartidos

**Reglas**:

- ✅ Solo se comunica con Application Layer
- ❌ NO llama directamente a Infrastructure Layer
- ❌ NO contiene lógica de negocio

## Flujo de Datos

```
User Interaction
      ↓
[Component] → [Hook/Store] → [Use Case] → [Repository Interface]
                                                    ↓
                                          [Repository Implementation]
                                                    ↓
                                              [Firestore]
```

## Dependency Injection

Usamos un IoC Container simple para gestionar dependencias:

```typescript
// Registrar servicios (en bootstrap)
container.registerSingleton(
  TOKENS.INGREDIENT_REPOSITORY,
  () => new FirestoreIngredientRepository(db)
);

// Resolver servicios (en use cases o hooks)
const repo = container.resolve<IIngredientRepository>(TOKENS.INGREDIENT_REPOSITORY);
```

## Multi-tenancy

Implementado a nivel de Firestore Security Rules:

```
/outlets/{outletId}/ingredients/{ingredientId}
/outlets/{outletId}/batches/{batchId}
```

- Cada usuario tiene acceso solo a sus outlets via `outletIds` en su documento
- Todas las queries incluyen filtro por `outletId`
- Security Rules validan acceso en cada operación

## Testing Strategy

### Unit Tests (Vitest)

- Domain Layer: Entities, Value Objects, Use Cases
- Cobertura objetivo: >80%

### Integration Tests (Vitest + Firebase Emulator)

- Infrastructure Layer: Repositories con Firestore Emulator
- Application Layer: Hooks y Stores

### E2E Tests (Playwright)

- User journeys completos
- Critical paths (login, crear ingrediente, calcular ficha)

## Módulos

### Inventario FIFO

- Entities: `Ingredient`, `Batch`
- Use Cases: `AddBatchUseCase`, `ConsumeFIFOUseCase`, `CheckExpiryUseCase`
- Repository: `IIngredientRepository`, `IBatchRepository`

### Fichas Técnicas

- Entities: `FichaTecnica`, `RecipeIngredient`
- Value Objects: `Money`, `Quantity`, `Unit`
- Use Cases: `CalculateCostUseCase`, `CreateVersionUseCase`
- Repository: `IFichaTecnicaRepository`

### Compras Automáticas

- Entities: `PurchaseOrder`
- Use Cases: `GenerateAutoOrderUseCase`, `ApproveOrderUseCase`
- Repository: `IPurchaseOrderRepository`

### IA Integration

- Service: `IAIService` (Gemini)
- Features: Invoice Scanner, BEO Scanner, Zero Waste Engine
- Resilience: Circuit Breaker, Retry Policy, Cost Tracker

## Decisiones Arquitectónicas

Ver [ADR (Architecture Decision Records)](./ADR/) para decisiones técnicas importantes:

- [ADR-001: Monorepo Structure](./ADR/001-monorepo-structure.md)
- [ADR-002: Firebase Choice](./ADR/002-firebase-choice.md)
- [ADR-003: Clean Architecture](./ADR/003-clean-architecture.md)

## Próximos Pasos

- Fase 2: Implementar módulo de Inventario FIFO
- Fase 3: Implementar Fichas Técnicas y costos
- Fase 4: Integración de IA con Gemini
- Fase 5: Compras Automáticas
- Fase 6: HACCP Digital
- Fase 7: Analytics
