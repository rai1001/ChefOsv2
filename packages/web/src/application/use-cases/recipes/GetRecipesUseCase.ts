import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { Recipe } from '@/domain/entities/Recipe';
import { GetFichasTecnicasUseCase as CoreUseCase } from '@culinaryos/core/use-cases/fichas/GetFichasTecnicasUseCase';
import { RecipeAdapter } from '@/adapters/RecipeAdapter';

@injectable()
export class GetRecipesUseCase {
  constructor(@inject(TYPES.CoreGetRecipesUseCase) private coreUseCase: CoreUseCase) {}

  async execute(outletId?: string): Promise<Recipe[]> {
    const fichas = await this.coreUseCase.execute(outletId || '');
    return fichas.map((f) => RecipeAdapter.toLegacy(f));
  }
}
