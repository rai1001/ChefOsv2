import { LegacyIngredient } from '../../entities/Ingredient';

export interface IIngredientRepository {
    getIngredients(outletId: string): Promise<LegacyIngredient[]>;
    getIngredientById(id: string): Promise<LegacyIngredient | null>;
    createIngredient(ingredient: LegacyIngredient): Promise<void>;
    updateIngredient(id: string, ingredient: Partial<LegacyIngredient>): Promise<void>;
    deleteIngredient(id: string): Promise<void>;

    // Batch operations
    updateStock(id: string, quantityChange: number): Promise<void>;
    updateCost(id: string, newCost: number): Promise<void>;
}
