import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';
import { Recipe } from '@/domain/entities/Recipe';
import { CalculateRecipeCostUseCase } from './CalculateRecipeCostUseCase';

@injectable()
export class UpdateRecipeUseCase {
    constructor(
        @inject(TYPES.RecipeRepository) private repository: IRecipeRepository,
        @inject(TYPES.CalculateRecipeCostUseCase) private calculateCost: CalculateRecipeCostUseCase
    ) { }

    async execute(id: string, updates: Partial<Recipe>): Promise<void> {
        await this.repository.updateRecipe(id, updates);
        // Recalculate if ingredients or costs changed
        // For simplicity, always recalculate on update
        await this.calculateCost.execute(id);
    }
}
