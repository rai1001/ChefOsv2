import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateRecipeUseCase } from '../CreateRecipeUseCase';
import { Recipe } from '@/domain/entities/Recipe';

describe('CreateRecipeUseCase', () => {
  let useCase: CreateRecipeUseCase;
  let mockCoreUseCase: any;
  let mockCalculateCost: any;

  beforeEach(() => {
    mockCoreUseCase = {
      execute: vi.fn(),
    };
    mockCalculateCost = {
      execute: vi.fn(),
    };
    useCase = new CreateRecipeUseCase(mockCoreUseCase, mockCalculateCost);
  });

  it('should create recipe and calculate cost', async () => {
    const recipe: Recipe = {
      id: '123',
      name: 'Test Recipe',
      ingredients: [],
    } as any;

    await useCase.execute(recipe);

    expect(mockCoreUseCase.execute).toHaveBeenCalled();
    expect(mockCalculateCost.execute).toHaveBeenCalledWith('123');
  });
});
