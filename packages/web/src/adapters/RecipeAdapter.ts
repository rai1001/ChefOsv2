import {
  FichaTecnica as CoreFichaTecnica,
  RecipeIngredient as CoreRecipeIngredient,
  Quantity,
  Unit,
  Money,
} from '@culinaryos/core';
import {
  Recipe as LegacyRecipe,
  RecipeIngredient as LegacyRecipeIngredient,
} from '@/domain/entities/Recipe';

export class RecipeAdapter {
  static toCore(legacy: LegacyRecipe): CoreFichaTecnica {
    return {
      id: legacy.id,
      outletId: legacy.outletId || '',
      name: legacy.name,
      description: legacy.description,
      category: legacy.category,
      subCategory: legacy.subCategory,
      yield: new Quantity(
        legacy.yieldQuantity || legacy.servings,
        new Unit((legacy.yieldUnit as any) || 'portion')
      ),
      ingredients: (legacy.ingredients || []).map(this.toCoreIngredient),
      instructions: legacy.instructions,
      prepTime: legacy.prepTime,
      cookTime: legacy.cookTime,
      laborCost: legacy.laborCost ? Money.fromCents(legacy.laborCost * 100) : undefined,
      packagingCost: legacy.packagingCost ? Money.fromCents(legacy.packagingCost * 100) : undefined,
      sellingPrice: legacy.sellingPrice ? Money.fromCents(legacy.sellingPrice * 100) : undefined,
      targetCostPercent: legacy.targetCostPercent,
      totalCost: legacy.totalCost ? Money.fromCents(legacy.totalCost * 100) : undefined,
      costPerPortion: legacy.costPerServing
        ? Money.fromCents(legacy.costPerServing * 100)
        : undefined,
      actualCostPercent: legacy.foodCostPercent,
      grossMargin: legacy.grossMargin ? Money.fromCents(legacy.grossMargin * 100) : undefined,
      version: 1,
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
      type: legacy.type || 'raw',
      ingredientName: legacy.name,
      quantity: new Quantity(legacy.quantity, new Unit(legacy.unit as any)),
      unitCost: legacy.unitCost ? Money.fromCents(legacy.unitCost * 100) : undefined,
      totalCost: legacy.grossCost ? Money.fromCents(legacy.grossCost * 100) : undefined,
      wastePercentage: legacy.wastePercentage,
      notes: undefined,
    };
  }

  static toLegacy(core: CoreFichaTecnica): LegacyRecipe {
    return new LegacyRecipe(
      core.id,
      core.name,
      core.description || '',
      core.category,
      core.subCategory || '',
      core.yield.value, // servings
      core.yield.value, // yieldQuantity
      core.yield.unit.toString() as any, // yieldUnit
      core.prepTime || 0,
      core.cookTime || 0,
      (core.ingredients || []).map(this.toLegacyIngredient),
      core.instructions || [],
      core.laborCost?.amount ?? 0,
      core.packagingCost?.amount ?? 0,
      core.sellingPrice?.amount ?? 0,
      core.targetCostPercent ?? 30,
      core.totalCost?.amount ?? 0,
      core.costPerPortion?.amount ?? 0,
      core.actualCostPercent ?? 0,
      core.grossMargin?.amount ?? 0,
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
      type: core.type || 'raw',
      name: core.ingredientName,
      quantity: core.quantity.value,
      unit: core.quantity.unit.toString() as any,
      grossCost: core.totalCost?.amount ?? 0,
      unitCost: core.unitCost?.amount ?? 0,
      wastePercentage: core.wastePercentage || 0,
    };
  }
}
