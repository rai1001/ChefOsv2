import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { CreateIngredientUseCase as CoreUseCase } from '@culinaryos/core';
import { CreateIngredientDTO } from '@culinaryos/core/domain/entities/Ingredient';
import { LegacyIngredient } from '@/domain/entities/Ingredient';
import { Money } from '@culinaryos/core/domain/value-objects/Money';
import { Unit } from '@culinaryos/core/domain/value-objects/Unit';
import { Quantity } from '@culinaryos/core/domain/value-objects/Quantity';

@injectable()
export class CreateIngredientUseCase {
  constructor(@inject(TYPES.CoreCreateIngredientUseCase) private coreUseCase: CoreUseCase) {}

  async execute(ingredient: LegacyIngredient): Promise<void> {
    const dto: CreateIngredientDTO = {
      outletId: ingredient.outletId || '',
      name: ingredient.name,
      category: ingredient.category || 'other',
      unit: ingredient.unit.toString(),
      minimumStock: new Quantity(ingredient.minStock, new Unit(ingredient.unit.toString() as any)),
      suppliers: ingredient.supplierId
        ? [
            {
              supplierId: ingredient.supplierId,
              supplierName: 'Unknown',
              price: Money.fromCents(0),
              unit: ingredient.unit.toString(),
              leadTimeDays: 0,
              qualityRating: 0,
              isPrimary: true,
              isActive: true,
            },
          ]
        : [],
      sku: ingredient.defaultBarcode,
      allergens: ingredient.allergens,
    };

    await this.coreUseCase.execute(dto);
  }
}
