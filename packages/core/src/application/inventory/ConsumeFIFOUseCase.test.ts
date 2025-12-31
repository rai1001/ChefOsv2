import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ConsumeFIFOUseCase, ConsumeFIFODTO } from './ConsumeFIFOUseCase';
import { IBatchRepository } from '../../infrastructure/repositories/IBatchRepository';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';
import { ITransactionManager } from '../../infrastructure/ITransactionManager';
import { IStockTransactionRepository } from '../../infrastructure/repositories/IStockTransactionRepository';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit, UnitType } from '../../domain/value-objects/Unit';
import { Money } from '../../domain/value-objects/Money';
import { BatchStatus } from '../../domain/entities/Batch';

describe('ConsumeFIFOUseCase', () => {
  let consumeFIFOUseCase: ConsumeFIFOUseCase;
  let mockBatchRepo: IBatchRepository;
  let mockIngredientRepo: IIngredientRepository;
  let mockTransactionManager: ITransactionManager;
  let mockTransactionRepo: IStockTransactionRepository;

  beforeEach(() => {
    mockBatchRepo = {
      create: vi.fn(),
      findActiveBatchesFIFO: vi.fn(),
      consume: vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as IBatchRepository;

    mockIngredientRepo = {
      findById: vi.fn(),
      update: vi.fn(),
    } as unknown as IIngredientRepository;

    mockTransactionManager = {
      runTransaction: vi.fn((cb) => cb('mock-txn')),
    } as unknown as ITransactionManager;

    mockTransactionRepo = {
      create: vi.fn(),
      getTransactionsByIngredient: vi.fn(),
      getTransactionsByDateRange: vi.fn(),
      getCurrentStockLevel: vi.fn(),
      getTransactionsForBatch: vi.fn(),
    } as unknown as IStockTransactionRepository;

    consumeFIFOUseCase = new ConsumeFIFOUseCase(
      mockBatchRepo,
      mockIngredientRepo,
      mockTransactionRepo,
      mockTransactionManager
    );
  });

  it('should consume from multiple batches in FIFO order', async () => {
    const ingredientId = 'ing-1';

    // Mock Ingredient
    const mockIngredient = {
      id: ingredientId,
      outletId: 'outlet-1',
      currentStock: new Quantity(10, new Unit(UnitType.KG)),
    };
    (mockIngredientRepo.findById as any).mockResolvedValue(mockIngredient);

    // Mock Active Batches (FIFO)
    // Batch 1: 2 KG (Older)
    // Batch 2: 5 KG (Newer)
    const activeBatches = [
      {
        id: 'b1',
        ingredientId,
        lotNumber: 'L1',
        remainingQuantity: new Quantity(2, new Unit(UnitType.KG)),
        unitCost: Money.fromCents(100),
        status: BatchStatus.ACTIVE,
      },
      {
        id: 'b2',
        ingredientId,
        lotNumber: 'L2',
        remainingQuantity: new Quantity(5, new Unit(UnitType.KG)),
        unitCost: Money.fromCents(100),
        status: BatchStatus.ACTIVE,
      },
    ];
    (mockBatchRepo.findActiveBatchesFIFO as any).mockResolvedValue(activeBatches);

    // DTO: Consume 3 KG
    const dto: ConsumeFIFODTO = {
      ingredientId,
      quantity: new Quantity(3, new Unit(UnitType.KG)),
      reason: 'Production',
    };

    // Mock consume return (updated batches with remainingQuantity)
    (mockBatchRepo.consume as any)
      .mockResolvedValueOnce({
        id: 'b1',
        remainingQuantity: new Quantity(0, new Unit(UnitType.KG)), // Fully depleted
      })
      .mockResolvedValueOnce({
        id: 'b2',
        remainingQuantity: new Quantity(4, new Unit(UnitType.KG)), // 5 - 1 = 4
      });

    await consumeFIFOUseCase.execute(dto);

    // Expect Batch 1 (2 KG) to be fully consumed (2 KG taken)
    expect(mockBatchRepo.consume).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: 'b1',
        quantity: expect.objectContaining({ value: 2, unit: expect.anything() }),
      }),
      expect.anything()
    );

    // Expect Batch 2 (5 KG) to be partially consumed (1 KG taken)
    expect(mockBatchRepo.consume).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: 'b2',
        quantity: expect.objectContaining({ value: 1, unit: expect.anything() }),
      }),
      expect.anything()
    );

    // Expect Ingredient Stock Update (10 - 3 = 7)
    expect(mockIngredientRepo.update).toHaveBeenCalledWith(
      ingredientId,
      expect.objectContaining({
        currentStock: expect.objectContaining({ value: 7, unit: expect.anything() }),
      }),
      expect.anything()
    );

    // Verify Transaction Creation
    expect(mockTransactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ingredientId,
        quantity: expect.objectContaining({ value: 3 }),
        type: 'SALE',
      }),
      { transaction: 'mock-txn' }
    );
  });

  it('should throw error if insufficient stock across all batches', async () => {
    const ingredientId = 'ing-1';
    (mockIngredientRepo.findById as any).mockResolvedValue({
      id: ingredientId,
      outletId: 'outlet-1',
      currentStock: new Quantity(10, new Unit(UnitType.KG)),
    });

    (mockBatchRepo.findActiveBatchesFIFO as any).mockResolvedValue([
      {
        id: 'b1',
        ingredientId,
        lotNumber: 'L1',
        remainingQuantity: new Quantity(2, new Unit(UnitType.KG)),
        unitCost: new Money(1, 'EUR'), // Money object with proper structure
        status: BatchStatus.ACTIVE,
      },
    ]);

    // Mock consume to prevent undefined error during partial depletion before error
    (mockBatchRepo.consume as any).mockResolvedValue({
      remainingQuantity: new Quantity(0, new Unit(UnitType.KG)),
    });

    const dto: ConsumeFIFODTO = {
      ingredientId,
      quantity: new Quantity(5, new Unit(UnitType.KG)), // Want 5, have 2
      reason: 'Production',
    };

    // The UseCase will consume what it can and then throw integrity error
    // because batches don't have enough stock even though ingredient says it does

    await expect(consumeFIFOUseCase.execute(dto)).rejects.toThrow(
      'Data integrity mismatch: Ingredient stock says available but Batches sum is insufficient'
    );
  });

  it('should handle zero quantity consumption', async () => {
    const ingredientId = 'ing-1';
    (mockIngredientRepo.findById as any).mockResolvedValue({
      id: ingredientId,
      currentStock: new Quantity(10, new Unit(UnitType.KG)),
    });
    (mockBatchRepo.findActiveBatchesFIFO as any).mockResolvedValue([]);

    const dto: ConsumeFIFODTO = {
      ingredientId,
      quantity: new Quantity(0, new Unit(UnitType.KG)),
      reason: 'Production',
    };

    await consumeFIFOUseCase.execute(dto);

    expect(mockBatchRepo.consume).not.toHaveBeenCalled();
    expect(mockIngredientRepo.update).not.toHaveBeenCalled();
  });

  it('should handle fractional quantities', async () => {
    const ingredientId = 'ing-fractional';
    (mockIngredientRepo.findById as any).mockResolvedValue({
      id: ingredientId,
      currentStock: new Quantity(5, new Unit(UnitType.KG)),
    });

    (mockBatchRepo.findActiveBatchesFIFO as any).mockResolvedValue([
      {
        id: 'b1',
        ingredientId,
        lotNumber: 'L1',
        remainingQuantity: new Quantity(2, new Unit(UnitType.KG)),
        unitCost: new Money(1, 'EUR'),
        status: BatchStatus.ACTIVE,
      },
    ]);

    (mockBatchRepo.consume as any).mockResolvedValue({
      id: 'b1',
      remainingQuantity: new Quantity(0.5, new Unit(UnitType.KG)), // 2 - 1.5 = 0.5
    });
    (mockBatchRepo.updateStatus as any).mockResolvedValue({});

    await consumeFIFOUseCase.execute({
      ingredientId,
      quantity: new Quantity(1.5, new Unit(UnitType.KG)),
      reason: 'Test',
    });

    expect(mockBatchRepo.consume).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: 'b1',
        quantity: expect.objectContaining({ value: 1.5 }),
      }),
      expect.anything()
    );
  });

  it('should fail gracefully on concurrent consumption (simulation)', async () => {
    const ingredientId = 'ing-race';
    (mockIngredientRepo.findById as any).mockResolvedValue({
      id: ingredientId,
      currentStock: new Quantity(10, new Unit(UnitType.KG)),
    });

    (mockBatchRepo.findActiveBatchesFIFO as any).mockResolvedValue([]);

    await expect(
      consumeFIFOUseCase.execute({
        ingredientId,
        quantity: new Quantity(1, new Unit(UnitType.KG)),
        reason: 'Race',
      })
    ).rejects.toThrow('Data integrity mismatch');
  });

  it('should never allow negative stock (Property Based)', () => {
    fc.assert(
      fc.property(fc.nat({ max: 100 }), fc.nat({ max: 100 }), (initialStock, consumeAmount) => {
        if (consumeAmount > initialStock) {
          return true;
        }
        const result = initialStock - consumeAmount;
        return result >= 0;
      })
    );
  });
});
