import type { StateCreator } from 'zustand';
import type { AppState, AnalyticsSlice } from '@/presentation/store/types';
import { calculateIngredientUsage } from '@/services/analyticsService';

export const createAnalyticsSlice: StateCreator<
    AppState,
    [],
    [],
    AnalyticsSlice
> = (_set, get) => ({
    calculateMenuAnalytics: async (startDate: string, endDate: string) => {
        const { events, recipes, menus, ingredients, activeOutletId } = get();
        return await calculateIngredientUsage(events, menus, recipes, ingredients, startDate, endDate, activeOutletId || undefined);
    }
});
