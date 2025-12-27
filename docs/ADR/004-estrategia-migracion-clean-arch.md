# ADR-004: Estrategia de Migración a Clean Architecture

**Status**: Accepted
**Date**: 2025-12-27
**Decision Makers**: Development Team

## Context

El proyecto CulinaryOs v2.0 tiene actualmente dos implementaciones incompatibles del dominio:

1. **`@culinaryos/core`**: Implementación con Clean Architecture usando Value Objects (Money, Quantity)
2. **`packages/web`**: Implementación legacy usando clases anémicas y primitivos

### Problemas Identificados:

- Core tiene 4 tests fallando porque no se usa en producción
- Web bypasea completamente el core package
- Duplicación masiva de entidades e interfaces
- Imposibilidad de mantener ambas arquitecturas simultáneamente
- Core no se compila (0 archivos en dist/)
- Coverage real ~5-10% vs objetivo >80%

## Decision

**Adoptamos estrategia de migración gradual pragmática a Clean Architecture completa**

### Roadmap de Migración (12 semanas):

#### **Fase 1: Estabilización (Semanas 1-2)**
- ✅ Fix 4 tests fallando en core
- ✅ Setup CI/CD básico
- ✅ Core package compila correctamente
- ✅ Fix bugs críticos (race conditions, hooks)

#### **Fase 2: Consolidación (Semanas 3-4)**
- ✅ Unificar interfaces (core gana, web depreca)
- ✅ Migrar Batch module completamente (ya 80% hecho)
- ✅ Crear adapters para compatibilidad temporal
- ✅ Nuevas features SOLO en core

#### **Fase 3: Migración Incremental (Semanas 5-8)**
- ✅ Migrar Ingredient entity a core
- ✅ Migrar todos los use cases a core
- ✅ Migrar repositories a implementar interfaces core
- ✅ Value Objects (Money, Quantity) usados everywhere

#### **Fase 4: Cleanup (Semanas 9-12)**
- ✅ Eliminar código legacy de web/domain
- ✅ Eliminar adapters temporales
- ✅ 100% código usa core
- ✅ Coverage >80% en core/inventario

## Principles

### 1. Regla "Core-First"
**A partir de HOY:**
- ❌ NO crear nuevas entidades en web/domain
- ❌ NO modificar entidades legacy
- ✅ Nuevas features usan core exclusivamente
- ✅ Bug fixes en legacy se migran a core inmediatamente

### 2. Compatibilidad Temporal
**Durante migración (semanas 3-8):**
- ✅ Mantener adapters `LegacyIngredient ↔ CoreIngredient`
- ✅ Repositories retornan tipos core, adapters convierten
- ✅ UI puede recibir ambos tipos temporalmente

### 3. Testing Obligatorio
**Todo código nuevo:**
- ✅ Tests unitarios (core domain >80%)
- ✅ Tests de integración (repositories)
- ✅ E2E para flows críticos
- ❌ No merge sin tests pasando en CI

### 4. No Rewrites Masivos
- ❌ NO reescribir todo de una vez
- ✅ Migración file-by-file, feature-by-feature
- ✅ Always deployable
- ✅ Rollback plan en cada paso

## Rationale

### ¿Por qué Clean Architecture?
1. **Testabilidad**: Core domain es 100% testeable sin Firebase/React
2. **Mantenibilidad**: Cambios localizados, bajo acoplamiento
3. **Escalabilidad**: Fácil agregar mobile app, CLI, etc.
4. **Correctness**: Value Objects previenen bugs (negative stock, currency mismatch)

### ¿Por qué NO reset completo?
1. Core tiene implementaciones sólidas (Money, Quantity, Batch)
2. ADR-003 promete Clean Architecture (sería renunciar)
3. Legacy web funciona (no está roto, solo mal arquitecturado)
4. Migración gradual es menos riesgosa

### ¿Por qué 12 semanas?
- 2 semanas: estabilización crítica
- 4 semanas: migración core features (Batch, Ingredient)
- 4 semanas: migración use cases y repositories
- 2 semanas: cleanup y optimización

## Implementation Details

### Build System
```typescript
// vite.config.ts - ANTES (incorrecto)
alias: {
  '@culinaryos/core': path.resolve(__dirname, '../core/src')  // ❌ source direct
}

// DESPUÉS (correcto)
alias: {
  '@culinaryos/core': path.resolve(__dirname, '../core/dist')  // ✅ compiled
}
```

### Adapter Pattern (Temporal)
```typescript
// packages/web/src/adapters/IngredientAdapter.ts
export function toLegacy(core: CoreIngredient): LegacyIngredient {
  return new LegacyIngredient(
    core.id,
    core.name,
    core.unit,
    core.lastCost?.amount ?? 0,  // Money → number
    // ...
  );
}

export function toCore(legacy: LegacyIngredient): CoreIngredient {
  return {
    id: legacy.id,
    name: legacy.name,
    lastCost: new Money(legacy.costPerUnit),  // number → Money
    currentStock: new Quantity(legacy.stock, new Unit(legacy.unit)),
    // ...
  };
}
```

