import type { StateCreator } from 'zustand';
import type { AppState, OutletSlice, Outlet } from '@/presentation/store/types';

export const createOutletSlice: StateCreator<
    AppState,
    [],
    [],
    OutletSlice
> = (set, get) => ({
    outlets: [],
    activeOutletId: null,

    setOutlets: (outlets: Outlet[]) => set({ outlets }),

    addOutlet: async (outlet: Outlet) => {
        set((state) => ({ outlets: [...state.outlets, outlet] }));
    },

    updateOutlet: async (id: string, updates: Partial<Outlet>) => {
        set((state) => ({
            outlets: state.outlets.map((o) => (o.id === id ? { ...o, ...updates } : o))
        }));
    },

    setActiveOutletId: (id: string | null) => set({ activeOutletId: id }),

    deleteOutlet: async (id: string) => {
        set((state) => ({
            outlets: state.outlets.filter((o) => o.id !== id),
            activeOutletId: state.activeOutletId === id ? null : state.activeOutletId
        }));
    },

    toggleOutletActive: async (id: string) => {
        set((state) => ({
            outlets: state.outlets.map((o) => (o.id === id ? { ...o, isActive: !o.isActive } : o))
        }));
    },

    getOutlet: (id: string) => get().outlets.find((o) => o.id === id)
});
