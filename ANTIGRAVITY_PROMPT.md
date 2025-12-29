# Prompt para Antigravity - ChefOsv2 Import System Unification

## Contexto del Proyecto

**ChefOsv2** es un sistema de gestión para restaurantes construido con:
- **Frontend**: React + TypeScript (packages/web)
- **Backend**: Firebase Cloud Functions v2 (packages/functions)
- **Base de datos**: Firestore
- **Arquitectura**: Clean Architecture (Domain, Application, Infrastructure, Presentation)

### Repositorio
- **URL**: https://github.com/rai1001/ChefOsv2
- **Branch principal**: `main`
- **Branch de trabajo**: `claude/import-unification-{sessionId}`

---

## Reglas de Commit

### Formato de Commits
```
<tipo>(<scope>): <descripción corta>

<cuerpo opcional explicando el WHY, no el WHAT>

<footer opcional con breaking changes>
```

### Tipos Permitidos
- **feat**: Nueva funcionalidad
- **fix**: Corrección de bug
- **refactor**: Cambio de código sin afectar funcionalidad
- **test**: Añadir o modificar tests
- **docs**: Solo documentación
- **chore**: Tareas de mantenimiento
- **perf**: Mejoras de performance

### Ejemplos Válidos
```bash
feat(imports): add unified type system for all import types

refactor(imports): migrate DataImportModal to UniversalImporter
- Remove deprecated parseWorkbook usage
- Consolidate all Excel parsing to Cloud Functions
- Add proper error handling

fix(imports): correct ingredient matching in invoice scanner

test(imports): add unit tests for import type validation
```

### Reglas Estrictas
1. ❌ **NUNCA** hacer `git commit --amend` a menos que sea el último commit tuyo
2. ❌ **NUNCA** hacer `git push --force` a main/master
3. ✅ **SIEMPRE** verificar que los tests pasen antes de commit
4. ✅ **SIEMPRE** hacer `git status` y `git diff` antes de commit
5. ✅ **SIEMPRE** commitear archivos relacionados juntos

---

## Reglas de Testing

### Antes de Commitear
```bash
# 1. Ejecutar linter
npm run lint

# 2. Ejecutar tests (si existen)
npm test

# 3. Compilar TypeScript
npm run build
```

### Estándares de Testing
1. **Tests unitarios** para funciones puras (utils, parsers)
2. **Tests de integración** para Cloud Functions
3. **Cobertura mínima**: 70% en código crítico (parsers, validators)

### Ejemplo de Test Esperado
```typescript
// packages/functions/src/__tests__/importTypes.test.ts
import { validateImportType, ImportType } from '../types/import';

describe('Import Type Validation', () => {
  it('should validate all supported import types', () => {
    const validTypes: ImportType[] = [
      'ingredient', 'recipe', 'menu', 'event',
      'staff', 'supplier', 'inventory', 'haccp', 'occupancy'
    ];

    validTypes.forEach(type => {
      expect(validateImportType(type)).toBe(true);
    });
  });

  it('should reject invalid import types', () => {
    expect(validateImportType('invalid' as any)).toBe(false);
  });
});
```

---

## Arquitectura del Proyecto

### Clean Architecture Layers

```
packages/
├── web/                          # Presentation Layer
│   └── src/
│       ├── domain/              # Entities & Business Rules
│       ├── application/         # Use Cases
│       ├── infrastructure/      # External Services
│       └── presentation/        # UI Components
│           ├── components/
│           │   ├── common/      # Shared components
│           │   └── imports/     # Import-specific components
│           └── pages/
└── functions/                    # Backend
    └── src/
        ├── triggers/            # Cloud Functions
        ├── scanners/            # OCR & Document Processing
        ├── utils/               # Shared utilities
        └── types/               # TypeScript definitions
```

### Principios Arquitectónicos

1. **Separación de Responsabilidades**
   - UI solo maneja presentación y eventos de usuario
   - Lógica de negocio en Cloud Functions
   - Parsers y validación en backend

2. **Dependency Inversion**
   - Frontend depende de interfaces, no implementaciones
   - Cloud Functions son la única fuente de verdad para procesamiento

