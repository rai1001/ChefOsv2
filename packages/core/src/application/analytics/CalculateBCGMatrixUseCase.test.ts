import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalculateBCGMatrixUseCase } from './CalculateBCGMatrixUseCase';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';
import { Money } from '../../domain/value-objects/Money';

describe('CalculateBCGMatrixUseCase', () => {
  let useCase: CalculateBCGMatrixUseCase;
  let mockRecipeRepo: IFichaTecnicaRepository;

  beforeEach(() => {
    mockRecipeRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByOutletId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    } as unknown as IFichaTecnicaRepository;

    useCase = new CalculateBCGMatrixUseCase(mockRecipeRepo);
  });

  it('should return empty result when no recipes found', async () => {
    vi.mocked(mockRecipeRepo.findByOutletId).mockResolvedValue([]);

    const result = await useCase.execute('outlet-1');

    expect(result.statistics).toHaveLength(0);
    expect(result.averages.margin.amount).toBe(0);
    expect(result.averages.popularity).toBe(0);
  });

  it('should correctly categorize recipes into BCG types', async () => {
    const mockRecipes = [
      {
        id: '1',
        name: 'Star Recipe',
        totalCost: Money.fromCents(500),
        sellingPrice: Money.fromCents(1500),
        salesCount: 80, // High Price, High Sales
      },
      {
        id: '2',
        name: 'Plowhorse Recipe',
        totalCost: Money.fromCents(800),
        sellingPrice: Money.fromCents(1000),
        salesCount: 100, // Low Price, High Sales
      },
      {
        id: '3',
        name: 'Puzzle Recipe',
        totalCost: Money.fromCents(500),
        sellingPrice: Money.fromCents(2000),
        salesCount: 20, // High Price, Low Sales
      },
      {
        id: '4',
        name: 'Dog Recipe',
        totalCost: Money.fromCents(900),
        sellingPrice: Money.fromCents(1000),
        salesCount: 10, // Low Price, Low Sales
      },
    ];

    vi.mocked(mockRecipeRepo.findByOutletId).mockResolvedValue(mockRecipes as any);

    const result = await useCase.execute('outlet-1');

    // Totals check
    expect(result.totals.volume).toBe(210);

    // Star: Margen 1000, Pop 80. Avg Margen (Total Contrib / Total Vol), Avg Pop (Total Vol / Count)
    // Contribs: 1000*80 (80k), 200*100 (20k), 1500*20 (30k), 100*10 (1k) -> Total 131k
    // Avg Margin = 131000 / 210 = 623.8
    // Avg Pop = 210 / 4 = 52.5

    const star = result.statistics.find((s) => s.id === '1');
    const plowhorse = result.statistics.find((s) => s.id === '2');
    const puzzle = result.statistics.find((s) => s.id === '3');
    const dog = result.statistics.find((s) => s.id === '4');

    expect(star?.type).toBe('star'); // 1000 >= 623.8 && 80 >= 52.5
    expect(plowhorse?.type).toBe('plowhorse'); // 200 < 623.8 && 100 >= 52.5
    expect(puzzle?.type).toBe('puzzle'); // 1500 >= 623.8 && 20 < 52.5
    expect(dog?.type).toBe('dog'); // 100 < 623.8 && 10 < 52.5
  });

  it('should handle recipes with missing cost or price', async () => {
    const mockRecipes = [
      {
        id: '1',
        name: 'Incomplete Recipe',
        totalCost: undefined,
        sellingPrice: undefined,
        salesCount: 10,
      },
    ];

    vi.mocked(mockRecipeRepo.findByOutletId).mockResolvedValue(mockRecipes as any);

    const result = await useCase.execute('outlet-1');

    expect(result.statistics[0].margin.amount).toBe(0);
    expect(result.statistics[0].type).toBe('star'); // Only one item, so it's its own average
  });
});
