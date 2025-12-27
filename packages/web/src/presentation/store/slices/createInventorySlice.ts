import type { StateCreator } from 'zustand';
import type { AppState, InventorySlice, InventoryItem, IngredientBatch } from '@/presentation/store/types';
import { setDocument, updateDocument } from '@/services/firestoreService';

export const createInventorySlice: StateCreator<
    AppState,
    [],
    [],
    InventorySlice
> = (set, get) => ({
    inventory: [],
    setInventory: (items: InventoryItem[]) => set({ inventory: items }),

    addInventoryItem: async (item: InventoryItem) => {
        set((state) => ({
            inventory: [...state.inventory, item]
        }));
        try {
            await setDocument('inventory', item.id, item);
        } catch (error) {
            console.error("Failed to persist inventory item", error);
        }
    },

    updateInventoryItem: async (item: InventoryItem) => {
        set((state) => ({
            inventory: state.inventory.map((i) => (i.id === item.id ? item : i))
        }));
        try {
            await updateDocument('inventory', item.id, item);
        } catch (error) {
            console.error("Failed to update inventory item", error);
        }
    },

    addBatch: async (itemId: string, batchData: Partial<IngredientBatch>, standaloneData?: { name: string; unit: any; category: any; costPerUnit: number }) => {
        const { activeOutletId, inventory } = get();
        // Look up by ID directly
        const inventoryIndex = inventory.findIndex(i => i.id === itemId && i.outletId === activeOutletId);

        let inventoryItem: InventoryItem;

        if (inventoryIndex === -1) {
            // If not found by ID, it might be a new item or we might need to create it from standaloneData
            if (!standaloneData) {
                console.error("Cannot add batch to non-existent inventory item without standaloneData");
                return;
            }

            inventoryItem = {
                id: itemId,
                ingredientId: batchData.ingredientId || '',
                outletId: activeOutletId || 'unknown',
                name: standaloneData.name,
                unit: standaloneData.unit,
                category: standaloneData.category,
                costPerUnit: standaloneData.costPerUnit,
                stock: 0,
                theoreticalStock: 0,
                minStock: 5,
                optimalStock: 10,
                batches: [],
                updatedAt: new Date().toISOString()
            };
        } else {
            inventoryItem = { ...inventory[inventoryIndex]! };
        }

        const newBatch: IngredientBatch = {
            id: (crypto as any).randomUUID?.() || Math.random().toString(36).substring(2, 11),
            ingredientId: inventoryItem.ingredientId,
            batchNumber: batchData.batchNumber || `LOT-${Date.now()}`,
            initialQuantity: batchData.initialQuantity || batchData.currentQuantity || 0,
            currentQuantity: batchData.currentQuantity || 0,
            unit: inventoryItem.unit,
            costPerUnit: batchData.costPerUnit || inventoryItem.costPerUnit,
            receivedAt: new Date().toISOString(),
            expiresAt: batchData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            outletId: activeOutletId || 'unknown',
            status: 'ACTIVE'
        };

        const updatedBatches = [...(inventoryItem.batches || []), newBatch];
        inventoryItem.batches = updatedBatches;
        inventoryItem.stock = updatedBatches.reduce((sum, b) => sum + b.currentQuantity, 0);
        inventoryItem.updatedAt = new Date().toISOString();

        const newInventory = [...inventory];
        if (inventoryIndex === -1) newInventory.push(inventoryItem);
        else newInventory[inventoryIndex] = inventoryItem;

        set({ inventory: newInventory });

        try {
            await setDocument('inventory', inventoryItem.id, inventoryItem);
        } catch (error) {
            console.error("Failed to persist inventory after batch add", error)
        }
    },

    consumeStock: async (itemId: string, quantity: number) => {
        const { activeOutletId, inventory } = get();
        const inventoryIndex = inventory.findIndex(i => i.id === itemId && i.outletId === activeOutletId);

        if (inventoryIndex === -1) return;

        const inventoryItem = { ...inventory[inventoryIndex]! };
        let remaining = quantity;

        const batches = [...(inventoryItem.batches || [])].sort((a, b) =>
            new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
        );
        const newBatches: IngredientBatch[] = [];

        for (const batch of batches) {
            if (remaining <= 0) {
                newBatches.push(batch);
                continue;
            }

            if (batch.currentQuantity > remaining) {
                newBatches.push({ ...batch, currentQuantity: batch.currentQuantity - remaining });
                remaining = 0;
            } else {
                remaining -= batch.currentQuantity;
            }
        }

        inventoryItem.batches = newBatches;
        inventoryItem.stock = newBatches.reduce((sum, b) => sum + b.currentQuantity, 0);
        inventoryItem.updatedAt = new Date().toISOString();

        const newInventory = [...inventory];
        newInventory[inventoryIndex] = inventoryItem;

        set({ inventory: newInventory });

        try {
            await updateDocument('inventory', inventoryItem.id, {
                batches: newBatches,
                stock: inventoryItem.stock,
                updatedAt: inventoryItem.updatedAt
            });
        } catch (error) {
            console.error("Failed to persist inventory after consumption", error);
        }
    },
});
