# ADR-003: Clean Architecture Pattern

**Status**: Accepted
**Date**: 2025-12-25
**Decision Makers**: Development Team

## Context

Necesitamos una arquitectura que permita:

- Testabilidad máxima (>80% coverage)
- Independencia de frameworks
- Separación clara de concerns
- Escalabilidad del codebase
- Facilidad de onboarding de nuevos developers

## Decision

Adoptamos Clean Architecture (también conocida como Arquitectura Hexagonal o Ports & Adapters) con las siguientes capas:

1. **Domain Layer** - Lógica de negocio pura
2. **Application Layer** - Orchestration y use cases
3. **Infrastructure Layer** - Implementaciones concretas
4. **Presentation Layer** - UI y componentes React

## Rationale

### Principios Clave:

1. **Dependency Rule**: Las dependencias apuntan hacia el dominio

   ```
   Presentation → Application → Domain ← Infrastructure
   ```

2. **Separation of Concerns**: Cada layer tiene una responsabilidad única

3. **Testability**: Domain y Application layers son 100% testables sin UI o DB

4. **Framework Independence**: Podemos cambiar React o Firebase sin tocar la lógica de negocio

### Domain Layer (`@culinaryos/core`):

- Entities (Ingredient, FichaTecnica, Batch)
- Value Objects (Money, Quantity, Unit)
- Interfaces (IIngredientRepository, IAIService)
- Use Cases (próxima fase)

**Reglas**:

- ❌ NO puede importar código de otras layers
- ❌ NO puede depender de frameworks
- ✅ Debe ser puro TypeScript

### Infrastructure Layer:

- FirestoreIngredientRepository (implementa IIngredientRepository)
- GeminiAIService (implementa IAIService)
- Configuración de Firebase

**Reglas**:

- ✅ Implementa interfaces del Domain
- ✅ Depende de frameworks externos
- ❌ NO contiene lógica de negocio

### Application Layer:

- DI Container
- React Providers
- Custom Hooks
- Zustand Stores

**Reglas**:

- ✅ Orquesta use cases
- ✅ Inyecta dependencias
- ❌ NO contiene lógica de negocio

### Presentation Layer:

- Componentes React
- Pages
- Layouts

**Reglas**:

- ✅ Solo UI concerns
- ✅ Usa Application Layer
- ❌ NO llama directamente a Infrastructure

## Consequences

### Positivas:

1. **Testabilidad**: >80% coverage alcanzable
2. **Mantenibilidad**: Cambios localizados, bajo acoplamiento
3. **Escalabilidad**: Fácil agregar features sin romper existentes
4. **Onboarding**: Arquitectura clara y documentada
5. **Reusabilidad**: Domain layer reutilizable en mobile, CLI, etc.

### Negativas:

1. **Boilerplate**: Más archivos e interfaces
2. **Learning Curve**: Developers deben entender la arquitectura
3. **Over-engineering**: Para features muy simples puede ser overkill

## Mitigation Strategies

1. **Boilerplate**: Aceptable para proyecto de largo plazo
2. **Learning Curve**: Documentación clara + ADRs + diagramas
3. **Over-engineering**: Pragmatismo - no todo requiere use cases

## Alternatives Considered

1. **Feature Slices**: Más simple, pero menos separación de concerns
2. **MVC**: Demasiado simple para la complejidad del dominio
3. **DDD Full**: Demasiado complejo para el scope actual

## Implementation Notes

- Usar Dependency Injection para todos los servicios
- Implementar interfaces (Ports) antes de implementaciones (Adapters)
- Tests unitarios para Domain y Application layers
- Integration tests para Infrastructure layer
- E2E tests para user journeys

## References

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture - Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
