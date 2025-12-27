import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetIngredientsUseCase } from './GetIngredientsUseCase';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';

describe('GetIngredientsUseCase', () => {
  let useCase: GetIngredientsUseCase;
  let mockRepository: IIngredientRepository;

  beforeEach(() => {
    mockRepository = {
      findByOutletId: vi.fn(),
    } as any;
    useCase = new GetIngredientsUseCase(mockRepository);
  });

  it('should return ingredients from the repository', async () => {
    const mockIngredients = [{ id: '1', name: 'Tomato' } as any];
    vi.mocked(mockRepository.findByOutletId).mockResolvedValue(mockIngredients);

    const result = await useCase.execute('outlet-1');

    expect(result).toEqual(mockIngredients);
    expect(mockRepository.findByOutletId).toHaveBeenCalledWith('outlet-1');
  });

  it('should throw error if outletId is missing', async () => {
    await expect(useCase.execute('')).rejects.toThrow('Outlet ID is required');
  });
});
