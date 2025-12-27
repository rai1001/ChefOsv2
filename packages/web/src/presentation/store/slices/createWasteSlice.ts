import type { StateCreator } from 'zustand';
import type { AppState, WasteSlice, WasteRecord, InventoryItem } from '@/presentation/store/types';
import { consumeStockFIFO, createMigrationBatch } from '@/services/inventoryService';
import { setDocument, deleteDocument, updateDocument } from '@/services/firestoreService';

export const createWasteSlice: StateCreator<
    AppState,
    [],
    [],
    WasteSlice
> = (set, get) => ({
    wasteRecords: [],

    setWasteRecords: (records: WasteRecord[]) => set({ wasteRecords: records }),

    addWasteRecord: async (record: WasteRecord) => {
        const { inventory, activeOutletId } = get();
        const inventoryIndex = inventory.findIndex(
            (i: InventoryItem) => i.ingredientId === record.ingredientId && i.outletId === activeOutletId
        );

        if (inventoryIndex === -1) {
            set((state) => ({ wasteRecords: [...state.wasteRecords, record] }));
            try {
                await setDocument("wasteRecords", record.id, record);
            } catch (error) {
                console.error("Failed to persist waste record", error);
            }
            return;
        }

        const inventoryItem = { ...inventory[inventoryIndex]! };

        // Ensure item has batches
        if (!inventoryItem.batches || inventoryItem.batches.length === 0) {
            inventoryItem.batches = [createMigrationBatch(
                inventoryItem.ingredientId || '',
                inventoryItem.stock || 0,
                0, // costPerUnit
                activeOutletId || 'unknown'
            )];
        }

        // Use centralized FIFO consumption
        const { newBatches } = consumeStockFIFO(inventoryItem.batches, record.quantity);

        inventoryItem.batches = newBatches;
        inventoryItem.stock = newBatches.reduce((sum, b) => sum + b.currentQuantity, 0);
        inventoryItem.updatedAt = new Date().toISOString();

        const newInventory = [...inventory];
        newInventory[inventoryIndex] = inventoryItem;

        set((state) => ({
            wasteRecords: [...state.wasteRecords, record],
            inventory: newInventory
        }));

        try {
            await Promise.all([
                setDocument("wasteRecords", record.id, record),
                updateDocument("inventory", inventoryItem.id, {
                    batches: newBatches,
                    stock: inventoryItem.stock,
                    updatedAt: inventoryItem.updatedAt
                })
            ]);
        } catch (error) {
            console.error("Failed to persist waste and inventory update", error);
        }
    },

    deleteWasteRecord: async (id: string) => {
        set((state) => ({
            wasteRecords: state.wasteRecords.filter((w) => w.id !== id)
        }));
        try {
            await deleteDocument("wasteRecords", id);
        } catch (error) {
            console.error("Failed to delete waste record", error);
        }
    },
});
