import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalculateRecipeCostUseCase } from './CalculateRecipeCostUseCase';
import { Recipe as LegacyRecipe } from '@/domain/entities/Recipe';
import { CalculateFichaCostUseCase as CoreCalculateRecipeCostUseCase } from '@culinaryos/core/use-cases/fichas/CalculateFichaCostUseCase';
import { RecipeAdapter } from '@/adapters/RecipeAdapter';

// Mock RecipeAdapter
vi.mock('@/adapters/RecipeAdapter', () => ({
  RecipeAdapter: {
    toLegacy: vi.fn((ficha) => ({ id: ficha.id, name: ficha.name, legacy: true })),
  },
}));

describe('CalculateRecipeCostUseCase', () => {
  let useCase: CalculateRecipeCostUseCase;
  let mockCoreUseCase: CoreCalculateRecipeCostUseCase;

  beforeEach(() => {
    mockCoreUseCase = {
      execute: vi.fn(),
    } as any;
    useCase = new CalculateRecipeCostUseCase(mockCoreUseCase);
  });

  it('delegates calculation to core and returns legacy recipe', async () => {
    const ficha = { id: '1', name: 'Test' } as any;
    vi.mocked(mockCoreUseCase.execute).mockResolvedValue(ficha);

    const result = await useCase.execute('1');

    expect(mockCoreUseCase.execute).toHaveBeenCalledWith('1');
    expect(RecipeAdapter.toLegacy).toHaveBeenCalledWith(ficha);
    expect(result).toEqual({ id: '1', name: 'Test', legacy: true });
  });

  it('returns null if core use case returns null', async () => {
    vi.mocked(mockCoreUseCase.execute).mockResolvedValue(null);
    const result = await useCase.execute('none');
    expect(result).toBeNull();
  });
});
