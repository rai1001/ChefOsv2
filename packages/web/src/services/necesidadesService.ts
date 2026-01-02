import type { Recipe, RecipeIngredient, AutoPurchaseSettings, Ingredient } from '@/types';
import { calculateTotalStock } from '@/utils/inventoryHelpers';

export interface NeedsResult {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  requiredQuantity: number;
  missingQuantity: number; // = required - stock (if positive)
  unit: string;
}

export interface ReorderNeed {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  reorderPoint: number;
  optimalStock: number;
  orderQuantity: number; // = optimal - stock
  unit: string;
  supplierId?: string;
  costPerUnit: number;
}

export const necesidadesService = {
  /**
   * Scales a recipe's ingredients to a target yield (PAX).
   * Assumes recipe.yieldPax is defined; defaults to 1 if not.
   */
  scaleRecipe: (recipe: Recipe, targetPax: number): RecipeIngredient[] => {
    const basePax = recipe.yieldPax || 1;
    if (basePax <= 0) return recipe.ingredients; // Safety check

    const ratio = targetPax / basePax;

    return recipe.ingredients.map((ing) => ({
      ...ing,
      quantity: ing.quantity * ratio,
    }));
  },

  /**
   * Aggregates total ingredient requirements from a list of production plans.
   * @param plans List of recipes and their target production yield
   */
  aggregateProductionRequirements: (
    plans: { recipe: Recipe; targetPax: number }[]
  ): Map<string, number> => {
    const totals = new Map<string, number>();

    for (const plan of plans) {
      const scaledIngredients = necesidadesService.scaleRecipe(plan.recipe, plan.targetPax);

      for (const item of scaledIngredients) {
        const current = totals.get(item.ingredientId) || 0;
        totals.set(item.ingredientId, current + item.quantity);
      }
    }

    return totals;
  },

  /**
   * Calculates what needs to be ordered based purely on Reorder Points.
   * Uses FIFO stock logic (sum of batches).
   */
  calculateReorderNeeds: (
    ingredients: Ingredient[],
    settings?: Partial<AutoPurchaseSettings>
  ): ReorderNeed[] => {
    const needs: ReorderNeed[] = [];
    const strategy = settings?.supplierSelectionStrategy || 'CHEAPEST';

    for (const ing of ingredients) {
      // calculated stock from batches or fallback to core/legacy fields
      const currentStock =
        ing.batches && ing.batches.length > 0
          ? calculateTotalStock(ing.batches)
          : (ing.currentStock?.value ?? ing.stock ?? 0);

      // Check if we hit the reorder point
      const rpValue = ing.reorderPoint?.value ?? 0;

      if (rpValue > 0) {
        if (currentStock <= rpValue) {
          const optimalValue = ing.optimalStock?.value ?? rpValue * 2;
          const toOrder = optimalValue - currentStock;

          if (toOrder > 0) {
            // Task 6.2: Strategy-Based Supplier Selection
            let selectedSupplierId = ing.supplierId;
            let selectedCost = ing.costPerUnit || 0;

            if (ing.supplierInfo && ing.supplierInfo.length > 0) {
              const candidates = [...ing.supplierInfo];

              if (strategy === 'FASTEST') {
                // Sort by leadTimeDays (ASC), then price (ASC)
                candidates.sort((a, b) => {
                  const leadA = a.leadTimeDays || 999;
                  const leadB = b.leadTimeDays || 999;
                  if (leadA !== leadB) return leadA - leadB;
                  return a.costPerUnit - b.costPerUnit;
                });
              } else {
                // Default: CHEAPEST
                candidates.sort((a, b) => a.costPerUnit - b.costPerUnit);
              }

              const best = candidates[0];
              if (best) {
                selectedSupplierId = best.supplierId;
                selectedCost = best.costPerUnit;
              }
            }

            needs.push({
              ingredientId: ing.id,
              ingredientName: ing.name,
              currentStock,
              reorderPoint: rpValue,
              optimalStock: optimalValue,
              orderQuantity: toOrder,
              unit: ing.unit,
              supplierId: selectedSupplierId,
              costPerUnit: selectedCost,
            });
          }
        }
      }
    }

    return needs;
  },

  /**
   * Compares Production Requirements vs Current Stock to find "Missing for Production".
   * useful for "Can I cook this?" checks.
   */
  checkProductionAvailability: (
    productionRequirements: Map<string, number>,
    ingredients: Ingredient[]
  ): NeedsResult[] => {
    const results: NeedsResult[] = [];
    const ingredientsMap = new Map(ingredients.map((i) => [i.id, i]));

    productionRequirements.forEach((requiredQty, ingId) => {
      const ing = ingredientsMap.get(ingId);
      if (!ing) return; // Should handle missing ingredient reference

      const currentStock = ing.batches ? calculateTotalStock(ing.batches) : ing.stock || 0;

      if (currentStock < requiredQty) {
        results.push({
          ingredientId: ingId,
          ingredientName: ing.name,
          currentStock,
          requiredQuantity: requiredQty,
          missingQuantity: requiredQty - currentStock,
          unit: ing.unit,
        });
      }
    });

    return results;
  },
};
