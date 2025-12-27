import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetInventoryStatusUseCase } from './GetInventoryStatusUseCase';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';
import { IStockTransactionRepository } from '../../infrastructure/repositories/IStockTransactionRepository';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit } from '../../domain/value-objects/Unit';

describe('GetInventoryStatusUseCase', () => {
  let useCase: GetInventoryStatusUseCase;
  let mockIngredientRepo: IIngredientRepository;
  let mockTransactionRepo: IStockTransactionRepository;

  beforeEach(() => {
    mockIngredientRepo = {
      findById: vi.fn(),
    } as any;
    mockTransactionRepo = {
      findByIngredientId: vi.fn(),
    } as any;
    useCase = new GetInventoryStatusUseCase(mockIngredientRepo, mockTransactionRepo);
  });

  it('should return inventory status for a valid ingredient', async () => {
    const mockQuantity = new Quantity(10, new Unit('kg' as any));
    const mockIngredient = { id: 'ing-1', currentStock: mockQuantity } as any;
    const mockTransactions = [{ id: 'tx-1' } as any];

    vi.mocked(mockIngredientRepo.findById).mockResolvedValue(mockIngredient);
    vi.mocked(mockTransactionRepo.findByIngredientId).mockResolvedValue(mockTransactions);

    const result = await useCase.execute('ing-1');

    expect(result.currentStock).toEqual(mockQuantity);
    expect(result.recentTransactions).toEqual(mockTransactions);
    expect(mockTransactionRepo.findByIngredientId).toHaveBeenCalledWith('ing-1', 10);
  });

  it('should throw error if ingredient not found', async () => {
    vi.mocked(mockIngredientRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute('none')).rejects.toThrow('Ingredient with ID none not found');
  });
});
