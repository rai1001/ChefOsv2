import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateProfitabilityReportUseCase } from './GenerateProfitabilityReportUseCase';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';
import { Money } from '../../domain/value-objects/Money';

describe('GenerateProfitabilityReportUseCase', () => {
  let useCase: GenerateProfitabilityReportUseCase;
  let mockRecipeRepository: IFichaTecnicaRepository;

  beforeEach(() => {
    mockRecipeRepository = {
      findByOutletId: vi.fn(),
    } as any;
    useCase = new GenerateProfitabilityReportUseCase(mockRecipeRepository);
  });

  it('should generate a correct report for multiple recipes', async () => {
    const mockRecipes = [
      {
        id: '1',
        name: 'Recipe A',
        sellingPrice: Money.fromCents(1000), // $10.00
        totalCost: Money.fromCents(600), // $6.00
      },
      {
        id: '2',
        name: 'Recipe B',
        sellingPrice: Money.fromCents(2000), // $20.00
        totalCost: Money.fromCents(500), // $5.00
      },
    ] as any[];

    vi.mocked(mockRecipeRepository.findByOutletId).mockResolvedValue(mockRecipes);

    const report = await useCase.execute('outlet-1');

    expect(report.items).toHaveLength(2);

    // Recipe A: Profit = 4.00, Margin = 40%
    expect(report.items[0].profit.amount).toBe(4);
    expect(report.items[0].marginPercent).toBe(40);

    // Recipe B: Profit = 15.00, Margin = 75%
    expect(report.items[1].profit.amount).toBe(15);
    expect(report.items[1].marginPercent).toBe(75);

    // Totals
    // Revenue = 10 + 20 = 30
    // Cost = 6 + 5 = 11
    // Profit = 19
    expect(report.totalRevenue.amount).toBe(30);
    expect(report.totalCost.amount).toBe(11);
    expect(report.totalProfit.amount).toBe(19);

    // Avg Margin = (19 / 30) * 100 = 63.33%
    expect(report.averageMarginPercent).toBeCloseTo(63.33, 1);
  });

  it('should handle recipes with no selling price', async () => {
    const mockRecipes = [
      {
        id: '3',
        name: 'Cost-only Recipe',
        sellingPrice: undefined,
        totalCost: Money.fromCents(500),
      },
    ] as any[];

    vi.mocked(mockRecipeRepository.findByOutletId).mockResolvedValue(mockRecipes);

    const report = await useCase.execute('outlet-1');

    expect(report.items[0].marginPercent).toBe(0);
    expect(report.totalRevenue.amount).toBe(0);
    expect(report.totalProfit.amount).toBe(-5);
  });
});
