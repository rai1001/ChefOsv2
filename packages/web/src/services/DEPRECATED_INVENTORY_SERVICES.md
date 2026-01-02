# ⚠️ DEPRECATED INVENTORY SERVICES

**Date:** 2026-01-02
**Status:** DEPRECATED - DO NOT USE

---

## 🚫 Deprecated Services

The following services are **deprecated** and will be removed in a future version:

### 1. `inventoryService.ts`
**Replaced by:**
- `@/utils/inventoryHelpers` - Pure helper functions (FIFO, calculations)
- Use Cases in `@/application/use-cases/inventory/`
- `InventoryAnalyticsService` for analytics

**Reason:** Too complex, mixed concerns (helpers + business logic + DB access)

---

### 2. `inventoryAnalytics.ts`
**Replaced by:** `@/application/services/InventoryAnalyticsService`

**Functions moved:**
- `getInventoryContext()` → `InventoryAnalyticsService.getInventoryContext()`

**Reason:** Consolidated with necesidadesService for better organization

---

### 3. `necesidadesService.ts`
**Replaced by:** `@/application/services/InventoryAnalyticsService`

**Functions moved:**
- `scaleRecipe()` → `InventoryAnalyticsService.scaleRecipe()`
- `aggregateProductionRequirements()` → `InventoryAnalyticsService.aggregateProductionRequirements()`
- `calculateReorderNeeds()` → `InventoryAnalyticsService.calculateReorderNeeds()`
- `checkProductionAvailability()` → `InventoryAnalyticsService.checkProductionAvailability()`

**Reason:** Consolidated with inventoryAnalytics for better organization

---

## ✅ Migration Guide

### Before (OLD):
```typescript
import { inventoryAnalyticsService } from '@/services/inventoryAnalytics';
import { necesidadesService } from '@/services/necesidadesService';
import { consumeStockFIFO, calculateTotalStock } from '@/services/inventoryService';

const context = await inventoryAnalyticsService.getInventoryContext(outletId);
const needs = necesidadesService.calculateReorderNeeds(ingredients);
const { newBatches } = consumeStockFIFO(batches, quantity);
```

### After (NEW):
```typescript
import { InventoryAnalyticsService } from '@/application/services/InventoryAnalyticsService';
import { consumeStockFIFO, calculateTotalStock } from '@/utils/inventoryHelpers';

const context = await InventoryAnalyticsService.getInventoryContext(outletId);
const needs = InventoryAnalyticsService.calculateReorderNeeds(ingredients);
const { newBatches } = consumeStockFIFO(batches, quantity);
```

---

## 📋 Timeline

- **2026-01-02:** Services marked as deprecated
- **Next Release:** Remove deprecated services
- **Now:** Update all imports to new locations

---

## 🎯 Benefits of New Structure

### Clean Architecture Compliance:
✅ **Domain** - Pure entities (no changes)
✅ **Application** - Business logic in services (InventoryAnalyticsService)
✅ **Infrastructure** - DB access in repositories
✅ **Presentation** - UI components

### Consolidation:
- **3 services → 1 service** (676 lines → 373 lines + 187 helpers)
- Pure functions separated (testable, reusable)
- Better organization (application vs utils)

---

**For questions, see:** `REFACTOR_PROGRESS.md`
