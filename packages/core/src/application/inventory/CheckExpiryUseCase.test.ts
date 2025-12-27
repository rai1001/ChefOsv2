import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckExpiryUseCase, ExpiryCheckResult } from './CheckExpiryUseCase';
import { IBatchRepository } from '../../infrastructure/repositories/IBatchRepository';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit, UnitType } from '../../domain/value-objects/Unit';

describe('CheckExpiryUseCase', () => {
  let checkExpiryUseCase: CheckExpiryUseCase;
  let mockBatchRepo: IBatchRepository;
  let mockIngredientRepo: IIngredientRepository;

  beforeEach(() => {
    mockBatchRepo = {
      findExpiringSoon: vi.fn(),
    } as unknown as IBatchRepository;

    mockIngredientRepo = {
      findById: vi.fn(),
    } as unknown as IIngredientRepository;

    checkExpiryUseCase = new CheckExpiryUseCase(mockBatchRepo, mockIngredientRepo);
  });

  it('should return grouped expiring batches', async () => {
    const outletId = 'outlet-1';
    const batch1 = {
      id: 'b1',
      ingredientId: 'ing-1',
      lotNumber: 'L1',
      expiryDate: new Date(),
      remainingQuantity: new Quantity(5, new Unit(UnitType.KG)),
    };
    const batch2 = {
      id: 'b2',
      ingredientId: 'ing-1',
      lotNumber: 'L2',
      expiryDate: new Date(),
      remainingQuantity: new Quantity(3, new Unit(UnitType.KG)),
    };
    const batch3 = {
      // Different ingredient
      id: 'b3',
      ingredientId: 'ing-2',
      lotNumber: 'L3',
      expiryDate: new Date(),
      remainingQuantity: new Quantity(10, new Unit(UnitType.L)),
    };

    (mockBatchRepo.findExpiringSoon as any).mockResolvedValue([batch1, batch2, batch3]);

    const ing1 = { id: 'ing-1', name: 'Flour' };
    const ing2 = { id: 'ing-2', name: 'Milk' };

    (mockIngredientRepo.findById as any).mockImplementation((id: string) => {
      if (id === 'ing-1') return Promise.resolve(ing1);
      if (id === 'ing-2') return Promise.resolve(ing2);
      return Promise.resolve(null);
    });

    const result = await checkExpiryUseCase.execute(outletId, 7);

    expect(mockBatchRepo.findExpiringSoon).toHaveBeenCalledWith(outletId, 7);

    // Expect grouped results
    expect(result).toHaveLength(2);

    // Check Ingredient 1 group
    const group1 = result.find((r) => r.ingredient.id === 'ing-1');
    expect(group1).toBeDefined();
    expect(group1?.batches).toHaveLength(2); // b1 and b2
    expect(group1?.batches.map((b) => b.id)).toEqual(['b1', 'b2']);

    // Check Ingredient 2 group
    const group2 = result.find((r) => r.ingredient.id === 'ing-2');
    expect(group2).toBeDefined();
    expect(group2?.batches).toHaveLength(1); // b3
  });
});
