# ⚠️ DEPRECATED PURCHASING SERVICES

**Fecha de deprecación:** 2026-01-02
**Razón:** Consolidación de servicios duplicados - Clean Architecture refactor FASE 2

---

## 📦 Servicios Consolidados

Los siguientes **4 servicios** han sido consolidados en uno solo:

| Servicio Antiguo | Líneas | Estado |
|------------------|--------|--------|
| `purchasingService.ts` | 152 | ⚠️ DEPRECATED |
| `pedidosService.ts` | 176 | ⚠️ DEPRECATED |
| `reorderService.ts` | 40 | ⚠️ DEPRECATED |
| `supplierSelectionService.ts` | 84 | ⚠️ DEPRECATED |
| **TOTAL** | **452** | **→ 1 servicio** |

**Nuevo servicio unificado:**
```
packages/web/src/application/services/PurchasingService.ts (~450 líneas)
```

---

## 🔄 MIGRATION GUIDE

### 1. pedidosService.ts → PurchasingService

```typescript
// ❌ ANTES (pedidosService)
import { pedidosService } from '@/services/pedidosService';

await pedidosService.getAll(outletId);
await pedidosService.getOrdersByStatus(outletId, ['ORDERED']);
await pedidosService.createManualOrder(supplierId, items, outletId);
await pedidosService.updateStatus(orderId, 'APPROVED', userId);
await pedidosService.generateOrdersFromNeeds(needs, outletId);

// ✅ AHORA (PurchasingService)
import { PurchasingService } from '@/application/services/PurchasingService';

await PurchasingService.getAll(outletId);
await PurchasingService.getOrdersByStatus(outletId, ['ORDERED']);
await PurchasingService.createManualOrder(supplierId, items, outletId);
await PurchasingService.updateStatus(orderId, 'APPROVED', userId);
await PurchasingService.generateOrdersFromNeeds(needs, outletId);
```

### 2. purchasingService.ts → PurchasingService

```typescript
// ❌ ANTES (purchasingService)
import { purchasingService } from '@/services/purchasingService';

await purchasingService.createPurchaseOrder(order);
await purchasingService.updateOrderStatus(orderId, 'APPROVED');

// ✅ AHORA (PurchasingService)
import { PurchasingService } from '@/application/services/PurchasingService';

await PurchasingService.savePurchaseOrder(order);
await PurchasingService.updateOrderStatus(orderId, 'APPROVED');
```

### 3. reorderService.ts → PurchasingService

```typescript
// ❌ ANTES (reorderService)
import { reorderService } from '@/services/reorderService';

reorderService.checkAndNotify(state, ingredientId);

// ✅ AHORA (PurchasingService)
import { PurchasingService } from '@/application/services/PurchasingService';

PurchasingService.checkAndNotify(state, ingredientId);
```

### 4. supplierSelectionService.ts → PurchasingService

```typescript
// ❌ ANTES (supplierSelectionService)
import { supplierSelectionService } from '@/services/supplierSelectionService';

const supplier = await supplierSelectionService.selectOptimalSupplier(
  ingredientId,
  quantity,
  'urgent'
);

// ✅ AHORA (PurchasingService)
import { PurchasingService } from '@/application/services/PurchasingService';

const supplier = await PurchasingService.selectOptimalSupplier(
  ingredientId,
  quantity,
  'urgent'
);
```

---

## 📋 API COMPLETA DEL NUEVO SERVICIO

```typescript
export const PurchasingService = {
  // ========== ORDER MANAGEMENT ==========
  groupNeedsBySupplier(needs: ReorderNeed[]): Map<string, ReorderNeed[]>
  createDraftOrderFromNeeds(supplierId, needs, outletId): Promise<PurchaseOrder>
  savePurchaseOrder(order: PurchaseOrder): Promise<void>
  createManualOrder(supplierId, items, outletId): Promise<PurchaseOrder>

  // Order status updates
  updateStatus(orderId, status, userId?, extraData?): Promise<void>
  updateOrderStatus(orderId, status, notes?): Promise<void>

  // Order queries
  getAll(outletId): Promise<PurchaseOrder[]>
  getPurchaseOrders(outletId): Promise<PurchaseOrder[]>  // Alias
  getOrdersByStatus(outletId, statuses): Promise<PurchaseOrder[]>

  // Batch operations
  generateOrdersFromNeeds(allNeeds, outletId): Promise<PurchaseOrder[]>
  approvePurchaseOrder(orderId, approvedBy): Promise<void>

  // ========== SUPPLIER SELECTION ==========
  getIngredientSuppliers(ingredientId): Promise<IngredientSupplierConfig | null>
  saveIngredientSuppliers(config): Promise<void>
  selectOptimalSupplier(ingredientId, quantityNeeded, urgency?): Promise<SupplierOption | null>

  // ========== REORDER NOTIFICATIONS ==========
  checkAndNotify(state: AppState, ingredientId: string): void

  // ========== AUTO-PURCHASE WORKFLOW ==========
  executeAutoPurchase(needs, outletId, autoApprove?): Promise<PurchaseOrder[]>
}
```

---

## 🗂️ ARCHIVOS ACTUALIZADOS (4)

Ya migrados al nuevo servicio:

1. ✅ `packages/web/src/presentation/components/dashboard/ManualPurchaseModal.tsx`
2. ✅ `packages/web/src/presentation/components/purchasing/AprobacionPedido.tsx`
3. ✅ `packages/web/src/presentation/components/purchasing/RecepcionPedido.tsx`
4. ✅ `packages/web/src/services/aprobacionService.ts`

---

## 🎯 MEJORAS DEL SERVICIO CONSOLIDADO

### Ventajas:
- ✅ **Menos duplicación**: 452 líneas → ~450 líneas (4 servicios → 1)
- ✅ **Mejor organización**: Funciones agrupadas por responsabilidad
- ✅ **Clean Architecture**: Servicio en capa Application (no Infrastructure)
- ✅ **Documentación completa**: Todos los métodos documentados con JSDoc
- ✅ **Compatibilidad**: Mantiene todas las funciones originales + alias
- ✅ **Typed**: Interfaces completas para todos los parámetros

### Estructura:
```
PurchasingService/
├── ORDER MANAGEMENT (creación, guardado, consultas)
├── SUPPLIER SELECTION (selección óptima de proveedores)
├── REORDER NOTIFICATIONS (alertas de reorden)
└── AUTO-PURCHASE WORKFLOW (compra automática)
```

---

## ⏳ PRÓXIMOS PASOS

1. **Eliminar servicios antiguos** (una vez validado en producción):
   ```bash
   rm packages/web/src/services/purchasingService.ts
   rm packages/web/src/services/pedidosService.ts
   rm packages/web/src/services/reorderService.ts
   rm packages/web/src/services/supplierSelectionService.ts
   ```

2. **Verificar build sin errores**:
   ```bash
   pnpm run build
   ```

3. **Testing manual** de flujos de compra:
   - Crear compra manual
   - Aprobar pedido
   - Enviar a proveedor
   - Recibir mercancía

---

**Fin del documento. Actualizado: 2026-01-02**
