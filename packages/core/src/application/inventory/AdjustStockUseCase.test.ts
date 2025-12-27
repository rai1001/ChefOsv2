import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdjustStockUseCase, AdjustStockDTO } from './AdjustStockUseCase';
import { AddBatchUseCase } from './AddBatchUseCase';
import { ConsumeFIFOUseCase } from './ConsumeFIFOUseCase';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit, UnitType } from '../../domain/value-objects/Unit';
import { Money } from '../../domain/value-objects/Money';

describe('AdjustStockUseCase', () => {
  let adjustStockUseCase: AdjustStockUseCase;
  let mockAddBatchUseCase: AddBatchUseCase;
  let mockConsumeFIFOUseCase: ConsumeFIFOUseCase;

  beforeEach(() => {
    mockAddBatchUseCase = {
      execute: vi.fn(),
    } as unknown as AddBatchUseCase;

    mockConsumeFIFOUseCase = {
      execute: vi.fn(),
    } as unknown as ConsumeFIFOUseCase;

    adjustStockUseCase = new AdjustStockUseCase(mockAddBatchUseCase, mockConsumeFIFOUseCase);
  });

  it('should call AddBatchUseCase when type is increase', async () => {
    const dto: AdjustStockDTO = {
      ingredientId: 'ing-1',
      outletId: 'outlet-1',
      adjustment: new Quantity(10, new Unit(UnitType.KG)),
      type: 'increase',
      reason: 'Audit',
      unitCost: Money.fromCents(100),
    };

    await adjustStockUseCase.execute(dto);

    expect(mockAddBatchUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        ingredientId: dto.ingredientId,
        outletId: dto.outletId,
        quantity: dto.adjustment,
        notes: dto.reason,
        unitCost: dto.unitCost,
        lotNumber: expect.stringMatching(/^ADJ-/),
      })
    );
  });

  it('should throw error if increase missing unitCost', async () => {
    const dto: AdjustStockDTO = {
      ingredientId: 'ing-1',
      outletId: 'outlet-1',
      adjustment: new Quantity(10, new Unit(UnitType.KG)),
      type: 'increase',
      reason: 'Audit',
      // unitCost missing
    };

    await expect(adjustStockUseCase.execute(dto)).rejects.toThrow('Unit cost is required');
  });

  it('should call ConsumeFIFOUseCase when type is decrease', async () => {
    const dto: AdjustStockDTO = {
      ingredientId: 'ing-1',
      outletId: 'outlet-1',
      adjustment: new Quantity(5, new Unit(UnitType.KG)),
      type: 'decrease',
      reason: 'Spillage',
    };

    await adjustStockUseCase.execute(dto);

    expect(mockConsumeFIFOUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        ingredientId: dto.ingredientId,
        quantity: dto.adjustment,
        reason: dto.reason,
        reference: 'Stock Adjustment',
      })
    );
  });
});
