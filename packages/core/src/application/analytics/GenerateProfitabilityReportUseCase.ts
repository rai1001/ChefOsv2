import { FichaTecnica } from '../../domain/entities/FichaTecnica';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';
import { Money } from '../../domain/value-objects/Money';

export interface ProfitabilityItem {
  id: string;
  name: string;
  cost: Money;
  price: Money;
  profit: Money;
  marginPercent: number;
}

export interface ProfitabilityReport {
  items: ProfitabilityItem[];
  totalRevenue: Money;
  totalCost: Money;
  totalProfit: Money;
  averageMarginPercent: number;
}

export class GenerateProfitabilityReportUseCase {
  constructor(private readonly recipeRepository: IFichaTecnicaRepository) {}

  async execute(outletId?: string): Promise<ProfitabilityReport> {
    const recipes = outletId ? await this.recipeRepository.findByOutletId(outletId) : [];

    let totalRevenueAmt = 0;
    let totalCostAmt = 0;

    const items: ProfitabilityItem[] = recipes.map((recipe: FichaTecnica) => {
      const priceAmt = recipe.sellingPrice?.amount ?? 0;
      const costAmt = recipe.totalCost?.amount ?? 0;
      const profitAmt = priceAmt - costAmt;

      const marginPercent = priceAmt > 0 ? (profitAmt / priceAmt) * 100 : 0;

      // Assume 1 sale for static analysis, or integrate sales data if available
      // For a "Potential Profitability" report, we just look at unit economics.

      totalRevenueAmt += priceAmt;
      totalCostAmt += costAmt;

      return {
        id: recipe.id,
        name: recipe.name,
        cost: Money.fromCents(costAmt),
        price: Money.fromCents(priceAmt),
        profit: Money.fromCents(profitAmt),
        marginPercent,
      };
    });

    const totalProfitAmt = totalRevenueAmt - totalCostAmt;
    const averageMarginPercent = totalRevenueAmt > 0 ? (totalProfitAmt / totalRevenueAmt) * 100 : 0;

    return {
      items,
      totalRevenue: Money.fromCents(totalRevenueAmt),
      totalCost: Money.fromCents(totalCostAmt),
      totalProfit: Money.fromCents(totalProfitAmt),
      averageMarginPercent,
    };
  }
}
