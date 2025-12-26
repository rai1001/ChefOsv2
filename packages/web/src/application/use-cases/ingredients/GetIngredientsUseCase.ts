import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IIngredientRepository } from '../../../domain/interfaces/repositories/IIngredientRepository';
import { Ingredient } from '../../../domain/entities/Ingredient';

@injectable()
export class GetIngredientsUseCase {
    constructor(@inject(TYPES.IngredientRepository) private repository: IIngredientRepository) { }

    async execute(outletId: string = ''): Promise<Ingredient[]> {
        return this.repository.getIngredients(outletId);
    }
}
