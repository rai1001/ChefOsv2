import type { StateCreator } from 'zustand';
import type { AppState, PurchaseSlice, Supplier, PurchaseOrder, PurchaseOrderFilters } from '@/presentation/store/types';
import { setDocument, deleteDocument, getPurchaseOrdersPage } from '@/services/firestoreService';

export const createPurchaseSlice: StateCreator<
    AppState,
    [],
    [],
    PurchaseSlice
> = (set, get) => ({
    suppliers: [],

    // Pagination State
    purchaseOrders: [],
    purchaseOrdersLoading: false,
    purchaseOrdersError: null,
    purchaseOrdersHasMore: true,
    purchaseOrdersCursor: null,
    purchaseOrdersFilters: { status: 'ALL', supplierId: 'ALL' },
    purchasingNotes: '',

    // Supplier actions
    setSuppliers: (suppliers: Supplier[]) => set({ suppliers }),

    addSupplier: async (supplier: Supplier) => {
        set((state) => ({
            suppliers: [...state.suppliers, supplier]
        }));
        try {
            await setDocument("suppliers", supplier.id, supplier);
        } catch (error) {
            console.error("Failed to add supplier", error);
        }
    },

    updateSupplier: async (updatedSupplier: Supplier) => {
        set((state) => ({
            suppliers: state.suppliers.map((s) => s.id === updatedSupplier.id ? updatedSupplier : s)
        }));
        try {
            await setDocument("suppliers", updatedSupplier.id, updatedSupplier);
        } catch (error) {
            console.error("Failed to update supplier", error);
        }
    },

    deleteSupplier: async (id: string) => {
        set((state) => ({
            suppliers: state.suppliers.filter((s) => s.id !== id)
        }));
        try {
            await deleteDocument("suppliers", id);
        } catch (error) {
            console.error("Failed to delete supplier", error);
        }
    },

    // Purchase Order actions
    setPurchaseOrders: (purchaseOrders: PurchaseOrder[]) => set({ purchaseOrders }),

    addPurchaseOrder: async (order: PurchaseOrder) => {
        try {
            await setDocument("purchaseOrders", order.id, order);
            get().fetchPurchaseOrders({ reset: true });
        } catch (error) {
            console.error("Failed to add purchase order", error);
        }
    },

    updatePurchaseOrder: async (updatedOrder: PurchaseOrder) => {
        try {
            await setDocument("purchaseOrders", updatedOrder.id, updatedOrder);
            get().fetchPurchaseOrders({ reset: true });
        } catch (error) {
            console.error("Failed to update purchase order", error);
        }
    },

    deletePurchaseOrder: async (id: string) => {
        try {
            await deleteDocument("purchaseOrders", id);
            get().fetchPurchaseOrders({ reset: true });
        } catch (error) {
            console.error("Failed to delete purchase order", error);
        }
    },

    // Async Actions
    fetchPurchaseOrders: async (options: { reset?: boolean } = {}) => {
        const { reset = false } = options;
        const { purchaseOrdersFilters, purchaseOrdersCursor, activeOutletId, purchaseOrdersLoading } = get();

        if (!activeOutletId) {
            set({ purchaseOrders: [], purchaseOrdersHasMore: false });
            return;
        }

        if (purchaseOrdersLoading) return;

        set({ purchaseOrdersLoading: true, purchaseOrdersError: null });

        try {
            const cursor = reset ? null : purchaseOrdersCursor;
            const pageSize = 20;

            const result = await getPurchaseOrdersPage({
                outletId: activeOutletId,
                filters: purchaseOrdersFilters,
                pageSize,
                cursor
            });

            set((state) => ({
                purchaseOrders: reset ? result.items : [...state.purchaseOrders, ...result.items],
                purchaseOrdersCursor: result.nextCursor,
                purchaseOrdersHasMore: result.hasMore,
                purchaseOrdersLoading: false
            }));

        } catch (error: any) {
            console.error("Error fetching purchase orders", error);
            set({
                purchaseOrdersLoading: false,
                purchaseOrdersError: error.message || "Failed to fetch orders"
            });
        }
    },

    loadMorePurchaseOrders: async () => {
        const { purchaseOrdersHasMore, purchaseOrdersLoading } = get();
        if (purchaseOrdersHasMore && !purchaseOrdersLoading) {
            await get().fetchPurchaseOrders({ reset: false });
        }
    },

    setPurchaseOrderFilters: (filters: PurchaseOrderFilters) => {
        set({ purchaseOrdersFilters: filters });
        get().fetchPurchaseOrders({ reset: true });
    },

    receivePurchaseOrderItems: async (orderId: string, receivedItems: Record<string, number>) => {
        const state = get();
        const order = state.purchaseOrders.find((o) => o.id === orderId);
        if (!order) return;

        // 1. Update Order Items
        const updatedItems = order.items.map((item) => {
            const receivedNow = receivedItems[item.ingredientId] || 0;
            return {
                ...item,
                receivedQuantity: (item.receivedQuantity || 0) + receivedNow
            };
        });

        // 2. Determine Status
        const allReceived = updatedItems.every((i) => (i.receivedQuantity || 0) >= i.quantity);
        const anyReceived = updatedItems.some((i) => (i.receivedQuantity || 0) > 0);
        const newStatus = allReceived ? 'RECEIVED' : (anyReceived ? 'PARTIAL' : order.status);
        const actualDeliveryDate = allReceived ? new Date().toISOString() : order.actualDeliveryDate;

        const updatedOrder = { ...order, items: updatedItems, status: newStatus, actualDeliveryDate };

        try {
            // Save Order
            await setDocument("purchaseOrders", orderId, updatedOrder);

            // 3. Update Inventory (Batches)
            for (const [ingId, qty] of Object.entries(receivedItems)) {
                if (qty <= 0) continue;
                const item = updatedItems.find((i) => i.ingredientId === ingId);
                const cost = item?.costPerUnit || 0;

                // Call addBatch which handles both local state and Firestore persistence to the 'inventory' collection
                await get().addBatch(ingId, {
                    initialQuantity: qty,
                    currentQuantity: qty,
                    costPerUnit: cost,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    unit: item?.unit || 'un'
                } as any);
            }

            get().fetchPurchaseOrders({ reset: true });

        } catch (error) {
            console.error("Failed to receive items", error);
        }
    },

    clearSuppliers: () => set({ suppliers: [] }),

    updatePurchasingNotes: async (notes: string) => {
        const { activeOutletId } = get();
        if (!activeOutletId) return;

        set({ purchasingNotes: notes });
        try {
            await setDocument("system_config", `purchasing_notes_${activeOutletId}`, { notes });
        } catch (error) {
            console.error("Failed to save purchasing notes", error);
        }
    }
});
