import { describe, it, expect } from 'vitest';
import { toLegacyBatch, toCoreBatch } from './BatchAdapter';
import { BatchStatus as CoreBatchStatus } from '@culinaryos/core/domain/entities/Batch';
import { Unit } from '@culinaryos/core/domain/value-objects/Unit';
import { Quantity } from '@culinaryos/core/domain/value-objects/Quantity';
import { Money } from '@culinaryos/core/domain/value-objects/Money';

describe('BatchAdapter', () => {
  describe('toLegacyBatch', () => {
    it('should convert CoreBatch to LegacyBatch correctly', () => {
      // Setup
      const now = new Date();
      const coreBatch = {
        id: 'batch-123',
        ingredientId: 'ing-1',
        outletId: 'outlet-1',
        lotNumber: 'LOT-2024',
        quantity: new Quantity(10, new Unit('kg')),
        remainingQuantity: new Quantity(5, new Unit('kg')),
        unitCost: Money.fromCents(150), // 1.50
        totalCost: Money.fromCents(1500),
        supplier: 'sup-1',
        receivedDate: now,
        expiryDate: now,
        status: CoreBatchStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
        notes: 'Test batch',
      };

      // Execute
      const legacy = toLegacyBatch(coreBatch);

      // Verify
      expect(legacy.id).toBe('batch-123');
      expect(legacy.ingredientId).toBe('ing-1');
      expect(legacy.outletId).toBe('outlet-1');
      expect(legacy.batchNumber).toBe('LOT-2024');
      expect(legacy.initialQuantity).toBe(10);
      expect(legacy.currentQuantity).toBe(5);
      expect(legacy.unit).toBe('kg');
      expect(legacy.costPerUnit).toBe(1.5);
      expect(legacy.receivedAt).toBe(now.toISOString());
      expect(legacy.expiresAt).toBe(now.toISOString());
      expect(legacy.status).toBe('ACTIVE');
      expect(legacy.supplierId).toBe('sup-1');
      expect(legacy.name).toBe('Test batch');
    });

    it('should map statuses correctly', () => {
      const coreBatch = {
        id: '1',
        ingredientId: '1',
        outletId: '1',
        lotNumber: '1',
        quantity: new Quantity(1, new Unit('kg')),
        remainingQuantity: new Quantity(1, new Unit('kg')),
        unitCost: Money.fromCents(100),
        totalCost: Money.fromCents(100),
        supplier: '1',
        receivedDate: new Date(),
        expiryDate: new Date(),
        status: CoreBatchStatus.EXPIRED, // Testing EXPIRED
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const legacy = toLegacyBatch(coreBatch);
      expect(legacy.status).toBe('EXPIRED');
    });
  });

  describe('toCoreBatch', () => {
    it('should convert LegacyBatch to CoreBatch correctly', () => {
      const now = new Date();
      const legacyBatch = {
        id: 'batch-123',
        ingredientId: 'ing-1',
        outletId: 'outlet-1',
        batchNumber: 'LOT-2024',
        initialQuantity: 10,
        currentQuantity: 5,
        unit: 'kg',
        costPerUnit: 1.5,
        receivedAt: now.toISOString(),
        expiresAt: now.toISOString(),
        status: 'ACTIVE' as const,
        supplierId: 'sup-1',
        name: 'Test batch',
      };

      const core = toCoreBatch(legacyBatch);

      expect(core.id).toBe('batch-123');
      expect(core.ingredientId).toBe('ing-1');
      expect(core.outletId).toBe('outlet-1');
      expect(core.lotNumber).toBe('LOT-2024');
      expect(core.quantity.value).toBe(10);
      expect(core.quantity.unit.type).toBe('kg');
      expect(core.remainingQuantity.value).toBe(5);
      expect(core.unitCost.amount).toBe(1.5);
      expect(core.supplier).toBe('sup-1');
      expect(core.receivedDate.toISOString()).toBe(now.toISOString());
      expect(core.status).toBe(CoreBatchStatus.ACTIVE);
      expect(core.notes).toBe('Test batch');
    });
  });
});
