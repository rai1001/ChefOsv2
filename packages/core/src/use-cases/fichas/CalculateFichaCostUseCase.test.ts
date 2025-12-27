import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalculateFichaCostUseCase } from './CalculateFichaCostUseCase';
import { IFichaTecnicaRepository } from '../../domain/interfaces/repositories/IFichaTecnicaRepository';
import { IIngredientRepository } from '../../domain/interfaces/repositories/IIngredientRepository';
import { Money } from '../../domain/value-objects/Money';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit } from '../../domain/value-objects/Unit';
import { FichaTecnica } from '../../domain/entities/FichaTecnica';

describe('CalculateFichaCostUseCase', () => {
  let useCase: CalculateFichaCostUseCase;
  let mockFichaRepo: IFichaTecnicaRepository;
  let mockIngredientRepo: IIngredientRepository;

  beforeEach(() => {
    mockFichaRepo = {
      findById: vi.fn(),
      update: vi.fn(),
    } as any;
    mockIngredientRepo = {
      findById: vi.fn(),
    } as any;
    useCase = new CalculateFichaCostUseCase(mockFichaRepo, mockIngredientRepo);
  });

  it('calculates cost for a simple recipe with raw ingredients', async () => {
    const ficha: FichaTecnica = {
      id: 'ficha-1',
      outletId: 'outlet-1',
      name: 'Simple Salad',
      category: 'Salad',
      yield: new Quantity(1, new Unit('portion' as any)),
      ingredients: [
        {
          ingredientId: 'ing-1',
          ingredientName: 'Tomato',
          type: 'raw',
          quantity: new Quantity(0.2, new Unit('kg' as any)),
          wastePercentage: 0.1, // 10% waste
        },
      ],
      version: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ingredient = {
      id: 'ing-1',
      lastCost: Money.fromCents(100), // $1.00 per kg
    } as any;

    vi.mocked(mockFichaRepo.findById).mockResolvedValue(ficha);
    vi.mocked(mockIngredientRepo.findById).mockResolvedValue(ingredient);

    const result = await useCase.execute('ficha-1');

    expect(result).not.toBeNull();
    // 0.2 kg * 100 cents * 1.1 = 22 cents
    expect(result?.ingredients[0].totalCost?.centsValue).toBe(22);
    expect(result?.totalCost?.centsValue).toBe(22);
    expect(result?.costPerPortion?.centsValue).toBe(22);
  });

  it('handles labor and packaging costs', async () => {
    const ficha: FichaTecnica = {
      id: 'ficha-1',
      yield: new Quantity(2, new Unit('portion')),
      ingredients: [],
      laborCost: Money.fromCents(500),
      packagingCost: Money.fromCents(100),
    } as any;

    vi.mocked(mockFichaRepo.findById).mockResolvedValue(ficha);

    const result = await useCase.execute('ficha-1');

    expect(result?.totalCost?.centsValue).toBe(600);
    expect(result?.costPerPortion?.centsValue).toBe(300);
  });

  it('calculates recursive costs for sub-recipes', async () => {
    const mainFicha: FichaTecnica = {
      id: 'main-ficha',
      yield: new Quantity(1, new Unit('portion')),
      ingredients: [
        {
          ingredientId: 'sub-ficha',
          type: 'recipe',
          quantity: new Quantity(1, new Unit('portion')),
        },
      ],
    } as any;

    const subFicha: FichaTecnica = {
      id: 'sub-ficha',
      yield: new Quantity(1, new Unit('portion')),
      ingredients: [],
      laborCost: Money.fromCents(100),
    } as any;

    vi.mocked(mockFichaRepo.findById).mockImplementation(async (id) => {
      if (id === 'main-ficha') return mainFicha;
      if (id === 'sub-ficha') return subFicha;
      return null;
    });

    const result = await useCase.execute('main-ficha');

    expect(result?.totalCost?.centsValue).toBe(100);
    expect(mockFichaRepo.findById).toHaveBeenCalledTimes(2);
  });
});