3. **Single Responsibility**
   - Un componente = Una responsabilidad
   - Un Cloud Function = Una operación

---

## Estado Actual del Sistema de Imports

### Análisis de Componentes Existentes

#### 1. UniversalImporter (MODERNO) ✅
**Ubicación**: `packages/web/src/presentation/components/common/UniversalImporter.tsx`

**Características**:
- Usa Cloud Functions para procesamiento
- Soporta 2 modos: Smart AI, Structured Excel
- Tipos soportados: ingredient, recipe, staff, supplier, occupancy
- Arquitectura correcta (UI → Cloud Function → Firestore)

**Usado en**:
- IngredientsPage
- RecipesPage
- StaffPage
- SupplierPage

**Estado**: ✅ MANTENER Y EXPANDIR

#### 2. DataImportModal (LEGACY) ⚠️
**Ubicación**: `packages/web/src/presentation/components/common/DataImportModal.tsx`

**Problemas**:
- Usa funciones DEPRECATED: `parseWorkbook()`
- Procesamiento en cliente (debería ser Cloud Function)
- No usa arquitectura moderna

**Usado en**:
- HACCPPage
- InventoryPage
- MenuPage

**Estado**: ⚠️ MIGRAR A UniversalImporter

#### 3. EventImportModal (COMPLEJO) 🔧
**Ubicación**: `packages/web/src/presentation/components/events/EventImportModal.tsx`

**Características**:
- 743 líneas (muy complejo)
- 5 modos: excel, matrix, scan, ics, sync
- Lógica específica de eventos (no reutilizable)
- Usa XLSX directamente en cliente

**Estado**: 🔧 REFACTORIZAR (mantener lógica específica, delegar parsing)

#### 4. ARCHIVO DUPLICADO ❌
**Ubicación**: `packages/web/src/presentation/components/imports/UniversalImporter.tsx`

**Problema**: Archivo duplicado con contenido diferente al de common/

**Estado**: ❌ ELIMINAR

---

## Plan de Unificación (5 Fases)

### FASE 1: Cleanup y Tipos Unificados

#### 1.1 Crear Sistema de Tipos Centralizado

**Archivo**: `packages/web/src/types/import.ts`

```typescript
/**
 * Unified Import Type System
 * Defines all possible import types across ChefOsv2
 */

export type ImportType =
  | 'ingredient'
  | 'recipe'
  | 'menu'
  | 'event'
  | 'staff'
  | 'supplier'
  | 'inventory'
  | 'haccp'
  | 'occupancy';

export type ImportMode =
  | 'auto'      // Smart AI detection
  | 'excel'     // Structured Excel
  | 'ai'        // AI parsing (invoices, images)
  | 'ics'       // Calendar events
  | 'matrix';   // Matrix view for events

export interface IngestionItem {
  type: ImportType;
  data: Record<string, any>;
  confidence?: number;
  source?: string;
  metadata?: {
    fileName?: string;
    uploadDate?: string;
    processedBy?: string;
  };
}

export interface ImportResult {
  success: boolean;
  itemsProcessed: number;
  errors?: Array<{
    row?: number;
    field?: string;
    message: string;
  }>;
  data?: IngestionItem[];
}

export interface ImportOptions {
  type: ImportType;
  mode: ImportMode;
  dryRun?: boolean;
  skipValidation?: boolean;
  outletId: string;
}
```

#### 1.2 Eliminar Archivo Duplicado

```bash
# Verificar diferencias primero
git diff packages/web/src/presentation/components/common/UniversalImporter.tsx \
         packages/web/src/presentation/components/imports/UniversalImporter.tsx

# Eliminar duplicado
rm packages/web/src/presentation/components/imports/UniversalImporter.tsx

# Commit
git add -A
git commit -m "chore(imports): remove duplicate UniversalImporter file

The file in components/imports/ was a duplicate with outdated
code. Keeping only the modern version in components/common/."
```

---

### FASE 2: Migrar DataImportModal

#### 2.1 Actualizar Páginas que Usan DataImportModal

