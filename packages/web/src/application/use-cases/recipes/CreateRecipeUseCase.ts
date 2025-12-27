import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { Recipe } from '@/domain/entities/Recipe';
import { CalculateRecipeCostUseCase } from './CalculateRecipeCostUseCase';
import { CreateFichaTecnicaUseCase as CoreUseCase } from '@culinaryos/core';
import { RecipeAdapter } from '@/adapters/RecipeAdapter';

@injectable()
export class CreateRecipeUseCase {
  constructor(
    @inject(TYPES.CoreCreateRecipeUseCase) private coreUseCase: CoreUseCase,
    @inject(TYPES.CalculateRecipeCostUseCase) private calculateCost: CalculateRecipeCostUseCase
  ) {}

  async execute(recipe: Recipe): Promise<void> {
    const coreFicha = RecipeAdapter.toCore(recipe);
    const dto = {
      outletId: coreFicha.outletId,
      name: coreFicha.name,
      description: coreFicha.description,
      category: coreFicha.category,
      yield: coreFicha.yield,
      ingredients: coreFicha.ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        quantity: i.quantity,
        type: i.type,
      })),
      instructions: coreFicha.instructions,
      prepTime: coreFicha.prepTime,
      cookTime: coreFicha.cookTime,
      imageUrl: coreFicha.imageUrl,
    };
    await this.coreUseCase.execute(dto);

    // Calculate costs immediately (legacy logic)
    await this.calculateCost.execute(recipe.id);
  }
}
