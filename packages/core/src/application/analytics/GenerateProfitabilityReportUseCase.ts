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

    let totalRevenueCents = 0;
    let totalCostCents = 0;

    const items: ProfitabilityItem[] = recipes.map((recipe: FichaTecnica) => {
      const priceCents = recipe.sellingPrice?.centsValue ?? 0;
      const costCents = recipe.totalCost?.centsValue ?? 0;
      const profitCents = priceCents - costCents;

      const marginPercent = priceCents > 0 ? (profitCents / priceCents) * 100 : 0;

      totalRevenueCents += priceCents;
      totalCostCents += costCents;

      return {
        id: recipe.id,
        name: recipe.name,
        cost: Money.fromCents(costCents),
        price: Money.fromCents(priceCents),
        profit: Money.fromCents(profitCents),
        marginPercent,
      };
    });

    const totalProfitCents = totalRevenueCents - totalCostCents;
    const averageMarginPercent =
      totalRevenueCents > 0 ? (totalProfitCents / totalRevenueCents) * 100 : 0;

    return {
      items,
      totalRevenue: Money.fromCents(totalRevenueCents),
      totalCost: Money.fromCents(totalCostCents),
      totalProfit: Money.fromCents(totalProfitCents),
      averageMarginPercent,
    };
  }
}
