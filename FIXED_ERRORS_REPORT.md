# Informe de Errores Corregidos - ChefOS V2

Este documento detalla los problemas técnicos resueltos en esta actualización para estabilizar el despliegue y la construcción del proyecto.

## 1. Error de Firma en `firestoreService` (Frontend)

**Problema:**
Las llamadas a `firestoreService.query` fallaban en tiempo de compilación debido a un cambio reciente en la firma del método `queryDocuments`, que ahora requiere un segundo argumento `options` (ej: `{ bypassCache: boolean }`).

**Corrección:**

- Se actualizaron todas las llamadas en los servicios y adaptadores para incluir el objeto de opciones vacío `{}` o la configuración requerida.
- Archivos afectados: `fichasTecnicasService.ts`, `pedidosService.ts`, `recetaToFichaService.ts`, `costosService.ts`, `CoreIngredientRepositoryAdapter.ts`, etc.

## 2. Resolución de Módulos en Monorepo

**Problema:**
El paquete `packages/web` no podía resolver correctamente las importaciones desde `packages/core` debido a una configuración restrictiva en `tsconfig.json`.

**Corrección:**

- **`tsconfig.base.json`**: Se eliminó `rootDir` para permitir flexibilidad en los sub-paquetes.
- **`packages/web/tsconfig.json`**:
  - Se ajustó `baseUrl` a `.` y `rootDir` a `./src`.
  - Se corrigieron los `paths` para apuntar a la raíz del paquete core (`../core`) en lugar de a sus fuentes (`../core/src`), permitiendo el uso de los artefactos compilados y definiciones de tipos (`d.ts`).
- Se estandarizaron las importaciones en `RecipeAdapter.ts` y otros archivos para usar el punto de entrada principal `@culinaryos/core`.

## 3. Configuración Regional de Cloud Functions (Backend)

**Problema:**
El despliegue en Firebase fallaba o generaba advertencias de "funciones faltantes" porque algunos schedulers estaban configurados hardcoded en `europe-west1` o sin región explícita, mientras que el proyecto global usa `europe-southwest1`.

**Corrección:**

- Se estableció explícitamente `region: 'europe-southwest1'` en todos los archivos de tareas programadas.
- Archivos afectados: `autoPurchaseScheduler.ts`, `budgetScheduler.ts`, `analyticsScheduler.ts`, `haccpScheduler.ts`.
- Se eliminaron las funciones obsoletas desplegadas en `europe-west1`.

## Estado Final

- **Build Frontend:** ✅ Exitoso (`npm run build` en `packages/web`)
- **Build Backend:** ✅ Exitoso (`npm run build` en `packages/functions`)
- **Despliegue Firebase:** ✅ Sincronizado en `europe-southwest1`
