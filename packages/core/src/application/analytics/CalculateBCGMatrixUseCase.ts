import { FichaTecnica } from '../../domain/entities/FichaTecnica';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';
import { MenuEngineeringResult, BCGStats } from '../../domain/entities/MenuEngineering';
import { Money } from '../../domain/value-objects/Money';

export class CalculateBCGMatrixUseCase {
  constructor(private readonly recipeRepository: IFichaTecnicaRepository) {}

  async execute(outletId?: string): Promise<MenuEngineeringResult> {
    const recipes = outletId ? await this.recipeRepository.findByOutletId(outletId) : []; // TODO: Global fetch support?

    if (recipes.length === 0) {
      return {
        statistics: [],
        averages: { margin: new Money(0), popularity: 0 },
        totals: { contribution: new Money(0), volume: 0 },
      };
    }

    // 1. Prepare base data and calculate totals
    let totalContributionAmount = 0;
    let totalVolume = 0;

    const stats: BCGStats[] = recipes.map((recipe: FichaTecnica) => {
      // Calculate Margin
      const costAmount = recipe.totalCost?.amount ?? 0;
      const priceAmount = recipe.sellingPrice?.amount ?? 0;
      const marginAmount = priceAmount - costAmount;
      const margin = Money.fromCents(marginAmount);

      // In a real app, salesCount would come from POS or a dedicated field
      // Logic from Web implementation:
      const sales = (recipe as any).salesCount || Math.floor(Math.random() * 100); // Placeholder logic

      const contributionAmount = marginAmount * sales;
      const contribution = Money.fromCents(contributionAmount);

      totalContributionAmount += contributionAmount;
      totalVolume += sales;

      const costPercentage = priceAmount > 0 ? (costAmount / priceAmount) * 100 : 0;

      return {
        id: recipe.id,
        name: recipe.name,
        margin,
        sales,
        contribution,
        type: 'dog', // Placeholder, calculated later
        costPercentage,
      };
    });

    // 2. Calculate Averages (The thresholds)
    const avgMarginAmount = totalVolume > 0 ? totalContributionAmount / totalVolume : 0;
    const avgMargin = Money.fromCents(avgMarginAmount);

    // Average Popularity (Sales Mix %)
    // "The menu mix benchmark is calculated by taking 100% and dividing it by the number of items on your menu. The result is then multiplied by 0.7" - Common standard
    // Or mostly simplified: Avg Sales = Total Sales / Count
    const avgPopularity = stats.length > 0 ? totalVolume / stats.length : 0;

    // 3. Categorize
    stats.forEach((s) => {
      const isHighMargin = s.margin.amount >= avgMargin.amount;
      const isHighPop = s.sales >= avgPopularity;

      if (isHighMargin && isHighPop) s.type = 'star';
      else if (isHighMargin && !isHighPop) s.type = 'puzzle';
      else if (!isHighMargin && isHighPop) s.type = 'plowhorse';
      else s.type = 'dog';
    });

    return {
      statistics: stats,
      averages: {
        margin: avgMargin,
        popularity: avgPopularity,
      },
      totals: {
        contribution: Money.fromCents(totalContributionAmount),
        volume: totalVolume,
      },
    };
  }
}
