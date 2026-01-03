import { setDocument, queryDocuments, batchSetDocuments } from './firestoreService';
import { COLLECTIONS } from '@/config/collections';
import { v4 as uuidv4 } from 'uuid';
import type { Ingredient, PurchaseOrder, PurchaseOrderItem } from '@/types';
import { performanceUtils } from '@/utils/performance';

// Helper to determine order quantity based on needs and supplier constraints
export const calculateOrderQuantity = (
  need: number,
  minOrder?: number
  // packSize? // Future: optimization for pack sizes
): number => {
  let quantity = need;
  if (minOrder && quantity < minOrder) {
    quantity = minOrder;
  }
  return Math.ceil(quantity * 100) / 100; // Round to 2 decimals
};

export const prepareDraftOrderData = (
  supplierId: string,
  outletId: string,
  items: { ingredient: Ingredient; quantity: number }[]
): PurchaseOrder => {
  // Calculate totals
  const orderItems: PurchaseOrderItem[] = items.map(({ ingredient, quantity }) => ({
    ingredientId: ingredient.id,
    quantity,
    unit: ingredient.unit,
    costPerUnit: ingredient.costPerUnit || 0,
  }));

  const totalCost = orderItems.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0);
  const orderId = uuidv4();
  const orderNumber =
    `PED-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${orderId.slice(0, 4)}`.toUpperCase();

  return {
    id: orderId,
    orderNumber,
    supplierId,
    outletId,
    status: 'DRAFT',
    date: new Date().toISOString(),
    items: orderItems,
    totalCost,
    type: 'MANUAL',
    notes: 'Generado automáticamente',
  };
};

export const generateDraftOrder = async (
  supplierId: string,
  outletId: string,
  items: { ingredient: Ingredient; quantity: number }[]
): Promise<string> => {
  const orderData = prepareDraftOrderData(supplierId, outletId, items);
  // Pass collection name string directly
  await setDocument(COLLECTIONS.PURCHASE_ORDERS, orderData.id, orderData);
  return orderData.id;
};

// Logic to analyze stock vs optimal levels
export const calculateStockNeeds = (
  ingredients: Ingredient[]
): { ingredient: Ingredient; deficit: number }[] => {
  return ingredients
    .filter((ing) => {
      // Only consider ingredients with optimalStock defined and tracked
      const currentStock = ing.currentStock?.value ?? ing.stock ?? 0;
      const optimal = ing.optimalStock?.value ?? 0;
      const reorderPoint = ing.reorderPoint?.value ?? optimal * 0.2; // Default to 20% if not set

      return optimal > 0 && currentStock <= reorderPoint;
    })
    .map((ing) => ({
      ingredient: ing,
      deficit: (ing.optimalStock?.value || 0) - (ing.currentStock?.value || ing.stock || 0),
    }));
};

/**
 * Main function to run the "Restock" algorithm for a specific supplier
 * or all suppliers if supplierId is not provided.
 */
export const runAutorestock = async (outletId: string, supplierId?: string): Promise<string[]> => {
  return performanceUtils.measureAsync('runAutorestock', async () => {
    // 1. Fetch all ingredients for the outlet
    // Use firestoreService query abstraction
    // In firestoreService, queryDocuments expects (collectionRef, options, ...constraints)
    // But since constraints were removed/stubbed in firestoreService, we might rely on the generic getAll + filter in memory if query isn't robust,
    // OR we pass basics. firestoreService.queryDocuments warns about constraints.
    // Better to use a direct service call if firestoreService is weak.
    // But let's try to stick to firestoreService signature or improve it.
    // For now, let's just fetch all (which firestoreService.queryDocuments fallback does) and filter manually.

    // Actually, let's use the explicit getAll from firestoreService if we can't filter effectively.
    // Wait, getting ALL ingredients might be heavy.
    // For now, assume it's okay or that queryDocuments fallback handles path.
    const allIngredients = await queryDocuments<Ingredient>(COLLECTIONS.INGREDIENTS);
    // Filter by outletId in memory since queryDocuments stub doesn't handle where() yet
    const outletIngredients = allIngredients.filter((i) => i.outletId === outletId);

    // 2. Calculate needs
    const needs = calculateStockNeeds(outletIngredients);
    if (needs.length === 0) return [];

    // 3. Group by Supplier
    const bySupplier: Record<string, { ingredient: Ingredient; quantity: number }[]> = {};

    needs.forEach((need) => {
      const supId = need.ingredient.supplierId || 'UNKNOWN';
      if (supplierId && supId !== supplierId) return; // Filter if specific supplier requested

      if (!bySupplier[supId]) bySupplier[supId] = [];
      bySupplier[supId].push({
        ingredient: need.ingredient,
        quantity: need.deficit,
      });
    });

    // 4. Create Draft Orders (Batch)
    const createdOrderIds: string[] = [];
    const documentsToCreate: { id: string; data: PurchaseOrder }[] = [];

    for (const [supId, items] of Object.entries(bySupplier)) {
      if (supId === 'UNKNOWN') continue;

      const orderData = prepareDraftOrderData(supId, outletId, items);
      documentsToCreate.push({ id: orderData.id, data: orderData });
      createdOrderIds.push(orderData.id);
    }

    if (documentsToCreate.length > 0) {
      await batchSetDocuments(COLLECTIONS.PURCHASE_ORDERS, documentsToCreate);
    }

    return createdOrderIds;
  });
};
