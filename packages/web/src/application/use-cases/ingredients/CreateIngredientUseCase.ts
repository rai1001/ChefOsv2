import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
import { LegacyIngredient } from '@/domain/entities/Ingredient';

@injectable()
export class CreateIngredientUseCase {
    constructor(@inject(TYPES.IngredientRepository) private repository: IIngredientRepository) { }

    async execute(ingredient: LegacyIngredient): Promise<void> {
        return this.repository.createIngredient(ingredient);
    }
}
