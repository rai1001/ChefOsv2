import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddBatchUseCase } from './AddBatchUseCase';
import { IBatchRepository } from '../../domain/interfaces/repositories/IBatchRepository';
import { IIngredientRepository } from '../../domain/interfaces/repositories/IIngredientRepository';
import { ITransactionManager } from '../../domain/interfaces/ITransactionManager';
import { CreateBatchDTO } from '../../domain/entities/Batch';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit, UnitType } from '../../domain/value-objects/Unit';
import { Money } from '../../domain/value-objects/Money';

describe('AddBatchUseCase', () => {
  let addBatchUseCase: AddBatchUseCase;
  let mockBatchRepo: IBatchRepository;
  let mockIngredientRepo: IIngredientRepository;
  let mockTransactionManager: ITransactionManager;

  beforeEach(() => {
    mockBatchRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIngredient: vi.fn(),
      findActiveBatchesFIFO: vi.fn(),
      findExpiringSoon: vi.fn(),
      consume: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    } as unknown as IBatchRepository; // Partial mock

    mockIngredientRepo = {
      findById: vi.fn(),
      update: vi.fn(),
    } as unknown as IIngredientRepository;

    mockTransactionManager = {
      runTransaction: vi.fn((cb) => cb('mock-txn')),
    } as unknown as ITransactionManager;

    addBatchUseCase = new AddBatchUseCase(
      mockBatchRepo,
      mockIngredientRepo,
      mockTransactionManager
    );
  });

  it('should successfully add a batch and update ingredient stock', async () => {
    const ingredientId = 'ing-1';
    const outletId = 'outlet-1';

    const mockIngredient = {
      id: ingredientId,
      outletId,
      name: 'Flour',
      currentStock: new Quantity(10, new Unit(UnitType.KG)),
      unit: UnitType.KG,
    };

    (mockIngredientRepo.findById as any).mockResolvedValue(mockIngredient);

    // Mock Batch Creation Return
    const createdBatch = {
      id: 'batch-1',
      ingredientId,
      lotNumber: 'L1',
      quantity: new Quantity(5, new Unit(UnitType.KG)),
    };
    (mockBatchRepo.create as any).mockResolvedValue(createdBatch);

    const dto: CreateBatchDTO = {
      ingredientId,
      outletId,
      lotNumber: 'L1',
      quantity: new Quantity(5, new Unit(UnitType.KG)),
      unitCost: Money.fromCents(100), // 1.00
      supplier: 'Supplier A',
      expiryDate: new Date(),
      receivedDate: new Date(),
    };

    const result = await addBatchUseCase.execute(dto);

    // Verify Ingredient Lookup
    expect(mockIngredientRepo.findById).toHaveBeenCalledWith(ingredientId, {
      transaction: 'mock-txn',
    });

    // Verify Batch Creation
    expect(mockBatchRepo.create).toHaveBeenCalledWith(dto, { transaction: 'mock-txn' });

    // Verify Ingredient Update (10 + 5 = 15)
    expect(mockIngredientRepo.update).toHaveBeenCalledWith(
      ingredientId,
      expect.objectContaining({
        currentStock: expect.objectContaining({
          value: 15,
          unit: expect.objectContaining({ type: UnitType.KG }),
        }),
        lastCost: expect.objectContaining({ cents: 100, currency: 'USD' }),
      }),
      { transaction: 'mock-txn' }
    );

    expect(result).toEqual(createdBatch);
  });

  it('should throw error if ingredient not found', async () => {
    (mockIngredientRepo.findById as any).mockResolvedValue(null);

    const dto: CreateBatchDTO = {
      ingredientId: 'missing',
      outletId: 'outlet-1',
      lotNumber: 'L1',
      quantity: new Quantity(5, new Unit(UnitType.KG)),
      unitCost: Money.fromCents(100),
      supplier: 'Supplier A',
      expiryDate: new Date(),
      receivedDate: new Date(),
    };

    await expect(addBatchUseCase.execute(dto)).rejects.toThrow(
      'Ingredient with ID'
    );
  });
});
