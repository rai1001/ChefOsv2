# ADR-002: Firebase as Backend

**Status**: Accepted
**Date**: 2025-12-25
**Decision Makers**: Development Team

## Context

Necesitamos elegir un backend para CulinaryOs v2.0 que permita:

- Autenticación de usuarios
- Base de datos NoSQL con queries complejas
- Almacenamiento de archivos
- Cloud Functions para lógica backend
- Real-time updates
- Multi-tenancy robusto

## Decision

Adoptamos Firebase como plataforma backend completa, utilizando:

- **Firebase Auth** para autenticación
- **Firestore** como base de datos principal
- **Firebase Storage** para archivos
- **Cloud Functions** para backend logic
- **Realtime Database** para métricas hot (opcional)

## Rationale

### Ventajas de Firebase:

1. **Time to Market**: Setup rápido, menos boilerplate
2. **Escalabilidad Automática**: Firestore escala automáticamente
3. **Security Rules**: Validación a nivel de base de datos
4. **Emulators**: Excelente DX con emulators locales
5. **Ecosystem**: Integración con Gemini AI SDK
6. **Real-time**: Subscripciones en tiempo real out-of-the-box
7. **Hosting**: Hosting incluido para web app

### Multi-tenancy:

Firestore permite implementar multi-tenancy a nivel de collections:

```
/outlets/{outletId}/ingredients/{ingredientId}
/outlets/{outletId}/batches/{batchId}
```

Con Security Rules que validan acceso basado en `outletIds` del usuario.

### Cost Control:

- Firestore: Pay-per-operation (optimizable con caching)
- Functions: Solo paga por ejecución
- Storage: Solo paga por uso
- Emulators gratuitos para desarrollo

## Consequences

### Positivas:

- Desarrollo más rápido
- Menos infraestructura que mantener
- Mejor DX con emulators
- Security Rules como primera línea de defensa

### Negativas:

- Vendor lock-in con Firebase
- Costos pueden crecer con escala (mitigable con optimización)
- Queries limitadas vs SQL (mitigable con índices y desnormalización)
- Limits de Firestore (500 writes/sec por documento)

## Mitigation Strategies

1. **Vendor Lock-in**: Clean Architecture permite cambiar backend si es necesario
2. **Costos**: Implementar batched reads, caching, budgets y alertas
3. **Query Limits**: Usar índices compuestos y desnormalización parcial
4. **Write Limits**: Usar Cloud Functions para agregaciones

## Alternatives Considered

1. **PostgreSQL + Supabase**: Mayor flexibilidad SQL, pero más complejidad
2. **MongoDB Atlas**: Similar a Firestore, pero sin ecosystem Firebase
3. **Custom Backend (Node.js + Express)**: Control total, pero mucho más desarrollo

## Implementation Notes

- Usar Firebase Emulators para desarrollo local
- Implementar Security Rules desde día 1
- Documentar índices en `firestore.indexes.json`
- Monitorear costos con alertas automáticas
