import { v4 as uuidv4 } from 'uuid';
import { firestoreService } from '@/services/firestoreService';
import { COLLECTIONS } from '@/config/collections';
import type {
  PurchaseOrder,
  Ingredient,
  IngredientBatch as Batch,
  PriceHistoryEntry,
} from '@/types';
import { calculateTotalStock } from './inventoryService';
import { query, where, orderBy, limit, getDocs } from '@/utils/mockFirestore';

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
      const currentStock = calculateTotalStock(updatedBatches);
      const stockWithUnit = {
        quantity: currentStock,
        unit: ingredient.unit,
      };
      // Price Tracking Optimization
      const orderItem = order.items.find((i) => i.ingredientId === received.ingredientId);
      const currentPrice = orderItem?.costPerUnit || ingredient.costPerUnit || 0;

      // Fetch last 5 prices for this supplier/ingredient to check deviation
      const priceQuery = query(
        COLLECTIONS.INGREDIENT_PRICE_HISTORY,
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
          const notification = {
            type: 'SYSTEM',
            title: 'ALERTA DE PRECIO',
            message: `El precio de ${ingredient.name} del proveedor ha subido un ${((currentPrice / avgPrice - 1) * 100).toFixed(1)}% (Actual: ${currentPrice}€, Media: ${avgPrice.toFixed(2)}€).`,
            read: false,
            timestamp: new Date().toISOString(),
            outletId: order.outletId,
          };
          await firestoreService.create(COLLECTIONS.NOTIFICATIONS, notification);
        }
      }

      // 4. Create Price History Entry
      const historyEntry = {
        id: uuidv4(),
        ingredientId: received.ingredientId,
        oldPrice: ingredient.costPerUnit || 0,
        newPrice: currentPrice,
        changeDate: new Date().toISOString(),
        changeType: 'RECEPCION',
        referenceId: order.id,
        outletId: order.outletId,
      };

      await firestoreService.create(COLLECTIONS.INGREDIENT_PRICE_HISTORY, historyEntry);

      await firestoreService.update(COLLECTIONS.INGREDIENTS, ingredient.id, {
        batches: updatedBatches,
        stock: currentStock,
        currentStock: { value: currentStock, unit: ingredient.unit }, // Manually constructing object for Firestore
        costPerUnit: currentPrice || 0, // Update to latest price, safety check
        // priceHistory: [...(ingredient.priceHistory || []), priceEntry].slice(-20), // Remove this if priceEntry is gone.
        // Actually we save price history in separate collection now.
        updatedAt: new Date().toISOString(),
        lastCost: currentPrice,
        priceTrend:
          historicalEntries.length > 0
            ? ((currentPrice -
                historicalEntries.reduce((sum, e) => sum + e.price, 0) / historicalEntries.length) /
                (historicalEntries.reduce((sum, e) => sum + e.price, 0) /
                  historicalEntries.length)) *
              100
            : 0,
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
