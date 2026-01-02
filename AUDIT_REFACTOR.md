# 📊 AUDITORÍA COMPLETA - REFACTOR ARQUITECTÓNICO ChefOsv2

**Fecha:** 2026-01-02
**Branch:** refactor/clean-architecture-fix

---

## 🎯 ESTADO ACTUAL

### Métricas Generales
- **Archivos TS/TSX:** 410
- **Páginas:** 27
- **Categorías de componentes:** 30
- **Servicios:** 32
- **Zustand slices:** 16 (en 1 store monolítico)
- **Jotai atoms:** 3
- **Sistemas de estado:** 3 (Zustand + Jotai + Context)

---

## 🗑️ CÓDIGO MUERTO IDENTIFICADO (0 importaciones)

### Servicios a ELIMINAR:
1. ✅ `packages/web/src/services/deepseekService.ts` (0 usos) - Placeholder nunca implementado
2. ✅ `packages/web/src/services/feedbackService.ts` (0 usos)

### Servicios con USO MÍNIMO (candidatos a evaluar):
- `calendarIntegrationService.ts` (4 usos)
- `occupancyService.ts` (1 uso)

---

## 📄 PÁGINAS - Análisis (27 total)

### ✅ CORE (8 - MANTENER):
1. Dashboard.tsx
2. LoginPage.tsx
3. SettingsPage.tsx
4. IngredientsPage.tsx / InventoryPage.tsx
5. RecipesPage.tsx / FichasTecnicasPage.tsx
6. EventsPage.tsx
7. SchedulePage.tsx
8. PurchasingPage.tsx

### ⚠️ SECUNDARIAS (evaluar según prioridad):
- AnalyticsPage.tsx / MenuAnalyticsPage.tsx (Boston Matrix)
- UserManagementPage.tsx (multi-tenancy)
- SupplierPage.tsx
- StaffPage.tsx
- AcceptInvitationPage.tsx

### ❌ ELIMINAR (no alineadas con 6 módulos core):
1. BEOScannerPage.tsx - **TODO/Mock** (línea 36-38)
2. AIFeaturesPage.tsx - Features dispersas
3. AITelemetryPage.tsx - Telemetría no core
4. HospitalityLogisticsPage.tsx - Muy específico
5. SocialManagerView.tsx - Social features barely usados
6. WastePage.tsx - No es prioridad
7. HACCPPage.tsx - No core ahora
8. KitchenDisplayPage.tsx - Feature avanzada
9. IntegrationsPage.tsx - No prioritario
10. ProductionPage.tsx - Fase 4
11. MenuPage.tsx - Duplicado con MenuAnalytics

**Total a eliminar: ~11 páginas → Quedan ~16 (8 core + 8 secundarias)**

---

## 🧩 COMPONENTES - 30 Categorías

### Estado Actual:
```
ai/ analytics/ atoms/ auth/ common/ dashboard/ events/ fichas/
haccp/ imports/ ingredients/ inventory/ lists/ menu/ molecules/
occupancy/ onboarding/ organisms/ printing/ production/
proveedores/ purchasing/ recipes/ scanner/ schedule/
social-chef/ social-manager/ staff/ ui/ waste/
```

### ❌ Categorías a ELIMINAR:
- `social-chef/`
- `social-manager/`
- `scanner/` (BEO scanner)
- `haccp/` (si no es core)
- `waste/`
- `occupancy/`
- `printing/` (mover a shared si se usa)

### ✅ Reorganizar a FEATURES (7 categorías):
```
features/
├── inventory/       (de: ingredients/ + inventory/)
├── recipes/         (de: recipes/ + fichas/)
├── events/          (de: events/ + schedule/)
├── purchases/       (de: purchases/ + proveedores/)
├── dashboard/       (de: dashboard/ + analytics/)
├── schedule/        (de: schedule/ + events calendario)
└── shared/          (de: common/ + ui/)
```

### ✅ UI Package (Atomic Design):
```
packages/ui/src/
├── atoms/          (Button, Input, Badge, etc)
├── molecules/      (FormField, Card, etc)
└── organisms/      (Navbar, Sidebar, Modal)
```

---

## 🔄 SERVICIOS DUPLICADOS

### Grupo 1: INVENTARIO (consolidar 3→1)
- `inventoryService.ts` (340 líneas)
- `inventoryAnalytics.ts` (169 líneas)
- `necesidadesService.ts` (167 líneas)
**Total:** 676 líneas → Consolidar a `FirebaseInventoryRepository.ts`

