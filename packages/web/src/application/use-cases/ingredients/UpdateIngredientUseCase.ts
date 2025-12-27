import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
import { LegacyIngredient } from '@/domain/entities/Ingredient';

@injectable()
export class UpdateIngredientUseCase {
    constructor(@inject(TYPES.IngredientRepository) private repository: IIngredientRepository) { }

    async execute(id: string, ingredient: Partial<LegacyIngredient>): Promise<void> {
        return this.repository.updateIngredient(id, ingredient);
    }
}
