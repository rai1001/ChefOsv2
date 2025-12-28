import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logError } from '../utils/logger';
import { checkRateLimit } from '../utils/rateLimiter';

interface Ingredient {
  id: string;
  name: string;
  supplierId: string;
  currentStock: number;
  parLevel: number;
  unit: string;
  costPerUnit: number;
  category?: string;
  outletId: string;
}

interface OrderItem {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

export const generatePurchaseOrder = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { outletId } = request.data;
  if (!outletId) {
    throw new HttpsError('invalid-argument', 'The function must be called with an outletId.');
  }

  await checkRateLimit(uid, 'generate_purchase_order');

  const db = admin.firestore();

  try {
    const ingredientsSnap = await db
      .collection('ingredients')
      .where('outletId', '==', outletId)
      .get();

    if (ingredientsSnap.empty) {
      return { message: 'No ingredients found for this outlet.', ordersCreated: [] };
    }

    const ingredients = ingredientsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Ingredient
    );

    const itemsToOrder = ingredients.filter((i) => {
      const current = Number(i.currentStock) || 0;
      const par = Number(i.parLevel) || 0;
      return par > 0 && current < par;
    });

    if (itemsToOrder.length === 0) {
      return { message: 'Inventory is healthy. No items below par level.', ordersCreated: [] };
    }

    const ordersBySupplier: Record<string, OrderItem[]> = {};
    itemsToOrder.forEach((item) => {
      const supplierId = item.supplierId || 'unknown_supplier';
      const deficiency = (item.parLevel || 0) - (item.currentStock || 0);

      if (!ordersBySupplier[supplierId]) {
        ordersBySupplier[supplierId] = [];
      }

      ordersBySupplier[supplierId].push({
        ingredientId: item.id,
        name: item.name,
        quantity: deficiency,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
        totalCost: deficiency * (item.costPerUnit || 0),
      });
    });

    const batch = db.batch();
    const ordersCreated: string[] = [];
    const timestamp = new Date().toISOString();

    const uniqueSupplierIds = Object.keys(ordersBySupplier).filter(
      (id) => id !== 'unknown_supplier'
    );
    const supplierNameMap: Record<string, string> = {};

    if (uniqueSupplierIds.length > 0) {
      const supplierRefs = uniqueSupplierIds.map((id) => db.collection('suppliers').doc(id));
      const supplierDocs = await db.getAll(...supplierRefs);

      supplierDocs.forEach((doc) => {
        if (doc.exists) {
          supplierNameMap[doc.id] = doc.data()?.name || 'Unknown Supplier';
        }
      });
    }

    for (const [supplierId, items] of Object.entries(ordersBySupplier)) {
      const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

      let supplierName = 'Unknown Supplier';
      if (supplierId !== 'unknown_supplier') {
        supplierName = supplierNameMap[supplierId] || supplierName;
      }

      const newOrderRef = db.collection('purchaseOrders').doc();
      const orderData = {
        id: newOrderRef.id,
        supplierId: supplierId,
        supplierName: supplierName,
        outletId: outletId,
        status: 'draft',
        date: timestamp,
        deliveryDate: '',
        items: items,
        totalAmount: totalAmount,
        createdBy: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      batch.set(newOrderRef, orderData);
      ordersCreated.push(newOrderRef.id);
    }

    await batch.commit();

    return {
      success: true,
      ordersCreated,
      itemCount: itemsToOrder.length,
    };
  } catch (error: any) {
    logError('Order Generator Error:', error, { uid, outletId });
    throw new HttpsError('internal', 'Internal error generating orders.');
  }
});
