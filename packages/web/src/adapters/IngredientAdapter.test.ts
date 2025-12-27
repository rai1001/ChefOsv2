import { describe, it, expect } from 'vitest';
import { toLegacy, toCore } from './IngredientAdapter';
import { LegacyIngredient } from '@/domain/entities/Ingredient';
import { Ingredient as CoreIngredient } from '@culinaryos/core/domain/entities/Ingredient';
import { Quantity } from '@culinaryos/core/domain/value-objects/Quantity';
import { Unit, UnitType } from '@culinaryos/core/domain/value-objects/Unit';
import { Money } from '@culinaryos/core/domain/value-objects/Money';

describe('IngredientAdapter', () => {
  describe('toLegacy', () => {
    it('should correctly map CoreIngredient to LegacyIngredient', () => {
      const coreIngredient: CoreIngredient = {
        id: 'core-123',
        name: 'Core Flour',
        outletId: 'outlet-1',
        category: 'dry',
        unit: UnitType.KG,
        currentStock: new Quantity(10, new Unit(UnitType.KG)),
        minimumStock: new Quantity(2, new Unit(UnitType.KG)),
        lastCost: Money.fromCents(150), // 1.50
        allergens: ['gluten'],
        sku: 'SKU-001',
        supplier: 'Supplier ABC',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      const legacy = toLegacy(coreIngredient);

      expect(legacy.id).toBe('core-123');
      expect(legacy.name).toBe('Core Flour');
      expect(legacy.unit).toBe(UnitType.KG);
      expect(legacy.costPerUnit).toBe(1.5); // 150 cents -> 1.5
      expect(legacy.stock).toBe(10);
      expect(legacy.minStock).toBe(2);
      expect(legacy.allergens).toContain('gluten');
      expect(legacy.supplierId).toBe('Supplier ABC');
      expect(legacy.outletId).toBe('outlet-1');
    });

    it('should handle undefined optional fields', () => {
      const coreIngredient: CoreIngredient = {
        id: 'core-456',
        name: 'Simple Item',
        outletId: 'outlet-1',
        category: 'other',
        unit: UnitType.UNIT,
        currentStock: new Quantity(5, new Unit(UnitType.UNIT)),
        minimumStock: new Quantity(1, new Unit(UnitType.UNIT)),
        // missing lastCost
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any; // Partial for testing missing optionals if type allows

      const legacy = toLegacy(coreIngredient);
      expect(legacy.costPerUnit).toBe(0);
    });
  });

  describe('toCore', () => {
    it('should correctly map LegacyIngredient to CoreIngredient', () => {
      const legacy = new LegacyIngredient(
        'leg-123',
        'Legacy Sugar',
        'kg',
        2.5, // costPerUnit
        1, // yield
        ['none'],
        'dry',
        50, // stock
        5, // minStock
        undefined,
        [],
        'Supp-X',
        [],
        'SKU-LEG',
        undefined,
        'outlet-X'
      );

      const core = toCore(legacy);

      expect(core.id).toBe('leg-123');
      expect(core.name).toBe('Legacy Sugar');
      expect(core.currentStock.value).toBe(50);
      expect(core.using).toBeUndefined(); // Core might not have 'using'
      expect(core.lastCost?.amount).toBe(2.5); // 2.50
      // Check private cents if possible via conversion back or assuming impl
      // Money.fromCents(2.50 * 100) -> 250 cents
      expect(core.sku).toBe('SKU-LEG');
    });
  });
});
