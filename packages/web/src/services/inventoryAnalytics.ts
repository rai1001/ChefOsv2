import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/collections';
import type { Event, Menu, Recipe, Ingredient } from '@/types';

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

export const inventoryAnalyticsService = {
  /**
   * Aggregates everything needed for AI analysis
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

    // 2. Define windows
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
};

// Utils
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