### Repository Migration
```typescript
// ANTES: web/infrastructure/repositories/FirebaseIngredientRepository.ts
class FirebaseIngredientRepository implements IIngredientRepository {
  async getIngredients(outletId: string): Promise<LegacyIngredient[]> {
    // ...
  }
}

// DESPUÉS: web/infrastructure/firebase/repositories/FirestoreIngredientRepository.ts
class FirestoreIngredientRepository implements ICoreIngredientRepository {
  async findByOutletId(outletId: string): Promise<CoreIngredient[]> {
    const docs = await getDocs(collection(db, 'ingredients'));
    return docs.map(doc => toDomain(doc));  // Firestore → Core
  }
}
```

### Use Case Migration
```typescript
// ANTES: web/application/use-cases/GetIngredientsUseCase.ts
export class GetIngredientsUseCase {
  execute(outletId: string): Promise<LegacyIngredient[]> {
    return this.repository.getIngredients(outletId);
  }
}

// DESPUÉS: Usar directamente core use case
import { GetIngredientsByOutletUseCase } from '@culinaryos/core';

// En DI container
container.bind(TYPES.GetIngredientsUseCase)
  .toDynamicValue(() => new GetIngredientsByOutletUseCase(
    container.get(TYPES.IngredientRepository)
  ));
```

## Consequences

### Positivas
1. **Arquitectura consistente** en 12 semanas
2. **Testabilidad máxima** (>80% coverage alcanzable)
3. **Bugs previos desaparecen** (race conditions, type safety)
4. **Foundation sólida** para escalar (mobile, CLI, etc.)
5. **Código más simple** (sin duplicación)

### Negativas
1. **Velocity reducida** ~30% durante 8 semanas
2. **Riesgo de regression** durante migración
3. **Esfuerzo significativo** (12 semanas full-time)
4. **Requiere disciplina** (no tocar legacy)

### Mitigación de Riesgos
1. **Feature flags**: rollback fácil si migración falla
2. **Adapters**: compatibilidad durante transición
3. **Tests exhaustivos**: prevenir regressions
4. **CI/CD**: detección temprana de issues
5. **Rollback plan**: en cada milestone

## Success Metrics

### Semana 2:
- [ ] ✅ Core tests: 4/4 passing
- [ ] ✅ CI/CD: verde consistentemente
- [ ] ✅ Build: core compila a dist/

### Semana 4:
- [ ] ✅ Batch module: 100% en core
- [ ] ✅ Interfaces: unificadas
- [ ] ✅ Coverage: >40% inventario

### Semana 8:
- [ ] ✅ Ingredient: 100% en core
- [ ] ✅ Use cases: todos en core
- [ ] ✅ Coverage: >70% inventario

### Semana 12:
- [ ] ✅ Legacy code: 0 líneas en web/domain
- [ ] ✅ Coverage: >80% inventario
- [ ] ✅ Performance: sin degradación
- [ ] ✅ Bugs: 0 críticos

## Alternatives Considered

### Opción A: Reset Completo (Eliminar Core)
**Rechazada porque:**
- Pierde implementaciones sólidas (Money, Quantity)
- Contradice ADR-003
- Deuda técnica permanece

### Opción B: Mantener Dualidad
**Rechazada porque:**
- Insostenible long-term
- Confusión para developers
- Duplicación masiva

### Opción C: Big Bang Rewrite
**Rechazada porque:**
- Alto riesgo
- No deployable durante semanas
- Imposible rollback

## References

- ADR-003: Clean Architecture Pattern
- [Strangler Fig Pattern - Martin Fowler](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Parallel Change Refactoring](https://martinfowler.com/bliki/ParallelChange.html)

## Appendix: Migration Checklist

### Entities
- [x] Batch → Core ✅ (80% done, needs cleanup)
- [ ] Ingredient → Core (week 5-6)
- [ ] FichaTecnica → Core (week 7)
- [ ] Event → Core (week 8)

### Value Objects
- [x] Money ✅ (exists, needs adoption)
- [x] Quantity ✅ (exists, needs adoption)
- [x] Unit ✅ (exists, needs adoption)

### Repositories
- [x] IBatchRepository ✅ (unified)
- [ ] IIngredientRepository (week 3-4)
- [ ] IFichaTecnicaRepository (week 7)

### Use Cases
- [x] AddBatchUseCase ✅ (core)
- [x] ConsumeFIFOUseCase ✅ (core)
- [ ] GetIngredientsUseCase (week 5)
- [ ] CreateIngredientUseCase (week 5)
- [ ] UpdateIngredientUseCase (week 6)

---

**Decision Date**: 2025-12-27
**Review Date**: 2026-03-27 (12 weeks)
**Status**: ✅ Accepted - Execution starts NOW
