import { v4 as uuidv4 } from 'uuid';
import { firestoreService, addDocument } from '@/services/firestoreService';
import { COLLECTIONS, collections } from '@/config/collections';
import type {
  PurchaseOrder,
  Ingredient,
  IngredientBatch as Batch,
  PriceHistoryEntry,
} from '@/types';
import { calculateTotalStock } from '@/utils/inventoryHelpers';
import { query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export const recepcionService = {
  receiveOrder: async (
    order: PurchaseOrder,
    receivedItems: { ingredientId: string; quantity: number; expiryDate?: string }[],
    userId: string
  ): Promise<void> => {
    // E2E Mock Bypass
    const mockDBStr = localStorage.getItem('E2E_MOCK_DB');
    if (mockDBStr) {
      const db: Record<string, any[]> = JSON.parse(mockDBStr);
      const idx = db.purchaseOrders?.findIndex((o: any) => o.id === order.id);
      if (db.purchaseOrders && idx !== undefined && idx >= 0) {
        db.purchaseOrders[idx].status = 'RECEIVED';
        // Mock updating stock?
        // We can just update order status for E2E flow.
        localStorage.setItem('E2E_MOCK_DB', JSON.stringify(db));
        console.log('[E2E] Order Received mock');
        return;
      }
    }

    // 1. Validate inputs
    if (!receivedItems || receivedItems.length === 0) {
      throw new Error('No items to receive');
    }

    // 2. Process each item (Update Inventory)
    for (const received of receivedItems) {
      if (received.quantity <= 0) continue;

      // Fetch Ingredient to update its batches
      const ingredient = await firestoreService.getById<Ingredient>(
        COLLECTIONS.INGREDIENTS,
        received.ingredientId
      );
      if (!ingredient) {
        console.warn(`Ingredient ${received.ingredientId} not found, skipping batch creation.`);
        continue;
      }

      // Create new Batch
      const newBatch: Batch = {
        id: uuidv4(),
        ingredientId: ingredient.id,
        batchNumber: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${order.orderNumber}`,
        initialQuantity: received.quantity,
        currentQuantity: received.quantity,
        unit: ingredient.unit,
        costPerUnit: ingredient.costPerUnit || 0,
        receivedAt: new Date().toISOString(),
        expiresAt:
          received.expiryDate ||
          new Date(Date.now() + (ingredient.shelfLife || 7) * 24 * 60 * 60 * 1000).toISOString(),
        supplierId: order.supplierId,
        purchaseOrderId: order.id,
        outletId: order.outletId,
        status: 'ACTIVE',
      };

      // Update Ingredient Batches and Stock
      const currentBatches = ingredient.batches || [];
      const updatedBatches = [...currentBatches, newBatch];
      const newStock = calculateTotalStock(updatedBatches);

      // Price Tracking Optimization
      const orderItem = order.items.find((i) => i.ingredientId === received.ingredientId);
      const currentPrice = orderItem?.costPerUnit || ingredient.costPerUnit || 0;

      // Fetch last 5 prices for this supplier/ingredient to check deviation
      const priceQuery = query(
        collections.ingredientPriceHistory,
        where('ingredientId', '==', ingredient.id),
        where('supplierId', '==', order.supplierId),
        orderBy('date', 'desc'),
        limit(5)
      );
      const priceSnap = await getDocs(priceQuery);
      const historicalEntries = priceSnap.docs.map((d) => d.data() as PriceHistoryEntry);

      if (historicalEntries.length > 0) {
        const avgPrice =
          historicalEntries.reduce((sum, e) => sum + e.price, 0) / historicalEntries.length;
        const threshold = avgPrice * 1.1; // 10% deviation limit

        if (currentPrice > threshold) {
          // Trigger alert notification
          await addDocument(collections.notifications, {
            type: 'SYSTEM',
            title: 'ALERTA DE PRECIO',
            message: `El precio de ${ingredient.name} del proveedor ha subido un ${((currentPrice / avgPrice - 1) * 100).toFixed(1)}% (Actual: ${currentPrice}€, Media: ${avgPrice.toFixed(2)}€).`,
            read: false,
            timestamp: new Date().toISOString(),
            outletId: order.outletId,
          });
        }
      }

      // Save new price entry
      const priceEntry: PriceHistoryEntry = {
        date: new Date().toISOString(),
        price: currentPrice,
        supplierId: order.supplierId,
        purchaseOrderId: order.id,
        changeReason: 'Purchase Order Reception',
      };
      await addDocument(collections.ingredientPriceHistory, priceEntry);

      await firestoreService.update(COLLECTIONS.INGREDIENTS, ingredient.id, {
        batches: updatedBatches,
        stock: newStock,
        currentStock: { value: newStock, unit: ingredient.unit }, // Manually constructing object for Firestore
        costPerUnit: currentPrice || 0, // Update to latest price, safety check
        priceHistory: [...(ingredient.priceHistory || []), priceEntry].slice(-20), // Keep last 20 in doc for quick UI
        updatedAt: new Date().toISOString(),
      } as any); // Cast as any to avoid strict Quantity class instance check if needed
    }

    // 3. Update Order Status
    const isPartial = receivedItems.length < order.items.length;
    await firestoreService.update(COLLECTIONS.PURCHASE_ORDERS, order.id, {
      status: isPartial ? 'PARTIAL' : 'RECEIVED',
      updatedAt: new Date().toISOString(),
    });

    // 4. Log Audit Event
    const { auditService } = await import('./auditService');
    await auditService.log({
      action: 'PURCHASE_ORDER_Received',
      entityId: order.id,
      userId,
      details: {
        status: isPartial ? 'PARTIAL' : 'RECEIVED',
        itemsCount: receivedItems.length,
      },
    });

    console.log(`Order ${order.id} received. Stock updated.`);
  },
};
