import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetInventoryStatusUseCase } from './GetInventoryStatusUseCase';
import { GetInventoryStatusUseCase as CoreGetInventoryStatusUseCase } from '@culinaryos/core';
import { Quantity, Unit as CoreUnit, Money } from '@culinaryos/core';
import { StockTransaction as LegacyStockTransaction } from '../../../domain/entities/StockTransaction';

describe('GetInventoryStatusUseCase (Web Adapter)', () => {
  let useCase: GetInventoryStatusUseCase;
  let mockCoreUseCase: CoreGetInventoryStatusUseCase;

  beforeEach(() => {
    mockCoreUseCase = {
      execute: vi.fn().mockResolvedValue({
        currentStock: new Quantity(10, new CoreUnit('kg' as any)),
        recentTransactions: [
          {
            id: 't-1',
            ingredientId: 'ing-1',
            ingredientName: 'Tomato',
            quantity: new Quantity(5, new CoreUnit('kg' as any)),
            unitCost: Money.fromCents(200, 'EUR'),
            type: 'PURCHASE',
            date: new Date(),
            performedBy: 'user-1',
          },
        ],
      }),
    } as any;
    useCase = new GetInventoryStatusUseCase(mockCoreUseCase);
  });

  it('should delegate to core and map result to legacy format', async () => {
    const result = await useCase.execute('ing-1');

    expect(mockCoreUseCase.execute).toHaveBeenCalledWith('ing-1');
    expect(result.currentStock).toBe(10);
    expect(result.recentTransactions).toHaveLength(1);
    expect(result.recentTransactions[0]).toBeInstanceOf(LegacyStockTransaction);
    expect(result.recentTransactions[0].type).toBe('PURCHASE');
  });

  it('should map core SALE type to legacy USAGE type', async () => {
    vi.mocked(mockCoreUseCase.execute).mockResolvedValueOnce({
      currentStock: new Quantity(10, new CoreUnit('kg' as any)),
      recentTransactions: [
        {
          id: 't-1',
          ingredientId: 'ing-1',
          ingredientName: 'Tomato',
          quantity: new Quantity(2, new CoreUnit('kg' as any)),
          unitCost: Money.fromCents(200, 'EUR'),
          type: 'SALE',
          date: new Date(),
          performedBy: 'user-1',
        },
      ],
    } as any);

    const result = await useCase.execute('ing-1');
    expect(result.recentTransactions[0].type).toBe('USAGE');
  });
});
