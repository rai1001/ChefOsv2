import {
  Batch as CoreBatch,
  BatchStatus as CoreBatchStatus,
} from '@culinaryos/core/domain/entities/Batch';
import { LegacyBatch } from '@/domain/entities/Ingredient';
import { Money } from '@culinaryos/core/domain/value-objects/Money';
import { Quantity } from '@culinaryos/core/domain/value-objects/Quantity';
import { Unit } from '@culinaryos/core/domain/value-objects/Unit';

export function toLegacyBatch(core: CoreBatch): LegacyBatch {
  return {
    id: core.id,
    ingredientId: core.ingredientId,
    outletId: core.outletId,
    batchNumber: core.lotNumber,
    initialQuantity: core.quantity.value,
    currentQuantity: core.remainingQuantity.value,
    unit: core.quantity.unit.type as any,
    costPerUnit: core.unitCost.amount,
    receivedAt: core.receivedDate.toISOString(),
    expiresAt: core.expiryDate.toISOString(),
    status: mapToLegacyStatus(core.status),
    // Optional mappings
    supplierId: core.supplier, // Core uses 'supplier' string (could be ID or name)
    name: core.notes, // Mapping notes to name or just leaving undefined? Legacy has 'name?'
  };
}

export function toCoreBatch(legacy: LegacyBatch): CoreBatch {
  // Determine status
  let status = CoreBatchStatus.ACTIVE;
  if (legacy.status === 'DEPLETED') status = CoreBatchStatus.DEPLETED;
  if (legacy.status === 'EXPIRED') status = CoreBatchStatus.EXPIRED;

  return {
    id: legacy.id,
    ingredientId: legacy.ingredientId || 'unknown',
    outletId: legacy.outletId || 'unknown',
    lotNumber: legacy.batchNumber,
    quantity: new Quantity(legacy.initialQuantity, new Unit(legacy.unit as any)),
    remainingQuantity: new Quantity(legacy.currentQuantity, new Unit(legacy.unit as any)),
    unitCost: Money.fromCents(legacy.costPerUnit * 100),
    totalCost: Money.fromCents(legacy.costPerUnit * legacy.initialQuantity * 100), // Calculated
    supplier: legacy.supplierId || 'unknown',
    receivedDate: new Date(legacy.receivedAt),
    expiryDate: new Date(legacy.expiresAt),
    status: status,
    notes: legacy.name,
    createdAt: new Date(), // Missing in legacy
    updatedAt: new Date(), // Missing in legacy
  };
}

function mapToLegacyStatus(status: CoreBatchStatus): 'ACTIVE' | 'DEPLETED' | 'EXPIRED' {
  switch (status) {
    case CoreBatchStatus.ACTIVE:
      return 'ACTIVE';
    case CoreBatchStatus.DEPLETED:
      return 'DEPLETED';
    case CoreBatchStatus.EXPIRED:
      return 'EXPIRED';
    default:
      return 'ACTIVE';
  }
}
