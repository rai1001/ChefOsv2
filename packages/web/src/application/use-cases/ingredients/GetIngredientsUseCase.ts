import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { GetIngredientsUseCase as CoreUseCase } from '@culinaryos/core';
import { LegacyIngredient } from '@/domain/entities/Ingredient';
import { Ingredient as CoreIngredient } from '@culinaryos/core';

@injectable()
export class GetIngredientsUseCase {
  constructor(@inject(TYPES.CoreGetIngredientsUseCase) private coreUseCase: CoreUseCase) {}

  async execute(outletId: string = ''): Promise<LegacyIngredient[]> {
    const coreIngredients = await this.coreUseCase.execute(outletId);
    return coreIngredients.map(this.toLegacy);
  }

  private toLegacy(core: CoreIngredient): LegacyIngredient {
    return new LegacyIngredient(
      core.id,
      core.name,
      core.unit as any, // Unit handling might need adjustment but casting for now
      core.lastCost?.amount || 0,
      core.yieldFactor || 1,
      core.allergens || [],
      core.category as any,
      core.currentStock.value,
      core.minimumStock.value,
      core.nutritionalInfo as any,
      [], // batches
      core.suppliers?.[0]?.supplierId,
      [], // priceHistory
      core.sku,
      undefined, // shelfLife
      core.outletId,
      core.optimalStock?.value,
      core.reorderPoint?.value
    );
  }
}
