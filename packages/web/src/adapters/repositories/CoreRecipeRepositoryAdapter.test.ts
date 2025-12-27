import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoreRecipeRepositoryAdapter } from './CoreRecipeRepositoryAdapter';
import { IRecipeRepository as ILegacyRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';
import { Recipe as LegacyRecipe } from '@/domain/entities/Recipe';
import { Quantity } from '@culinaryos/core/domain/value-objects/Quantity';
import { Unit } from '@culinaryos/core/domain/value-objects/Unit';

// Mock RecipeAdapter
vi.mock('../RecipeAdapter', () => ({
  RecipeAdapter: {
    toCore: vi.fn((legacy) => ({ id: legacy.id, name: legacy.name, mapped: true })),
    toLegacy: vi.fn((core) => ({ id: core.id, name: core.name, legacy: true })),
  },
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mocked-uuid'),
}));

describe('CoreRecipeRepositoryAdapter', () => {
  let adapter: CoreRecipeRepositoryAdapter;
  let mockLegacyRepo: ILegacyRecipeRepository;

  beforeEach(() => {
    mockLegacyRepo = {
      getRecipes: vi.fn(),
      getRecipeById: vi.fn(),
      createRecipe: vi.fn(),
      updateRecipe: vi.fn(),
      deleteRecipe: vi.fn(),
      searchRecipes: vi.fn(),
    } as unknown as ILegacyRecipeRepository;

    adapter = new CoreRecipeRepositoryAdapter(mockLegacyRepo);
  });

  it('findByOutletId calls getRecipes and maps results', async () => {
    const legacyRecipes = [{ id: '1', name: 'Recipe 1' } as LegacyRecipe];
    vi.mocked(mockLegacyRepo.getRecipes).mockResolvedValue(legacyRecipes);

    const result = await adapter.findByOutletId('outlet-123');

    expect(mockLegacyRepo.getRecipes).toHaveBeenCalledWith('outlet-123');
    expect(result[0]).toEqual({ id: '1', name: 'Recipe 1', mapped: true });
  });

  it('create generates ID and delegates to legacyRepo', async () => {
    const dto = {
      name: 'Paella',
      outletId: 'outlet-1',
      yield: new Quantity(4, new Unit('portion')),
      ingredients: [],
    } as any;

    const result = await adapter.create(dto);

    expect(result.id).toBe('mocked-uuid');
    expect(mockLegacyRepo.createRecipe).toHaveBeenCalled();
    const createdLegacy = vi.mocked(mockLegacyRepo.createRecipe).mock.calls[0][0];
    expect(createdLegacy.name).toBe('Paella');
    expect(createdLegacy.legacy).toBe(true);
  });

  it('update fetches existing and delegates to legacyRepo', async () => {
    const existingLegacy = { id: '1', name: 'Old' } as LegacyRecipe;
    vi.mocked(mockLegacyRepo.getRecipeById).mockResolvedValue(existingLegacy);

    const dto = { name: 'New' } as any;
    const result = await adapter.update('1', dto);

    expect(mockLegacyRepo.getRecipeById).toHaveBeenCalledWith('1');
    expect(mockLegacyRepo.updateRecipe).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ name: 'New', legacy: true })
    );
    expect(result.name).toBe('New');
  });

  it('delete delegates to legacyRepo', async () => {
    await adapter.delete('1');
    expect(mockLegacyRepo.deleteRecipe).toHaveBeenCalledWith('1');
  });
});
