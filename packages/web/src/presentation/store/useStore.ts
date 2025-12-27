import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createIngredientSlice } from './slices/createIngredientSlice';
import { createEventSlice } from './slices/createEventSlice';
import { createProductionSlice } from './slices/createProductionSlice';
import { createStaffSlice } from './slices/createStaffSlice';
import { createRecipeSlice } from './slices/createRecipeSlice';
import { createMenuSlice } from './slices/createMenuSlice';
import { createPurchaseSlice } from './slices/createPurchaseSlice';
import { createWasteSlice } from './slices/createWasteSlice';
import { createHACCPSlice } from './slices/createHACCPSlice';
import { createAnalyticsSlice } from './slices/createAnalyticsSlice';
import { createOutletSlice } from './slices/createOutletSlice';
import { createNotificationSlice } from './slices/createNotificationSlice';
import { createHospitalitySlice } from './slices/createHospitalitySlice';
import { createAuthSlice } from './slices/createAuthSlice';
import { createIntegrationSlice } from './slices/createIntegrationSlice';
import { createInventorySlice } from './slices/createInventorySlice';
import type { AppState } from './types';

// Re-export AppState for consumers
export type { AppState };

export const useStore = create<AppState>()(
    persist(
        (set, get, store) => ({
            ...createIngredientSlice(set, get, store),
            ...createEventSlice(set, get, store),
            ...createProductionSlice(set, get, store),
            ...createStaffSlice(set, get, store),
            ...createRecipeSlice(set, get, store),
            ...createMenuSlice(set, get, store),
            ...createPurchaseSlice(set, get, store),
            ...createWasteSlice(set, get, store),
            ...createHACCPSlice(set, get, store),
            ...createAnalyticsSlice(set, get, store),
            ...createOutletSlice(set, get, store),
            ...createNotificationSlice(set, get, store),
            ...createHospitalitySlice(set, get, store),
            ...createAuthSlice(set, get, store),
            ...createIntegrationSlice(set, get, store),
            ...createInventorySlice(set, get, store),

            // UI State
            activeOutletId: null,
            setActiveOutletId: (id) => {
                const currentId = get().activeOutletId;
                if (currentId === id) return;

                set({
                    activeOutletId: id,
                    // Clear data on switch to prevent leakage
                    ingredients: [],
                    recipes: [],
                    menus: [],
                    events: [],
                    inventory: [],
                    staff: [],
                    suppliers: [],
                    purchaseOrders: [],
                    wasteRecords: [],
                    productionTasks: {},
                    pccs: [],
                    haccpLogs: [],
                    haccpTasks: [],
                    haccpTaskCompletions: []
                });
            },
        }),
        {
            name: 'kitchen-manager-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                activeOutletId: state.activeOutletId,
            }),
        }
    )
);
