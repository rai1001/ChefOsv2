import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
import { Ingredient } from '@/domain/entities/Ingredient';

@injectable()
export class ImportIngredientsUseCase {
    constructor(@inject(TYPES.IngredientRepository) private repository: IIngredientRepository) { }

    async execute(items: any[]): Promise<void> {
        // Assume items are already normalized or normalize them here
        // We will loop and create ingredients
        for (const item of items) {
            // Basic validation/mapping
            const ingredient = new Ingredient(
                item.id || crypto.randomUUID(),
                item.name,
                item.unit || 'kg',
                Number(item.costPerUnit || item.price || 0),
                1, // yield
                item.allergens || [],
                item.category || 'other',
                Number(item.stock || 0)
            );

            await this.repository.createIngredient(ingredient);
        }
    }
}
