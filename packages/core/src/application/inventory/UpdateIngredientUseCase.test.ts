import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateIngredientUseCase } from './UpdateIngredientUseCase';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit, UnitType } from '../../domain/value-objects/Unit';
import { UpdateIngredientDTO } from '../../domain/entities/Ingredient';

describe('UpdateIngredientUseCase', () => {
  let useCase: UpdateIngredientUseCase;
  let mockRepo: IIngredientRepository;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByOutletId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findByCategory: vi.fn(),
      findLowStock: vi.fn(),
    } as unknown as IIngredientRepository;
    useCase = new UpdateIngredientUseCase(mockRepo);
  });

  it('should update an ingredient successfully', async () => {
    const existingIngredient = { id: '1', name: 'Tomato' };
    vi.mocked(mockRepo.findById).mockResolvedValue(existingIngredient as any);

    const dto: UpdateIngredientDTO = {
      name: 'Better Tomato',
      minimumStock: new Quantity(10, new Unit(UnitType.KG)),
    };

    const expectedIngredient = { ...existingIngredient, ...dto };
    vi.mocked(mockRepo.update).mockResolvedValue(expectedIngredient as any);

    const result = await useCase.execute('1', dto);

    expect(result).toBe(expectedIngredient);
    expect(mockRepo.update).toHaveBeenCalledWith('1', dto);
  });

  it('should throw error if ingredient not found', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute('non-existent', {})).rejects.toThrow(
      'Ingredient with ID non-existent not found'
    );
  });
});
