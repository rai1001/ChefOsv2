/**
 * Inventory Analytics Service
 *
 * Consolidated service combining:
 * - inventoryAnalytics.ts (historical consumption, future demand)
 * - necesidadesService.ts (production requirements, reorder needs)
 *
 * Part of Application Layer (business logic, no direct DB access)
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/collections';
import { calculateTotalStock } from '@/utils/inventoryHelpers';
import type {
  Event,
  Menu,
  Recipe,
  Ingredient,
  RecipeIngredient,
  AutoPurchaseSettings
} from '@/types';

// ==================== TYPES ====================

export interface IngredientConsumption {
  ingredientId: string;
  ingredientName: string;
  totalConsumed: number;
  unit: string;
  daysCounted: number;
  avgDaily: number;
}

export interface FutureDemand {
  ingredientId: string;
  ingredientName: string;
  neededQuantity: number;
  unit: string;
  eventCount: number;
}

export interface InventoryContext {
  ingredients: (Ingredient & {
    usageHistory?: IngredientConsumption;
    futureDemand?: FutureDemand;
    currentStock: number;
  })[];
  totalFuturePax: number;
}

export interface NeedsResult {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  requiredQuantity: number;
  missingQuantity: number;
  unit: string;
}

export interface ReorderNeed {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  reorderPoint: number;
  optimalStock: number;
  orderQuantity: number;
  unit: string;
  supplierId?: string;
  costPerUnit: number;
}

// ==================== SERVICE ====================

export const InventoryAnalyticsService = {
  // ========== ANALYTICS & FORECASTING ==========

  /**
   * Aggregates inventory context for AI analysis
   * Includes historical consumption and future demand
   */
  getInventoryContext: async (
    outletId: string,
    historyDays = 30,
    futureDays = 14
  ): Promise<InventoryContext> => {
    // 1. Fetch base data
    const [ingredients, events, menus, recipes, batches] = await Promise.all([
      fetchCollection<Ingredient>(COLLECTIONS.INGREDIENTS, outletId),
      fetchCollection<Event>(COLLECTIONS.EVENTS, outletId),
      fetchCollection<Menu>(COLLECTIONS.MENUS, outletId),
      fetchCollection<Recipe>(COLLECTIONS.RECIPES, outletId),
      fetchActiveBatches(outletId),
    ]);

    const menuMap = new Map(menus.map((m) => [m.id, m]));
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));

    // Current Stock Map
    const stockMap = new Map<string, number>();
    batches.forEach((b) => {
      const current = stockMap.get(b.ingredientId) || 0;
      stockMap.set(b.ingredientId, current + (b.currentQuantity || 0));
    });

    // 2. Define time windows
    const now = new Date();
    const historyStart = new Date();
    historyStart.setDate(now.getDate() - historyDays);

    const futureEnd = new Date();
    futureEnd.setDate(now.getDate() + futureDays);

    // 3. Historical consumption (Past Events)
    const pastEvents = events.filter((e) => {
      const d = new Date(e.date);
      return d >= historyStart && d < now;
    });

    const historyConsumptionMap = new Map<string, number>();
    pastEvents.forEach((event) => {
      processEventDemand(event, menuMap, recipeMap, historyConsumptionMap);
    });

    // 4. Future demand (Upcoming Events)
    const upcomingEvents = events.filter((e) => {
      const d = new Date(e.date);
      return d >= now && d <= futureEnd;
    });

    const futureDemandMap = new Map<string, number>();
    const eventCountMap = new Map<string, number>();
    let totalFuturePax = 0;

    upcomingEvents.forEach((event) => {
      totalFuturePax += event.pax || 0;
      processEventDemand(event, menuMap, recipeMap, futureDemandMap, eventCountMap);
    });

    // 5. Assemble context
    const contextIngredients = ingredients.map((ing) => {
      const consumed = historyConsumptionMap.get(ing.id) || 0;
      const needed = futureDemandMap.get(ing.id) || 0;

      return {
        ...ing,
        currentStock: stockMap.get(ing.id) || 0,
        usageHistory: {
          ingredientId: ing.id,
          ingredientName: ing.name,
          totalConsumed: consumed,
          unit: ing.unit,
          daysCounted: historyDays,
          avgDaily: consumed / historyDays,
        },
        futureDemand: {
          ingredientId: ing.id,
          ingredientName: ing.name,
          neededQuantity: needed,
          unit: ing.unit,
          eventCount: eventCountMap.get(ing.id) || 0,
        },
      };
    });

    return {
      ingredients: contextIngredients as any,
      totalFuturePax,
    };
  },

  // ========== PRODUCTION REQUIREMENTS ==========

  /**
   * Scales a recipe's ingredients to a target yield (PAX)
   */
  scaleRecipe: (recipe: Recipe, targetPax: number): RecipeIngredient[] => {
    const basePax = recipe.yieldPax || 1;
    if (basePax <= 0) return recipe.ingredients;

    const ratio = targetPax / basePax;

    return recipe.ingredients.map((ing) => ({
      ...ing,
      quantity: ing.quantity * ratio,
    }));
  },

  /**
   * Aggregates total ingredient requirements from production plans
   */
  aggregateProductionRequirements: (
    plans: { recipe: Recipe; targetPax: number }[]
  ): Map<string, number> => {
    const totals = new Map<string, number>();

    for (const plan of plans) {
      const scaledIngredients = InventoryAnalyticsService.scaleRecipe(plan.recipe, plan.targetPax);

      for (const item of scaledIngredients) {
        const current = totals.get(item.ingredientId) || 0;
        totals.set(item.ingredientId, current + item.quantity);
      }
    }

    return totals;
  },

  /**
   * Compares production requirements vs current stock
   * Returns missing ingredients
   */
  checkProductionAvailability: (
    productionRequirements: Map<string, number>,
    ingredients: Ingredient[]
  ): NeedsResult[] => {
    const results: NeedsResult[] = [];
    const ingredientsMap = new Map(ingredients.map((i) => [i.id, i]));

    productionRequirements.forEach((requiredQty, ingId) => {
      const ing = ingredientsMap.get(ingId);
      if (!ing) return;

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

  // ========== REORDER MANAGEMENT ==========

  /**
   * Calculates reorder needs based on reorder points
   * Includes supplier selection logic
   */
  calculateReorderNeeds: (
    ingredients: Ingredient[],
    settings?: Partial<AutoPurchaseSettings>
  ): ReorderNeed[] => {
    const needs: ReorderNeed[] = [];
    const strategy = settings?.supplierSelectionStrategy || 'CHEAPEST';

    for (const ing of ingredients) {
      // Calculate stock from batches or fallback to legacy fields
      const currentStock =
        ing.batches && ing.batches.length > 0
          ? calculateTotalStock(ing.batches)
          : (ing.currentStock?.value ?? ing.stock ?? 0);

      // Check if we hit the reorder point
      const rpValue = ing.reorderPoint?.value ?? 0;

      if (rpValue > 0 && currentStock <= rpValue) {
        const optimalValue = ing.optimalStock?.value ?? rpValue * 2;
        const toOrder = optimalValue - currentStock;

        if (toOrder > 0) {
          // Supplier selection strategy
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

    return needs;
  },
};

// ==================== PRIVATE HELPERS ====================

async function fetchCollection<T>(collectionName: string, outletId: string): Promise<T[]> {
  const q = query(collection(db, collectionName), where('outletId', '==', outletId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

async function fetchActiveBatches(outletId: string): Promise<any[]> {
  const q = query(
    collection(db, COLLECTIONS.BATCHES),
    where('outletId', '==', outletId),
    where('status', '==', 'ACTIVE')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function processEventDemand(
  event: Event,
  menuMap: Map<string, Menu>,
  recipeMap: Map<string, Recipe>,
  demandMap: Map<string, number>,
  counterMap?: Map<string, number>
) {
  if (!event.menuId) return;
  const menu = menuMap.get(event.menuId);
  if (!menu?.recipeIds) return;

  menu.recipeIds.forEach((recipeId) => {
    const recipe = recipeMap.get(recipeId);
    if (!recipe) return;

    recipe.ingredients.forEach((ri) => {
      const current = demandMap.get(ri.ingredientId) || 0;
      const itemDemand = ri.quantity * (event.pax || 0);
      demandMap.set(ri.ingredientId, current + itemDemand);

      if (counterMap) {
        counterMap.set(ri.ingredientId, (counterMap.get(ri.ingredientId) || 0) + 1);
      }
    });
  });
}
