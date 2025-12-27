/**
 * Data Backup Utilities
 * Export and import application data as JSON
 */

import { useStore } from '@/presentation/store/useStore';
import { logger } from './logger';
import type {
    Ingredient, Recipe, Menu, Event, Employee, Supplier,
    PurchaseOrder, WasteRecord, DailySchedule
} from '@/types';

// Version for migration compatibility
const BACKUP_VERSION = '1.0';

export interface BackupData {
    version: string;
    exportedAt: string;
    appName: string;
    data: {
        ingredients: unknown[];
        recipes: unknown[];
        menus: unknown[];
        events: unknown[];
        staff: unknown[];
        suppliers: unknown[];
        purchaseOrders: unknown[];
        wasteRecords: unknown[];
        schedule: Record<string, unknown>;
        pccs: unknown[];
        haccpLogs: unknown[];
        haccpTasks: unknown[];
        haccpTaskCompletions: unknown[];
    };
}

/**
 * Export all application data to a JSON file
 */
export const exportData = (): void => {
    const state = useStore.getState();

    const backupData: BackupData = {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        appName: 'ChefOS Kitchen Manager',
        data: {
            ingredients: state.ingredients,
            recipes: state.recipes,
            menus: state.menus,
            events: state.events,
            staff: state.staff,
            suppliers: state.suppliers,
            purchaseOrders: state.purchaseOrders,
            wasteRecords: state.wasteRecords,
            schedule: state.schedule,
            pccs: state.pccs,
            haccpLogs: state.haccpLogs,
            haccpTasks: state.haccpTasks,
            haccpTaskCompletions: state.haccpTaskCompletions,
        }
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `chefos-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Validate backup data structure
 */
const validateBackup = (data: unknown): data is BackupData => {
    if (!data || typeof data !== 'object') return false;

    const backup = data as Partial<BackupData>;

    if (!backup.version || !backup.data) return false;
    if (typeof backup.data !== 'object') return false;

    // Check required arrays exist
    const required = ['ingredients', 'recipes', 'menus', 'events', 'staff'];
    for (const key of required) {
        if (!Array.isArray((backup.data as Record<string, unknown>)[key])) {
            return false;
        }
    }

    // Validate optional arrays
    const optional = ['suppliers', 'purchaseOrders', 'wasteRecords', 'pccs', 'haccpLogs', 'haccpTasks', 'haccpTaskCompletions'];
    for (const key of optional) {
        const value = (backup.data as Record<string, unknown>)[key];
        if (value !== undefined && !Array.isArray(value)) {
            return false;
        }
    }

    // Validate schedule is an object
    if (backup.data.schedule && typeof backup.data.schedule !== 'object') {
        return false;
    }

    return true;
};

/**
 * Safely cast arrays with validation
 */
const safeArrayCast = <T>(data: unknown[], fieldName: string): T[] => {
    if (!Array.isArray(data)) {
        logger.error(`Invalid ${fieldName} data: expected array`);
        return [];
    }
    return data as T[];
};

/**
 * Import data from a JSON backup file
 * @param file - The JSON file to import
 * @param mode - 'replace' to overwrite all data, 'merge' to add to existing
 * @returns Object with success status and any errors
 */
export const importData = async (
    file: File,
    mode: 'replace' | 'merge' = 'replace'
): Promise<{ success: boolean; message: string; stats?: Record<string, number> }> => {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const parsed = JSON.parse(content);

                if (!validateBackup(parsed)) {
                    resolve({
                        success: false,
                        message: 'El archivo no tiene un formato de backup válido'
                    });
                    return;
                }

                const backup = parsed;
                const state = useStore.getState();
                const stats: Record<string, number> = {};

                if (mode === 'replace') {
                    // Replace all data
                    if (backup.data.ingredients) {
                        const ingredients = safeArrayCast<Ingredient>(backup.data.ingredients, 'ingredients');
                        state.setIngredients(ingredients);
                        stats.ingredients = ingredients.length;
                    }
                    if (backup.data.recipes) {
                        const recipes = safeArrayCast<Recipe>(backup.data.recipes, 'recipes');
                        state.setRecipes(recipes);
                        stats.recipes = recipes.length;
                    }
                    if (backup.data.menus) {
                        const menus = safeArrayCast<Menu>(backup.data.menus, 'menus');
                        state.setMenus(menus);
                        stats.menus = menus.length;
                    }
                    if (backup.data.events) {
                        const events = safeArrayCast<Event>(backup.data.events, 'events');
                        state.setEvents(events);
                        stats.events = events.length;
                    }
                    if (backup.data.staff) {
                        const staff = safeArrayCast<Employee>(backup.data.staff, 'staff');
                        state.setStaff(staff);
                        stats.staff = staff.length;
                    }
                    if (backup.data.suppliers) {
                        const suppliers = safeArrayCast<Supplier>(backup.data.suppliers, 'suppliers');
                        state.setSuppliers(suppliers);
                        stats.suppliers = suppliers.length;
                    }
                    if (backup.data.purchaseOrders) {
                        const orders = safeArrayCast<PurchaseOrder>(backup.data.purchaseOrders, 'purchaseOrders');
                        state.setPurchaseOrders(orders);
                        stats.purchaseOrders = orders.length;
                    }
                    // Schedule is handled differently - it's a Record
                    if (backup.data.schedule && typeof backup.data.schedule === 'object') {
                        for (const [key, value] of Object.entries(backup.data.schedule)) {
                            if (value && typeof value === 'object') {
                                state.updateSchedule(key, value as DailySchedule);
                            }
                        }
                        stats.schedule = Object.keys(backup.data.schedule).length;
                    }
                    // Waste records
                    if (backup.data.wasteRecords) {
                        const waste = safeArrayCast<WasteRecord>(backup.data.wasteRecords, 'wasteRecords');
                        state.setWasteRecords(waste);
                        stats.wasteRecords = waste.length;
                    }
                }

                resolve({
                    success: true,
                    message: `Backup importado correctamente (v${backup.version})`,
                    stats
                });

            } catch (error) {
                resolve({
                    success: false,
                    message: `Error al parsear el archivo: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        };

        reader.onerror = () => {
            resolve({ success: false, message: 'Error al leer el archivo' });
        };

        reader.readAsText(file);
    });
};

/**
 * Get backup file size estimation
 */
export const getDataSizeEstimate = (): string => {
    const state = useStore.getState();
    const data = {
        ingredients: state.ingredients,
        recipes: state.recipes,
        menus: state.menus,
        events: state.events,
    };

    const bytes = new Blob([JSON.stringify(data)]).size;

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
