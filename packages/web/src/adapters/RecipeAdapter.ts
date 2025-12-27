import {
  FichaTecnica as CoreFichaTecnica,
  RecipeIngredient as CoreRecipeIngredient,
} from '@culinaryos/core/domain/entities/FichaTecnica';
import {
  Recipe as LegacyRecipe,
  RecipeIngredient as LegacyRecipeIngredient,
} from '@/domain/entities/Recipe';
import { Quantity } from '@culinaryos/core/domain/value-objects/Quantity';
import { Unit } from '@culinaryos/core/domain/value-objects/Unit';
import { Money } from '@culinaryos/core/domain/value-objects/Money';

export class RecipeAdapter {
  static toCore(legacy: LegacyRecipe): CoreFichaTecnica {
    return {
      id: legacy.id,
      outletId: legacy.outletId || '',
      name: legacy.name,
      description: legacy.description,
      category: legacy.category,
      yield: new Quantity(
        legacy.yieldQuantity || legacy.servings,
        new Unit((legacy.yieldUnit as any) || 'portion')
      ),
      ingredients: (legacy.ingredients || []).map(this.toCoreIngredient),
      instructions: legacy.instructions,
      prepTime: legacy.prepTime,
      cookTime: legacy.cookTime,
      totalCost: legacy.totalCost ? Money.fromCents(legacy.totalCost * 100) : undefined,
      costPerPortion: legacy.costPerServing
        ? Money.fromCents(legacy.costPerServing * 100)
        : undefined,
      version: 1, // Default to 1 if not present in legacy
      isActive: true,
      imageUrl: legacy.imageUrl,
      allergens: legacy.allergens,
      createdAt: legacy.createdAt ? new Date(legacy.createdAt) : new Date(),
      updatedAt: legacy.updatedAt ? new Date(legacy.updatedAt) : new Date(),
    };
  }

  static toCoreIngredient(legacy: LegacyRecipeIngredient): CoreRecipeIngredient {
    return {
      ingredientId: legacy.id,
      ingredientName: legacy.name,
      quantity: new Quantity(legacy.quantity, new Unit(legacy.unit as any)),
      unitCost: legacy.unitCost ? Money.fromCents(legacy.unitCost * 100) : undefined,
      totalCost: legacy.grossCost ? Money.fromCents(legacy.grossCost * 100) : undefined,
      notes: undefined, // Legacy doesn't have per-ingredient notes
    };
  }

  static toLegacy(core: CoreFichaTecnica): LegacyRecipe {
    return new LegacyRecipe(
      core.id,
      core.name,
      core.description || '',
      core.category,
      '', // subCategory
      core.yield.value, // servings
      core.yield.value, // yieldQuantity
      core.yield.unit.toString() as any, // yieldUnit
      core.prepTime || 0,
      core.cookTime || 0,
      (core.ingredients || []).map(this.toLegacyIngredient),
      core.instructions || [],
      0, // laborCost
      0, // packagingCost
      0, // sellingPrice
      30, // targetCostPercent
      core.totalCost?.amount ?? 0,
      core.costPerPortion?.amount ?? 0,
      0, // foodCostPercent
      0, // grossMargin
      core.outletId,
      core.imageUrl,
      undefined, // videoUrl
      core.allergens || [],
      [], // tags
      core.createdAt.toISOString(),
      core.updatedAt.toISOString()
    );
  }

  static toLegacyIngredient(core: CoreRecipeIngredient): LegacyRecipeIngredient {
    return {
      id: core.ingredientId,
      type: 'raw', // Default to raw for now
      name: core.ingredientName,
      quantity: core.quantity.value,
      unit: core.quantity.unit.toString() as any,
      grossCost: core.totalCost?.amount ?? 0,
      unitCost: core.unitCost?.amount ?? 0,
      wastePercentage: 0,
    };
  }
}
