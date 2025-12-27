import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterStockMovementUseCase } from './RegisterStockMovementUseCase';
import { ProcessStockMovementUseCase as CoreProcessStockMovementUseCase } from '@culinaryos/core';
import { Quantity, Unit as CoreUnit, Money } from '@culinaryos/core';

describe('RegisterStockMovementUseCase (Web Adapter)', () => {
  let useCase: RegisterStockMovementUseCase;
  let mockCoreUseCase: CoreProcessStockMovementUseCase;

  beforeEach(() => {
    mockCoreUseCase = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as any;
    useCase = new RegisterStockMovementUseCase(mockCoreUseCase);
  });

  it('should delegate PURCHASE movement to core with correct mapping', async () => {
    const dto = {
      ingredientId: 'ing-1',
      ingredientName: 'Tomato',
      quantity: 10,
      unit: 'kg' as any,
      type: 'PURCHASE' as any,
      performedBy: 'user-1',
      costPerUnit: 2.5,
      reason: 'Weekly purchase',
    };

    await useCase.execute(dto);

    expect(mockCoreUseCase.execute).toHaveBeenCalledWith({
      ingredientId: 'ing-1',
      outletId: 'default-outlet',
      quantity: expect.any(Quantity),
      type: 'PURCHASE',
      performedBy: 'user-1',
      unitCost: expect.any(Money),
      reason: 'Weekly purchase',
      referenceId: undefined,
    });

    const callArgs = vi.mocked(mockCoreUseCase.execute).mock.calls[0][0];
    expect(callArgs.quantity.value).toBe(10);
    expect(callArgs.quantity.unit.toString()).toBe('kg');
    expect(callArgs.unitCost?.amount).toBe(2.5);
  });

  it('should delegate USAGE movement as SALE to core', async () => {
    const dto = {
      ingredientId: 'ing-1',
      ingredientName: 'Tomato',
      quantity: 2,
      unit: 'kg' as any,
      type: 'USAGE' as any,
      performedBy: 'user-1',
    };

    await useCase.execute(dto);

    expect(mockCoreUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SALE',
        quantity: expect.objectContaining({ value: 2 }),
      })
    );
  });
});
