import { Ingredient } from '../../entities/Ingredient';

export interface IIngredientRepository {
    getIngredients(outletId: string): Promise<Ingredient[]>;
    getIngredientById(id: string): Promise<Ingredient | null>;
    createIngredient(ingredient: Ingredient): Promise<void>;
    updateIngredient(id: string, ingredient: Partial<Ingredient>): Promise<void>;
    deleteIngredient(id: string): Promise<void>;

    // Batch operations
    updateStock(id: string, quantityChange: number): Promise<void>;
    updateCost(id: string, newCost: number): Promise<void>;
}
