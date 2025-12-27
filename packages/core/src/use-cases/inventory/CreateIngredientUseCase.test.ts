import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateIngredientUseCase } from './CreateIngredientUseCase';
import { IIngredientRepository } from '../../domain/interfaces/repositories/IIngredientRepository';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit, UnitType } from '../../domain/value-objects/Unit';
import { CreateIngredientDTO } from '../../domain/entities/Ingredient';

describe('CreateIngredientUseCase', () => {
  let useCase: CreateIngredientUseCase;
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
    useCase = new CreateIngredientUseCase(mockRepo);
  });

  it('should create an ingredient successfully', async () => {
    const dto: CreateIngredientDTO = {
      name: 'Tomato',
      outletId: 'outlet-1',
      category: 'produce',
      unit: 'kg',
      minimumStock: new Quantity(5, new Unit(UnitType.KG)),
    };

    const expectedIngredient = {
      id: 'new-id',
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
      currentStock: new Quantity(0, new Unit(UnitType.KG)),
    };
    vi.mocked(mockRepo.create).mockResolvedValue(expectedIngredient as any);

    const result = await useCase.execute(dto);

    expect(result).toBe(expectedIngredient);
    expect(mockRepo.create).toHaveBeenCalledWith(dto);
  });

  it('should throw error if name is missing', async () => {
    const dto: any = {
      outletId: 'outlet-1',
      category: 'produce',
      unit: 'kg',
      minimumStock: new Quantity(5, new Unit(UnitType.KG)),
    };

    await expect(useCase.execute(dto)).rejects.toThrow('Ingredient name is required');
  });

  it('should throw error if outletId is missing', async () => {
    const dto: any = {
      name: 'Tomato',
      category: 'produce',
      unit: 'kg',
      minimumStock: new Quantity(5, new Unit(UnitType.KG)),
    };

    await expect(useCase.execute(dto)).rejects.toThrow('Outlet ID is required');
  });
});
