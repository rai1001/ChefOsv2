import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformAuditUseCase } from './PerformAuditUseCase';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit } from '../../domain/value-objects/Unit';
import { Money } from '../../domain/value-objects/Money';

describe('PerformAuditUseCase', () => {
  let useCase: PerformAuditUseCase;
  let mockIngredientRepo: any;
  let mockAdjustStockUseCase: any;

  beforeEach(() => {
    mockIngredientRepo = {
      findById: vi.fn(),
    };
    mockAdjustStockUseCase = {
      execute: vi.fn(),
    };
    useCase = new PerformAuditUseCase(mockIngredientRepo, mockAdjustStockUseCase);
  });

  it('performs an increase adjustment when measured quantity is higher than current stock', async () => {
    const ingredient = {
      id: 'ing-1',
      outletId: 'outlet-1',
      currentStock: new Quantity(10, new Unit('kg' as any)),
      averageCost: Money.fromCents(100),
    };
    mockIngredientRepo.findById.mockResolvedValue(ingredient);

    await useCase.execute({
      ingredientId: 'ing-1',
      measuredQuantity: new Quantity(15, new Unit('kg' as any)),
      performedBy: 'Chef User',
    });

    expect(mockAdjustStockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'increase',
        adjustment: expect.objectContaining({ value: 5 }),
        unitCost: expect.objectContaining({ centsValue: 100 }),
      })
    );
  });

  it('performs a decrease adjustment when measured quantity is lower than current stock', async () => {
    const ingredient = {
      id: 'ing-1',
      outletId: 'outlet-1',
      currentStock: new Quantity(10, new Unit('kg' as any)),
    };
    mockIngredientRepo.findById.mockResolvedValue(ingredient);

    await useCase.execute({
      ingredientId: 'ing-1',
      measuredQuantity: new Quantity(8, new Unit('kg' as any)),
      performedBy: 'Chef User',
    });

    expect(mockAdjustStockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'decrease',
        adjustment: expect.objectContaining({ value: 2 }),
      })
    );
  });

  it('does nothing if measured quantity equals current stock', async () => {
    const ingredient = {
      id: 'ing-1',
      currentStock: new Quantity(10, new Unit('kg' as any)),
    };
    mockIngredientRepo.findById.mockResolvedValue(ingredient);

    await useCase.execute({
      ingredientId: 'ing-1',
      measuredQuantity: new Quantity(10, new Unit('kg' as any)),
      performedBy: 'Chef User',
    });

    expect(mockAdjustStockUseCase.execute).not.toHaveBeenCalled();
  });
});
