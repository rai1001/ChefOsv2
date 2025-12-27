import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Interface for Ingredient (mirroring shared types broadly)
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
    const { outletId } = request.data;

    // Auth Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    if (!outletId) {
        throw new HttpsError('invalid-argument', 'The function must be called with an outletId.');
    }

    const db = admin.firestore();

    try {
        // 1. Fetch all ingredients for this outlet
        const ingredientsSnap = await db.collection('ingredients')
            .where('outletId', '==', outletId)
            .get();

        if (ingredientsSnap.empty) {
            return { message: "No ingredients found for this outlet.", ordersCreated: [] };
        }

        const ingredients = ingredientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient));

        // 2. Identify items to order (Stock < ParLevel)
        const itemsToOrder = ingredients.filter(i => {
            const current = Number(i.currentStock) || 0;
            const par = Number(i.parLevel) || 0;
            return par > 0 && current < par;
        });

        if (itemsToOrder.length === 0) {
            return { message: "Inventory is healthy. No items below par level.", ordersCreated: [] };
        }

        // 3. Group by Supplier
        const ordersBySupplier: Record<string, OrderItem[]> = {};

        itemsToOrder.forEach(item => {
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
                totalCost: deficiency * (item.costPerUnit || 0)
            });
        });

        // 4. (Step removed - unified with optimized fetch below)

        // 5. Create Purchase Orders
        const batch = db.batch();
        const ordersCreated: string[] = [];
        const timestamp = new Date().toISOString();

        // Optimized Supplier Fetch: Get all unique supplier IDs first
        const uniqueSupplierIds = Object.keys(ordersBySupplier).filter(id => id !== 'unknown_supplier');
        const supplierNameMap: Record<string, string> = {};

        if (uniqueSupplierIds.length > 0) {
            const supplierRefs = uniqueSupplierIds.map(id => db.collection('suppliers').doc(id));
            const supplierDocs = await db.getAll(...supplierRefs);

            supplierDocs.forEach(doc => {
                if (doc.exists) {
                    supplierNameMap[doc.id] = doc.data()?.name || "Unknown Supplier";
                }
            });
        }

        for (const [supplierId, items] of Object.entries(ordersBySupplier)) {
            const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

            // Get Supplier Name from map
            let supplierName = "Unknown Supplier";
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
                deliveryDate: '', // To be filled by user
                items: items,
                totalAmount: totalAmount,
                createdBy: request.auth.uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            batch.set(newOrderRef, orderData);
            ordersCreated.push(newOrderRef.id);
        }

        await batch.commit();

        return {
            success: true,
            message: `Generated ${ordersCreated.length} draft orders.`,
            ordersCreated,
            itemCount: itemsToOrder.length
        };

    } catch (error: any) {
        console.error("Error generating purchase orders:", error);
        throw new HttpsError('internal', 'Failed to generate orders: ' + error.message);
    }
});
