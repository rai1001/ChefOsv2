import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';

@injectable()
export class DeleteRecipeUseCase {
    constructor(@inject(TYPES.RecipeRepository) private repository: IRecipeRepository) { }

    async execute(id: string): Promise<void> {
        await this.repository.deleteRecipe(id);
    }
}
