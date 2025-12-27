import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';
import { IIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
import { Recipe } from '@/domain/entities/Recipe';

@injectable()
export class CalculateRecipeCostUseCase {
    constructor(
        @inject(TYPES.RecipeRepository) private recipeRepository: IRecipeRepository,
        @inject(TYPES.IngredientRepository) private ingredientRepository: IIngredientRepository
    ) { }

    async execute(recipeId: string, depth = 0): Promise<Recipe | null> {
        if (depth > 5) {
            console.warn(`Max recursion depth reached for recipe ${recipeId}`);
            return null; // Prevent infinite loops
        }

        const recipe = await this.recipeRepository.getRecipeById(recipeId);
        if (!recipe) return null;

        let totalIngredientsCost = 0;

        // Iterate over ingredients
        for (const item of recipe.ingredients) {
            let unitCost = 0;

            if (item.type === 'raw') {
                const ingredient = await this.ingredientRepository.getIngredientById(item.id);
                if (ingredient) {
                    unitCost = ingredient.costPerUnit;
                    // Optional: Check unit conversion if item.unit !== ingredient.unit
                    // For MVP assume units match or normalized to base unit (kg/L)
                }
            } else if (item.type === 'recipe') {
                // Recursive calculation
                const subRecipe = await this.execute(item.id, depth + 1);
                if (subRecipe) {
                    unitCost = subRecipe.costPerServing; // Or totalCost / yieldQuantity? 
                    // Usually recipes are used by portion or by weight. 
                    // Let's assume quantity is in 'serving' units if it's a sub-recipe, or we need conversion.
                    // Simplified: sub-recipe usage is by "unit" which is 1 serving.
                    // If sub-recipe yield unit is KG, and usage is KG, then usage * costPerUnit (where costPerUnit = totalCost / yieldQuantity)

                    if (subRecipe.yieldQuantity > 0) {
                        unitCost = subRecipe.totalCost / subRecipe.yieldQuantity;
                    }
                }
            }

            // Update item snapshot cost
            item.unitCost = unitCost;
            item.grossCost = item.quantity * unitCost * (1 + (item.wastePercentage || 0));

            totalIngredientsCost += item.grossCost;
        }

        // Add fixed costs
        const totalProductionCost = totalIngredientsCost + (recipe.laborCost || 0) + (recipe.packagingCost || 0);

        // Update Recipe Financials
        recipe.totalCost = totalProductionCost;
        recipe.costPerServing = recipe.servings > 0 ? totalProductionCost / recipe.servings : 0;

        if (recipe.sellingPrice > 0) {
            recipe.foodCostPercent = (recipe.costPerServing / recipe.sellingPrice) * 100;
            recipe.grossMargin = recipe.sellingPrice - recipe.costPerServing;
        }

        // Persist updates
        await this.recipeRepository.updateRecipe(recipe.id, recipe);

        return recipe;
    }
}
