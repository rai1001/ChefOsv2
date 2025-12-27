import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';
import { IIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
import { Unit } from '@/domain/types';

export interface Requirement {
    ingredientId: string;
    ingredientName: string;
    totalQuantity: number;
    unit: Unit;
}

@injectable()
export class CalculateRequirementsUseCase {
    constructor(
        @inject(TYPES.RecipeRepository) private recipeRepository: IRecipeRepository,
        @inject(TYPES.IngredientRepository) private ingredientRepository: IIngredientRepository
    ) { }

    async execute(items: { id: string, type: 'recipe' | 'ingredient', quantity: number }[]): Promise<Requirement[]> {
        const requirementsMap = new Map<string, Requirement>();

        for (const item of items) {
            if (item.type === 'recipe') {
                await this.explodeRecipe(item.id, item.quantity, requirementsMap);
            } else {
                await this.addIngredientRequirement(item.id, item.quantity, requirementsMap);
            }
        }

        return Array.from(requirementsMap.values());
    }

    private async explodeRecipe(recipeId: string, neededQuantity: number, map: Map<string, Requirement>) {
        const recipe = await this.recipeRepository.getRecipeById(recipeId);
        if (!recipe) return;

        // Logic: Recipe ingredients are for recipe.servings portions.
        // If we need 100 portions and recipe.servings is 10, multiplier is 10.
        const servings = recipe.servings || 1;
        const multiplier = neededQuantity / servings;

        for (const ri of recipe.ingredients) {
            const quantity = ri.quantity * multiplier;
            if (ri.type === 'recipe') {
                await this.explodeRecipe(ri.id, quantity, map);
            } else {
                await this.addIngredientRequirement(ri.id, quantity, map);
            }
        }
    }

    private async addIngredientRequirement(ingredientId: string, quantity: number, map: Map<string, Requirement>) {
        const ingredient = await this.ingredientRepository.getIngredientById(ingredientId);
        if (!ingredient) return;

        // Apply wastage factor if present (Gross = Net / (1 - Waste))
        const wastage = ingredient.wastageFactor || 0;
        const safeWastage = wastage >= 1 ? 0.99 : wastage;
        const grossQuantity = quantity / (1 - safeWastage);

        if (map.has(ingredientId)) {
            const existing = map.get(ingredientId)!;
            existing.totalQuantity += grossQuantity;
        } else {
            map.set(ingredientId, {
                ingredientId,
                ingredientName: ingredient.name,
                totalQuantity: grossQuantity,
                unit: ingredient.unit
            });
        }
    }
}
