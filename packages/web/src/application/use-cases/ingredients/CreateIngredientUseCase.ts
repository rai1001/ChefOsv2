import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { CreateIngredientUseCase as CoreUseCase } from '@culinaryos/core/use-cases/inventory/CreateIngredientUseCase';
import { CreateIngredientDTO } from '@culinaryos/core/domain/entities/Ingredient';
import { LegacyIngredient } from '@/domain/entities/Ingredient';
import { toCore } from '@/adapters/IngredientAdapter';

@injectable()
export class CreateIngredientUseCase {
  constructor(@inject(TYPES.CoreCreateIngredientUseCase) private coreUseCase: CoreUseCase) {}

  async execute(ingredient: LegacyIngredient): Promise<void> {
    const coreIngredient = toCore(ingredient);
    const dto: CreateIngredientDTO = {
      outletId: coreIngredient.outletId || '',
      name: coreIngredient.name,
      category: coreIngredient.category || 'other',
      unit: coreIngredient.unit,
      minimumStock: coreIngredient.minimumStock,
      supplier: coreIngredient.supplier,
      sku: coreIngredient.sku,
      allergens: coreIngredient.allergens,
    };

    await this.coreUseCase.execute(dto);
  }
}
