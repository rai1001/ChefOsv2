import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { UpdateIngredientUseCase as CoreUseCase } from '@culinaryos/core';
import { UpdateIngredientDTO } from '@culinaryos/core/domain/entities/Ingredient';
import { LegacyIngredient } from '@/domain/entities/Ingredient';
import { Quantity } from '@culinaryos/core/domain/value-objects/Quantity';
import { Unit } from '@culinaryos/core/domain/value-objects/Unit';
import { Money } from '@culinaryos/core/domain/value-objects/Money';

@injectable()
export class UpdateIngredientUseCase {
  constructor(@inject(TYPES.CoreUpdateIngredientUseCase) private coreUseCase: CoreUseCase) {}

  async execute(id: string, ingredient: Partial<LegacyIngredient>): Promise<void> {
    const dto: UpdateIngredientDTO = {};

    if (ingredient.name !== undefined) dto.name = ingredient.name;
    if (ingredient.category !== undefined) dto.category = ingredient.category;
    if (ingredient.minStock !== undefined) {
      dto.minimumStock = new Quantity(ingredient.minStock, new Unit(ingredient.unit as any));
    }
    if (ingredient.supplierId !== undefined) {
      dto.suppliers = [
        {
          supplierId: ingredient.supplierId,
          supplierName: 'Unknown',
          price: Money.fromCents(0),
          unit: 'unit', // Placeholder
          leadTimeDays: 0,
          qualityRating: 0,
          isPrimary: true,
          isActive: true,
        },
      ];
    }
    if (ingredient.defaultBarcode !== undefined) dto.sku = ingredient.defaultBarcode;
    if (ingredient.allergens !== undefined) dto.allergens = ingredient.allergens;
    if (ingredient.stock !== undefined) {
      dto.currentStock = new Quantity(ingredient.stock, new Unit(ingredient.unit as any));
    }
    if (ingredient.costPerUnit !== undefined) {
      dto.lastCost = Money.fromCents(ingredient.costPerUnit * 100) as any;
    }

    await this.coreUseCase.execute(id, dto);
  }
}