**Archivos a modificar**:
- `packages/web/src/presentation/pages/HACCPPage.tsx`
- `packages/web/src/presentation/pages/InventoryPage.tsx`
- `packages/web/src/presentation/pages/MenuPage.tsx`

**Cambio necesario**:

```typescript
// ANTES (DEPRECATED)
import DataImportModal from '../components/common/DataImportModal';

<DataImportModal
  isOpen={importModalOpen}
  onClose={() => setImportModalOpen(false)}
  type="menu" // o 'inventory', 'haccp'
/>

// DESPUÉS (MODERNO)
import UniversalImporter from '../components/common/UniversalImporter';

<UniversalImporter
  isOpen={importModalOpen}
  onClose={() => setImportModalOpen(false)}
  type="menu" // ahora tipado con ImportType
  mode="excel" // o 'auto' para detección inteligente
  outletId={currentOutletId}
/>
```

#### 2.2 Deprecar DataImportModal

```typescript
// packages/web/src/presentation/components/common/DataImportModal.tsx

/**
 * @deprecated Use UniversalImporter instead
 * This component will be removed in v3.0
 *
 * Migration guide:
 * - Replace DataImportModal with UniversalImporter
 * - Add 'mode' prop (typically 'excel')
 * - Add 'outletId' prop
 */
export const DataImportModal = (props: DataImportModalProps) => {
  console.warn('DataImportModal is deprecated. Use UniversalImporter instead.');
  // ... existing code
};
```

---

### FASE 3: Refactorizar EventImportModal

#### 3.1 Mantener Lógica Específica, Delegar Parsing

**Objetivo**: Separar lógica de eventos (matrix view, ICS) del parsing de archivos

```typescript
// packages/web/src/presentation/components/events/EventImportModal.tsx

import UniversalImporter from '../common/UniversalImporter';
import { ImportMode } from '../../../types/import';

export const EventImportModal = ({ isOpen, onClose }: Props) => {
  const [mode, setMode] = useState<'matrix' | 'import'>('import');

  if (mode === 'import') {
    // Delegar al UniversalImporter
    return (
      <UniversalImporter
        isOpen={isOpen}
        onClose={onClose}
        type="event"
        mode="excel" // o 'ics' para calendarios
        outletId={currentOutletId}
        onSuccess={(result) => {
          // Lógica específica de eventos
          handleEventImportSuccess(result);
        }}
      />
    );
  }

  if (mode === 'matrix') {
    // Mantener Matrix View (es lógica específica de eventos)
    return <EventMatrixView {...props} />;
  }
};
```

#### 3.2 Crear Cloud Function para ICS

```typescript
// packages/functions/src/triggers/icsProcessor.ts

import { onCall } from 'firebase-functions/v2/https';
import ical from 'ical';

export const processICSFile = onCall(async (request) => {
  const { base64Data, outletId } = request.data;

  const icsContent = Buffer.from(base64Data, 'base64').toString('utf-8');
  const parsed = ical.parseICS(icsContent);

  const events = Object.values(parsed).map((event: any) => ({
    type: 'event' as const,
    data: {
      title: event.summary,
      start: event.start,
      end: event.end,
      description: event.description,
      outletId,
    },
    confidence: 1.0,
    source: 'ics',
  }));

  return {
    success: true,
    itemsProcessed: events.length,
    data: events,
  };
});
```

---

### FASE 4: Expandir UniversalImporter

#### 4.1 Agregar Soporte para Todos los Tipos

