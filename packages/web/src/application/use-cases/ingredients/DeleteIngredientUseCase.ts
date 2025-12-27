import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';

@injectable()
export class DeleteIngredientUseCase {
    constructor(@inject(TYPES.IngredientRepository) private repository: IIngredientRepository) { }

    async execute(id: string): Promise<void> {
        return this.repository.deleteIngredient(id);
    }
}