### Grupo 2: COMPRAS (consolidar 4→1)
- `purchasingService.ts` (152 líneas)
- `pedidosService.ts` (176 líneas)
- `supplierSelectionService.ts`
- `reorderService.ts`
**Total:** ~450 líneas → Consolidar a `FirebasePurchaseRepository.ts`

### Grupo 3: FORECASTING (consolidar 3→1)
- `forecastingService.ts` (178 líneas)
- `requirementsService.ts` (158 líneas)
- `necesidadesService.ts` (ya contado arriba)
**Total:** ~500 líneas → Consolidar a `ForecastService.ts` (application layer)

### Servicios a MANTENER (adapters):
1. `geminiService.ts` → mover a `infrastructure/services/GeminiAIService.ts`
2. `firestoreService.ts` → evaluar si es necesario (low-level)
3. `fichasTecnicasService.ts` → consolidar en `FirebaseRecipeRepository.ts`

---

## 💾 ESTADO MANAGEMENT

### ZUSTAND - 16 slices (MANTENER pero reorganizar):
```
✅ createAuthSlice.ts
✅ createIngredientSlice.ts
✅ createInventorySlice.ts
✅ createRecipeSlice.ts
✅ createEventSlice.ts
✅ createPurchaseSlice.ts
✅ createAnalyticsSlice.ts
⚠️ createMenuSlice.ts (evaluar si duplica recipeSlice)
⚠️ createWasteSlice.ts (eliminar si no es core)
⚠️ createHACCPSlice.ts (eliminar si no es core)
⚠️ createHospitalitySlice.ts (eliminar)
⚠️ createProductionSlice.ts (postponer)
⚠️ createStaffSlice.ts (evaluar)
✅ createOutletSlice.ts (multi-tenancy)
✅ createNotificationSlice.ts
⚠️ createIntegrationSlice.ts (evaluar)
```

**Plan:** Consolidar a 6-8 slices esenciales

### JOTAI - 3 atoms (MIGRAR a Zustand):
```
❌ authAtoms.ts → migrar a createAuthSlice
❌ inventoryAtoms.ts → migrar a createInventorySlice
❌ recipesAtoms.ts → migrar a createRecipeSlice
```

**Después de migrar:** `pnpm remove jotai`

---

## 📁 NUEVA ESTRUCTURA PROPUESTA

```
packages/web/src/
│
├── infrastructure/
│   ├── repositories/
│   │   ├── FirebaseIngredientRepository.ts
│   │   ├── FirebaseRecipeRepository.ts
│   │   ├── FirebaseEventRepository.ts
│   │   ├── FirebasePurchaseRepository.ts
│   │   ├── FirebaseUserRepository.ts
│   │   └── FirebaseSupplierRepository.ts
│   └── services/
│       └── GeminiAIService.ts
│
├── application/
│   ├── di/
│   │   └── container.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── inventoryStore.ts
│   │   ├── recipeStore.ts
│   │   ├── eventStore.ts
│   │   ├── purchaseStore.ts
│   │   └── dashboardStore.ts
│   └── services/
│       └── ForecastService.ts
│
└── presentation/
    ├── pages/ (8 core)
    │   ├── Dashboard/
    │   ├── Schedule/
    │   ├── Events/
    │   ├── Inventory/
    │   ├── Recipes/
    │   ├── Purchases/
    │   ├── Settings/
    │   └── Auth/
    └── features/
        ├── inventory/
        ├── recipes/
        ├── events/
        ├── purchases/
        ├── dashboard/
        ├── schedule/
        └── shared/
```

---

## 📈 MÉTRICAS OBJETIVO

| Métrica | Antes | Meta | Reducción |
|---------|-------|------|-----------|
| Servicios | 32 | 6-8 | 75-80% |
| Páginas | 27 | 8-16 | 40-70% |
| Categorías componentes | 30 | 7 | 77% |
| Sistemas estado | 3 | 1 | 67% |
| Zustand slices | 16 | 6-8 | 50% |
| Jotai atoms | 3 | 0 | 100% |
| Archivos TS/TSX | 410 | ~100-150 | 60-75% |

---

## ✅ SIGUIENTE PASO

**FASE 0 completada:** Auditoría y mapeo
**FASE 1 siguiente:** Eliminar código muerto

**Comandos ready:**
```bash
# Eliminar servicios muertos
rm packages/web/src/services/deepseekService.ts
rm packages/web/src/services/feedbackService.ts

# Eliminar páginas no usadas
rm packages/web/src/presentation/pages/BEOScannerPage.tsx
rm packages/web/src/presentation/pages/AIFeaturesPage.tsx
# ... etc
```

---

**Auditoría completada. Ready para FASE 1.** 🚀
