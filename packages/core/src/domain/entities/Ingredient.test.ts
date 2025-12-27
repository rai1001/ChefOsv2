import { describe, it, expect } from 'vitest';
import { Ingredient, SupplierOption } from './Ingredient';
import { Money } from '../value-objects/Money';
import { Quantity } from '../value-objects/Quantity';
import { Unit } from '../value-objects/Unit';

describe('Ingredient Entity', () => {
  it('should be able to create a valid ingredient object', () => {
    const supplier: SupplierOption = {
      supplierId: 's1',
      supplierName: 'Main Supplier',
      price: Money.fromCents(100),
      unit: 'kg',
      leadTimeDays: 2,
      isPrimary: true,
      isActive: true,
    };

    const ingredient: Ingredient = {
      id: 'ing-1',
      outletId: 'out-1',
      name: 'Tomato',
      category: 'Vegetables',
      unit: 'kg',
      currentStock: new Quantity(10, new Unit('kg' as any)),
      minimumStock: new Quantity(5, new Unit('kg' as any)),
      yieldFactor: 0.9,
      suppliers: [supplier],
      allergens: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(ingredient.id).toBe('ing-1');
    expect(ingredient.suppliers).toHaveLength(1);
    expect(ingredient.suppliers[0].supplierName).toBe('Main Supplier');
    expect(ingredient.yieldFactor).toBe(0.9);
  });

  it('should handle optional fields like density and pieceWeight', () => {
    const ingredient: Partial<Ingredient> = {
      density: 1.05,
      pieceWeight: 150,
    };

    expect(ingredient.density).toBe(1.05);
    expect(ingredient.pieceWeight).toBe(150);
  });
});
