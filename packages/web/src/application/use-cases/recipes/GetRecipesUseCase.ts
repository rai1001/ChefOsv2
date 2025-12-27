import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';
import { Recipe } from '@/domain/entities/Recipe';

@injectable()
export class GetRecipesUseCase {
    constructor(@inject(TYPES.RecipeRepository) private repository: IRecipeRepository) { }

    async execute(outletId?: string): Promise<Recipe[]> {
        return this.repository.getRecipes(outletId);
    }
}
