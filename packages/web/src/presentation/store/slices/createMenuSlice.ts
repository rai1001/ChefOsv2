import type { StateCreator } from 'zustand';
import type { AppState, MenuSlice, Menu } from '@/presentation/store/types';
import { setDocument, deleteDocument } from '@/services/firestoreService';

export const createMenuSlice: StateCreator<
    AppState,
    [],
    [],
    MenuSlice
> = (set) => ({
    menus: [],

    setMenus: (menus: Menu[]) => set({ menus }),

    addMenu: async (menu: Menu) => {
        set((state) => ({
            menus: [...state.menus, menu]
        }));
        try {
            await setDocument('menus', menu.id, menu);
        } catch (error) {
            console.error("Failed to persist menu", error);
        }
    },

    updateMenu: async (updatedMenu: Menu) => {
        set((state) => ({
            menus: state.menus.map(m => m.id === updatedMenu.id ? updatedMenu : m)
        }));
        try {
            await setDocument('menus', updatedMenu.id, updatedMenu);
        } catch (error) {
            console.error("Failed to update menu", error);
        }
    },

    deleteMenu: async (id: string) => {
        set((state) => ({
            menus: state.menus.filter(m => m.id !== id)
        }));
        try {
            await deleteDocument('menus', id);
        } catch (error) {
            console.error("Failed to delete menu", error);
        }
    },
});
