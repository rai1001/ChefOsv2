import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { Recipe } from '@/domain/entities/Recipe';
import { CalculateRecipeCostUseCase } from './CalculateRecipeCostUseCase';
import { UpdateFichaTecnicaUseCase as CoreUseCase } from '@culinaryos/core';
import { Quantity } from '@culinaryos/core';
import { Unit } from '@culinaryos/core';

@injectable()
export class UpdateRecipeUseCase {
  constructor(
    @inject(TYPES.CoreUpdateRecipeUseCase) private coreUseCase: CoreUseCase,
    @inject(TYPES.CalculateRecipeCostUseCase) private calculateCost: CalculateRecipeCostUseCase
  ) {}

  async execute(id: string, updates: Partial<Recipe>): Promise<void> {
    // Map partial legacy to core DTO
    const dto: any = {};
    if (updates.name) dto.name = updates.name;
    if (updates.description) dto.description = updates.description;
    if (updates.category) dto.category = updates.category;

    if (updates.ingredients) {
      dto.ingredients = updates.ingredients.map((i) => ({
        ingredientId: i.id,
        quantity: new Quantity(i.quantity, new Unit(i.unit as any)),
        type: i.type,
      }));
    }

    await this.coreUseCase.execute(id, dto);

    // Calculate costs immediately
    await this.calculateCost.execute(id);
  }
}
