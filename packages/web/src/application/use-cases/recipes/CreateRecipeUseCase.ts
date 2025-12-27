import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';
import { Recipe } from '@/domain/entities/Recipe';
import { CalculateRecipeCostUseCase } from './CalculateRecipeCostUseCase';

@injectable()
export class CreateRecipeUseCase {
    constructor(
        @inject(TYPES.RecipeRepository) private repository: IRecipeRepository,
        @inject(TYPES.CalculateRecipeCostUseCase) private calculateCost: CalculateRecipeCostUseCase
    ) { }

    async execute(recipe: Recipe): Promise<void> {
        // Initial create
        await this.repository.createRecipe(recipe);
        // Calculate costs immediately
        await this.calculateCost.execute(recipe.id);
    }
}
