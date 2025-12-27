import { Recipe } from '../../entities/Recipe';

export interface IRecipeRepository {
    getRecipes(outletId?: string): Promise<Recipe[]>;
    getRecipeById(id: string): Promise<Recipe | null>;
    createRecipe(recipe: Recipe): Promise<void>;
    updateRecipe(id: string, recipe: Partial<Recipe>): Promise<void>;
    deleteRecipe(id: string): Promise<void>;

    // Optional: Search/Filter
    searchRecipes(query: string, outletId?: string): Promise<Recipe[]>;
}