```typescript
// packages/web/src/presentation/components/common/UniversalImporter.tsx

interface UniversalImporterProps {
  isOpen: boolean;
  onClose: () => void;
  type: ImportType;
  mode?: ImportMode; // default: 'auto'
  outletId: string;
  onSuccess?: (result: ImportResult) => void;
}

export const UniversalImporter = ({
  type,
  mode = 'auto',
  outletId,
  ...props
}: UniversalImporterProps) => {

  const getCloudFunction = () => {
    const functionMap: Record<ImportType, string> = {
      ingredient: 'processIngredientImport',
      recipe: 'processRecipeImport',
      menu: 'processMenuImport',
      event: mode === 'ics' ? 'processICSFile' : 'processEventImport',
      staff: 'processStaffImport',
      supplier: 'processSupplierImport',
      inventory: 'processInventoryImport',
      haccp: 'processHACCPImport',
      occupancy: 'processOccupancyImport',
    };

    return functionMap[type];
  };

  const handleImport = async (file: File) => {
    const functionName = getCloudFunction();
    const base64 = await fileToBase64(file);

    const result = await httpsCallable<ImportRequest, ImportResult>(
      functions,
      functionName
    )({
      base64Data: base64,
      mode,
      outletId,
    });

    return result.data;
  };

  // ... rest of component
};
```

#### 4.2 Crear Cloud Functions Faltantes

```typescript
// packages/functions/src/triggers/menuProcessor.ts
export const processMenuImport = onCall(async (request) => {
  const { base64Data, outletId, mode } = request.data;

  if (mode === 'excel') {
    return processStructuredMenuExcel(base64Data, outletId);
  }

  if (mode === 'auto' || mode === 'ai') {
    return smartMenuImport(base64Data, outletId);
  }

  throw new HttpsError('invalid-argument', 'Invalid mode');
});

// packages/functions/src/triggers/inventoryProcessor.ts
export const processInventoryImport = onCall(async (request) => {
  // Similar structure
});

// packages/functions/src/triggers/haccpProcessor.ts
export const processHACCPImport = onCall(async (request) => {
  // Similar structure
});
```

---

### FASE 5: Deprecar Funciones Legacy

#### 5.1 Marcar Funciones como Deprecated

```typescript
// packages/web/src/utils/excelImport.ts

/**
 * @deprecated Use Cloud Function 'processStructuredFile' instead
 * This function will be removed in v3.0
 */
export const parseWorkbook = (file: File) => {
  console.warn('parseWorkbook is deprecated. Use processStructuredFile Cloud Function.');
  // ... existing code
};

/**
 * @deprecated Use appropriate Cloud Function processor instead
 * This function will be removed in v3.0
 */
export const uploadForCloudParsing = (file: File) => {
  console.warn('uploadForCloudParsing is deprecated.');
  // ... existing code
};
```

#### 5.2 Crear Guía de Migración

```markdown
# Migration Guide: Legacy Import System → UniversalImporter

## For Developers

### Before
```typescript
import { parseWorkbook } from '../utils/excelImport';
const data = await parseWorkbook(file);
```

### After
```typescript
import { httpsCallable } from 'firebase/functions';
const processFile = httpsCallable(functions, 'processStructuredFile');
const result = await processFile({ base64Data, type, outletId });
```

## For Components

### Before (DataImportModal)
```tsx
<DataImportModal
  isOpen={true}
  onClose={handleClose}
  type="menu"
/>
```

### After (UniversalImporter)
```tsx
<UniversalImporter
  isOpen={true}
  onClose={handleClose}
  type="menu"
  mode="excel"
  outletId={currentOutletId}
/>
```
```

---

## Google Cloud ML Integration (Bonus)

### Servicios Cubiertos por Créditos GenAI (€863)

Tu crédito "Trial credit for GenAI App Builder" cubre:
- ✅ **Document AI** (OCR de facturas, formularios)
- ✅ **Vertex AI Search** (búsqueda empresarial)
- ✅ **Grounded Generation API** (chat con contexto)
- ✅ **Vertex AI Conversation** (agentes conversacionales)

### Smart Invoice OCR (Ya Implementado)

El archivo `packages/functions/src/scanners/invoiceScanner.ts` ya implementa Document AI.

**Mejora propuesta**: Agregar aprendizaje continuo

```typescript
// packages/functions/src/ml/invoiceLearning.ts

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import * as admin from 'firebase-admin';

interface InvoiceFeedback {
  invoiceId: string;
  corrections: Array<{
    field: string;
    aiValue: string;
    correctValue: string;
  }>;
}

export const submitInvoiceFeedback = onCall(async (request) => {
  const { invoiceId, corrections } = request.data as InvoiceFeedback;

  // Guardar feedback para reentrenamiento
  await admin.firestore()
    .collection('ml_training_data')
    .doc('invoice_corrections')
    .collection('corrections')
    .add({
      invoiceId,
      corrections,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

  // TODO: Cuando haya suficientes correcciones (>100), retrain model
  return { success: true, message: 'Feedback guardado' };
});
```

