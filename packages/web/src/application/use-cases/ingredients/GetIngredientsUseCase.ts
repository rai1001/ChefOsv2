import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { GetIngredientsUseCase as CoreUseCase } from '@culinaryos/core/use-cases/inventory/GetIngredientsUseCase';
import { LegacyIngredient } from '@/domain/entities/Ingredient';
import { toLegacy } from '@/adapters/IngredientAdapter';

@injectable()
export class GetIngredientsUseCase {
  constructor(@inject(TYPES.CoreGetIngredientsUseCase) private coreUseCase: CoreUseCase) {}

  async execute(outletId: string = ''): Promise<LegacyIngredient[]> {
    const coreIngredients = await this.coreUseCase.execute(outletId);
    return coreIngredients.map(toLegacy);
  }
}
