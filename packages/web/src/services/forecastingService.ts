import type { AppState } from '@/presentation/store/types';
import type { Ingredient } from '@/types';
import { addDays, isBefore, parseISO } from 'date-fns';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

export interface ForecastData {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  unit: string;
  futureDemand: {
    neededQuantity: number;
    eventCount: number;
  };
  historicalUsage: {
    totalWaste: number;
    avgDaily: number;
  };
}

export const forecastingService = {
  /**
   * Calls the Cloud Function for AI-powered demand prediction
   */
  getAIPredictions: async (outletId: string, windowDays = 14) => {
    try {
      const predictDemand = httpsCallable<any, any>(functions, 'predictDemand');
      const result = await predictDemand({ outletId, windowDays });
      return result.data;
    } catch (error) {
      console.error('Cloud Prediction Error:', error);
      throw error;
    }
  },

  /**
   * Aggregates all future inventory needs based on confirmed events within a window
   * @deprecated Use Cloud Predictions for complex analysis
   */
  getFutureInventoryDemand: (
    state: AppState,
    windowDays = 14
  ): Record<string, { neededQuantity: number; eventCount: number }> => {
    const { events, recipes, menus } = state;
    const now = new Date();
    const windowEnd = addDays(now, windowDays);

    const demand: Record<string, { neededQuantity: number; eventCount: number }> = {};

    // 1. Index recipes and menus for fast lookup
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));
    const menuMap = new Map(menus.map((m) => [m.id, m]));

    // 2. Filter events in the window
    events.forEach((event) => {
      const eventDate = parseISO(event.date);
      if (isBefore(eventDate, now)) return; // Past
      if (!isBefore(eventDate, windowEnd)) return; // Outside window

      if (!event.menuId) return;
      const menu = menuMap.get(event.menuId);
      if (!menu?.recipeIds) return;

      menu.recipeIds.forEach((recipeId) => {
        const recipe = recipeMap.get(recipeId);
        if (!recipe) return;

        recipe.ingredients.forEach((ri) => {
          if (!demand[ri.ingredientId]) {
            demand[ri.ingredientId] = { neededQuantity: 0, eventCount: 0 };
          }

          const d = demand[ri.ingredientId]!;
          // Logic: Qty * PAX
          d.neededQuantity += ri.quantity * event.pax;
          d.eventCount += 1;
        });
      });
    });

    return demand;
  },

  /**
   * Aggregates historical consumption from waste records and (ideally) past events
   */
  getHistoricalConsumption: (
    state: AppState,
    windowDays = 30
  ): Record<string, { totalWaste: number; avgDaily: number }> => {
    const { wasteRecords } = state;
    const now = new Date();
    const windowStart = addDays(now, -windowDays);

    const consumption: Record<string, { totalWaste: number; avgDaily: number }> = {};

    // Process Waste Records
    wasteRecords.forEach((record) => {
      const recordDate = parseISO(record.date);
      if (!isBefore(windowStart, recordDate)) return; // Too old

      if (!consumption[record.ingredientId]) {
        consumption[record.ingredientId] = { totalWaste: 0, avgDaily: 0 };
      }
      consumption[record.ingredientId]!.totalWaste += record.quantity;
    });

    // Calculate Average Daily (Simplified: Total Waste / Days)
    // In a real scenario, we'd add 'Actual Consumption' from past production completions
    Object.keys(consumption).forEach((id) => {
      const entry = consumption[id];
      if (entry) {
        entry.avgDaily = entry.totalWaste / windowDays;
      }
    });

    return consumption;
  },

  /**
   * Consolidates all data into a format suitable for Gemini analysis
   */
  aggregateForecastContext: (state: AppState): ForecastData[] => {
    const futureDemand = forecastingService.getFutureInventoryDemand(state);
    const history = forecastingService.getHistoricalConsumption(state);
    const { ingredients } = state;
    return ingredients
      .map((ing: Ingredient) => {
        const demand = futureDemand[ing.id] || { neededQuantity: 0, eventCount: 0 };
        const hist = history[ing.id] || { totalWaste: 0, avgDaily: 0 };

        return {
          ingredientId: ing.id,
          ingredientName: ing.name,
          currentStock: ing.stock || 0,
          unit: ing.unit,
          futureDemand: demand,
          historicalUsage: hist,
        };
      })
      .filter(
        (item: ForecastData) =>
          item.futureDemand.neededQuantity > 0 || item.historicalUsage.totalWaste > 0
      );
  },

  /**
   * Generates context for Restaurant Mode based on Manual PAX or Historical Sales
   */
  getRestaurantForecastContext: (state: AppState, manualPax?: number) => {
    const { ingredients, wasteRecords } = state;
    // In a real app, we would fetch historical sales mix here.
    // For now, we will estimate demand based on "Average consumption per Pax"
    // derived from historical waste (assuming waste ~ usage for simplicity if no specific usage logs)
    // OR we can just pass the "Pax Forecast" to Gemini and let it hallucinate/estimate based on generic knowledge
    // if we don't have recipes linked to sales.

    // Better approach: Use recipes. If we assume a generic "Menu Mix" (e.g. 20% order steak, 30% fish),
    // we can project.
    // Simplification for V2: Just send the Inventory + Waste + Manual PAX count to Gemini
    // and ask it to "Estimate orders based on typical restaurant consumption".

    const history = forecastingService.getHistoricalConsumption(state);

    return {
      mode: 'RESTAURANT',
      paxForecast: manualPax || 0,
      inventory: ingredients.map((ing) => ({
        name: ing.name,
        stock: ing.stock,
        unit: ing.unit,
        avgWaste: history[ing.id]?.avgDaily || 0,
      })),
      wasteStats: wasteRecords.slice(0, 50), // Last 50 records context
    };
  },
};
