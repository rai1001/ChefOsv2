import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { Recipe } from '@/domain/entities/Recipe';
import { CalculateFichaCostUseCase as CoreCalculateRecipeCostUseCase } from '@culinaryos/core/use-cases/fichas/CalculateFichaCostUseCase';
import { RecipeAdapter } from '@/adapters/RecipeAdapter';

@injectable()
export class CalculateRecipeCostUseCase {
  constructor(
    @inject(TYPES.CoreCalculateRecipeCostUseCase)
    private coreUseCase: CoreCalculateRecipeCostUseCase
  ) {}

  async execute(recipeId: string): Promise<Recipe | null> {
    const ficha = await this.coreUseCase.execute(recipeId);
    if (!ficha) return null;

    return RecipeAdapter.toLegacy(ficha);
  }
}
