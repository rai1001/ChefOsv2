import { injectable, inject } from "inversify";
import { TYPES } from "../../di/types";
import { IRecipeRepository } from "../../../domain/interfaces/repositories/IRecipeRepository";
import { MenuEngineeringResult, BCGStats } from "../../../domain/entities/MenuEngineering";
import { Recipe } from "../../../domain/entities/Recipe";

@injectable()
export class CalculateBCGMatrixUseCase {
    constructor(
        @inject(TYPES.RecipeRepository) private recipeRepository: IRecipeRepository
    ) { }

    async execute(): Promise<MenuEngineeringResult> {
        const recipes = await this.recipeRepository.getRecipes();

        if (recipes.length === 0) {
            return {
                statistics: [],
                averages: { margin: 0, popularity: 0 },
                totals: { contribution: 0, volume: 0 }
            };
        }

        // 1. Prepare base data and calculate totals
        let totalContribution = 0;
        let totalVolume = 0;

        const stats: BCGStats[] = recipes.map((recipe: Recipe) => {
            const margin = recipe.sellingPrice - (recipe.totalCost || 0);
            // In a real app, salesCount would come from POS or a dedicated field
            // Here we use a fallback or random seed for the demo if it's 0
            const sales = (recipe as any).salesCount || Math.floor(Math.random() * 100);
            const contribution = margin * sales;

            totalContribution += contribution;
            totalVolume += sales;

            return {
                id: recipe.id,
                name: recipe.name,
                margin,
                sales,
                contribution,
                type: 'dog' // Placeholder
            };
        });

        // 2. Calculate Averages (The thresholds)
        const avgMargin = totalVolume > 0 ? totalContribution / totalVolume : 0;
        const avgPopularity = stats.length > 0 ? totalVolume / stats.length : 0;

        // 3. Categorize
        stats.forEach(s => {
            const isHighMargin = s.margin >= avgMargin;
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
                popularity: avgPopularity
            },
            totals: {
                contribution: totalContribution,
                volume: totalVolume
            }
        };
    }
}
