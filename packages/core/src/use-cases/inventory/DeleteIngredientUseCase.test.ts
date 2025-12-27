import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteIngredientUseCase } from './DeleteIngredientUseCase';
import { IIngredientRepository } from '../../domain/interfaces/repositories/IIngredientRepository';

describe('DeleteIngredientUseCase', () => {
  let useCase: DeleteIngredientUseCase;
  let mockRepo: IIngredientRepository;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByOutletId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByCategory: vi.fn(),
      findLowStock: vi.fn(),
    } as unknown as IIngredientRepository;
    useCase = new DeleteIngredientUseCase(mockRepo);
  });

  it('should delete an ingredient successfully', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue({ id: '1' } as any);

    await useCase.execute('1');

    expect(mockRepo.delete).toHaveBeenCalledWith('1');
  });

  it('should throw error if ingredient not found', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(
      'Ingredient with ID non-existent not found'
    );
  });
});
