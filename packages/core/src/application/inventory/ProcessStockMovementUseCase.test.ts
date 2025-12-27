import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ProcessStockMovementUseCase,
  ProcessStockMovementDTO,
} from './ProcessStockMovementUseCase';
import { AdjustStockUseCase } from './AdjustStockUseCase';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit } from '../../domain/value-objects/Unit';
import { Money } from '../../domain/value-objects/Money';

describe('ProcessStockMovementUseCase', () => {
  let useCase: ProcessStockMovementUseCase;
  let mockAdjustStockUseCase: AdjustStockUseCase;

  beforeEach(() => {
    mockAdjustStockUseCase = {
      execute: vi.fn(),
    } as any;
    useCase = new ProcessStockMovementUseCase(mockAdjustStockUseCase);
  });

  it('should process PURCHASE as an increase', async () => {
    const dto: ProcessStockMovementDTO = {
      ingredientId: 'ing-1',
      outletId: 'out-1',
      quantity: new Quantity(10, new Unit('kg' as any)),
      type: 'PURCHASE',
      performedBy: 'User A',
      unitCost: Money.fromCents(100),
    };

    await useCase.execute(dto);

    expect(mockAdjustStockUseCase.execute).toHaveBeenCalledWith({
      ingredientId: 'ing-1',
      outletId: 'out-1',
      adjustment: expect.objectContaining({ value: 10 }),
      type: 'increase',
      reason: 'PURCHASE by User A',
      unitCost: dto.unitCost,
    });
  });

  it('should process WASTE as a decrease', async () => {
    const dto: ProcessStockMovementDTO = {
      ingredientId: 'ing-1',
      outletId: 'out-1',
      quantity: new Quantity(5, new Unit('kg' as any)),
      type: 'WASTE',
      performedBy: 'User B',
    };

    await useCase.execute(dto);

    expect(mockAdjustStockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'decrease',
        reason: 'WASTE by User B',
      })
    );
  });

  it('should process SALE as a decrease', async () => {
    const dto: ProcessStockMovementDTO = {
      ingredientId: 'ing-1',
      outletId: 'out-1',
      quantity: new Quantity(2, new Unit('kg' as any)),
      type: 'SALE',
      performedBy: 'Staff',
    };

    await useCase.execute(dto);

    expect(mockAdjustStockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'decrease',
      })
    );
  });

  it('should process PRODUCTION as an increase', async () => {
    const dto: ProcessStockMovementDTO = {
      ingredientId: 'ing-1',
      outletId: 'out-1',
      quantity: new Quantity(15, new Unit('kg' as any)),
      type: 'PRODUCTION',
      performedBy: 'Chef',
      unitCost: Money.fromCents(200),
    };

    await useCase.execute(dto);

    expect(mockAdjustStockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'increase',
      })
    );
  });

  it('should process positive ADJUSTMENT as an increase', async () => {
    const dto: ProcessStockMovementDTO = {
      ingredientId: 'ing-1',
      outletId: 'out-1',
      quantity: new Quantity(1, new Unit('kg' as any)),
      type: 'ADJUSTMENT',
      performedBy: 'Admin',
      unitCost: Money.fromCents(100),
    };

    await useCase.execute(dto);

    expect(mockAdjustStockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'increase',
      })
    );
  });

  it('should use custom reason if provided', async () => {
    const dto: ProcessStockMovementDTO = {
      ingredientId: 'ing-1',
      outletId: 'out-1',
      quantity: new Quantity(1, new Unit('kg' as any)),
      type: 'PURCHASE',
      performedBy: 'User',
      unitCost: Money.fromCents(100),
      reason: 'Custom Reason',
    };

    await useCase.execute(dto);

    expect(mockAdjustStockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'Custom Reason',
      })
    );
  });
});
