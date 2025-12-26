import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsumeFIFOUseCase, ConsumeFIFODTO } from './ConsumeFIFOUseCase';
import { IBatchRepository } from '../../domain/interfaces/repositories/IBatchRepository';
import { IIngredientRepository } from '../../domain/interfaces/repositories/IIngredientRepository';
import { ITransactionManager } from '../../domain/interfaces/ITransactionManager';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit, UnitType } from '../../domain/value-objects/Unit';
import { Money } from '../../domain/value-objects/Money';
import { BatchStatus } from '../../domain/entities/Batch';

describe('ConsumeFIFOUseCase', () => {
  let consumeFIFOUseCase: ConsumeFIFOUseCase;
  let mockBatchRepo: IBatchRepository;
  let mockIngredientRepo: IIngredientRepository;
  let mockTransactionManager: ITransactionManager;

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

    consumeFIFOUseCase = new ConsumeFIFOUseCase(
      mockBatchRepo,
      mockIngredientRepo,
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

    // Need to mock consume return (updated batch)
    (mockBatchRepo.consume as any).mockResolvedValue({});
    (mockBatchRepo.updateStatus as any).mockResolvedValue({});

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
        remainingQuantity: new Quantity(2, new Unit(UnitType.KG)),
        unitCost: Money.fromCents(100), // Add missing unitCost
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

    // Usually the UseCase checks this before consuming?
    // Or does it consume all and error?
    // UseCase logic: `if (totalAvailable < quantity.value) throw Error`

    await expect(consumeFIFOUseCase.execute(dto)).rejects.toThrow('Data integrity mismatch');
  });
});