### BigQuery ML para Forecasting

```sql
-- Crear modelo de predicción de demanda
CREATE OR REPLACE MODEL `chefos_ml.demand_forecaster`
OPTIONS(
  model_type='ARIMA_PLUS',
  time_series_timestamp_col='date',
  time_series_data_col='quantity',
  time_series_id_col='ingredientId',
  horizon=30,
  auto_arima=TRUE
) AS
SELECT
  date,
  ingredientId,
  SUM(quantity) as quantity
FROM
  `chefosv2.ingredient_consumption`
WHERE
  date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)
GROUP BY
  date, ingredientId;

-- Predecir próximos 30 días
SELECT
  *
FROM
  ML.FORECAST(MODEL `chefos_ml.demand_forecaster`,
    STRUCT(30 AS horizon, 0.95 AS confidence_level)
  );
```

---

## Checklist de Validación

Antes de considerar la migración completa:

### Tests
- [ ] Tests unitarios para tipos de import
- [ ] Tests de integración para cada Cloud Function
- [ ] Tests E2E para flujo completo de import

### Documentación
- [ ] Guía de migración actualizada
- [ ] README con ejemplos de uso
- [ ] JSDoc en todos los exports públicos

### Performance
- [ ] Imports de <100 items: <2 segundos
- [ ] Imports de 100-1000 items: <10 segundos
- [ ] Manejo de errores sin crashes

### Seguridad
- [ ] Validación de tipos en Cloud Functions
- [ ] Rate limiting implementado
- [ ] File size limits (<10MB)

### Migración
- [ ] Todas las páginas usan UniversalImporter
- [ ] DataImportModal marcado como deprecated
- [ ] EventImportModal refactorizado
- [ ] Archivo duplicado eliminado

---

## Comandos Útiles

```bash
# Verificar uso de imports legacy
grep -r "DataImportModal" packages/web/src/presentation/pages/
grep -r "parseWorkbook" packages/web/src/

# Ejecutar tests
npm test

# Compilar y verificar tipos
npm run build

# Deploy functions
firebase deploy --only functions

# Ver logs de functions
firebase functions:log --only processMenuImport

# Ver costos actuales en Google Cloud
gcloud billing accounts list
gcloud billing projects describe chefosv2
```

---

## Notas Importantes

1. **No sobre-ingenierizar**: Mantener soluciones simples
2. **Reutilizar código**: UniversalImporter debe ser genérico
3. **Backend primero**: Toda lógica crítica en Cloud Functions
4. **Feedback loops**: Guardar datos de correcciones para mejorar IA
5. **Costos monitorizados**: Configurar alertas en Google Cloud

---

## Estructura de Commits Esperada

```
feat(imports): create unified type system
feat(imports): add menu import Cloud Function
feat(imports): add inventory import Cloud Function
feat(imports): add HACCP import Cloud Function
refactor(imports): migrate HACCPPage to UniversalImporter
refactor(imports): migrate InventoryPage to UniversalImporter
refactor(imports): migrate MenuPage to UniversalImporter
refactor(imports): simplify EventImportModal using UniversalImporter
chore(imports): deprecate DataImportModal
chore(imports): remove duplicate UniversalImporter file
docs(imports): add migration guide
test(imports): add unit tests for import types
test(imports): add integration tests for Cloud Functions
```

---

## Contacto y Soporte

Para dudas sobre la arquitectura o el plan:
- Revisar este documento
- Consultar código existente en `packages/functions/src/scanners/`
- Ver ejemplo de UniversalImporter en `packages/web/src/presentation/components/common/`

**Última actualización**: 2025-12-29
**Versión del plan**: 2.0
**Autor**: Claude Code (basado en análisis exhaustivo del codebase)
