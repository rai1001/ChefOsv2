import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

interface AutoPurchaseSettings {
    enabled: boolean;
    runFrequency: 'DAILY' | 'WEEKLY';
    runDay?: number; // 0=Sunday, 1=Monday...
    runTime?: string; // "HH:MM" 24h format
    generateDraftsOnly: boolean;
}

interface Ingredient {
    id: string;
    stock?: number;
    optimalStock?: number;
    reorderPoint?: number;
    supplierId?: string;
    unit: string;
    costPerUnit: number;
    name: string;
}

// Helper to check if we should run now
const shouldRunNow = (settings: AutoPurchaseSettings): boolean => {
    if (!settings.enabled) return false;

    const now = new Date();
    // Adjust to outlet timezone? For now assume UTC or server time, ideally store timezone in outlet settings
    // This is a simplified check. In production, we'd check if "current time" matches "runTime" within the hour.

    // Check Day
    if (settings.runFrequency === 'WEEKLY') {
        const currentDay = now.getDay(); // 0-6
        if (settings.runDay !== undefined && settings.runDay !== currentDay) {
            return false;
        }
    }

    // Check Time (Hourly granularity)
    if (settings.runTime) {
        const [targetHour] = settings.runTime.split(':').map(Number);
        const currentHour = now.getHours();
        if (currentHour !== targetHour) return false;
    }

    return true;
};

export const autoPurchaseScheduler = onSchedule("every 1 hours", async (event) => {
    const db = admin.firestore();
    console.log("Starting Auto Purchase Scheduler...");

    try {
        const outletsSnap = await db.collection('outlets').get();

        for (const outletDoc of outletsSnap.docs) {
            const outletId = outletDoc.id;
            const outletData = outletDoc.data();
            const settings = outletData.autoPurchaseSettings as AutoPurchaseSettings | undefined;

            if (!settings || !shouldRunNow(settings)) {
                continue;
            }

            console.log(`Processing Auto Purchase for Outlet: ${outletId}`);

            // 1. Fetch Ingredients, Batches, and Existing Drafts from Today
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const [ingredientsSnap, batchesSnap, existingOrdersSnap] = await Promise.all([
                db.collection('ingredients').where('outletId', '==', outletId).get(),
                db.collection('batches').where('outletId', '==', outletId).where('status', '==', 'ACTIVE').get(),
                db.collection('purchaseOrders')
                    .where('outletId', '==', outletId)
                    .where('status', '==', 'DRAFT')
                    .where('type', '==', 'AUTOMATIC')
                    .where('date', '>=', todayStart.toISOString())
                    .get()
            ]);

            const ingredients = ingredientsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Ingredient));
            const batches = batchesSnap.docs.map(d => d.data());
            const existingSupplierIds = new Set(existingOrdersSnap.docs.map(d => d.data().supplierId));

            // 2. Calculate Real Stock from Batches
            const stockMap: Record<string, number> = {};
            batches.forEach(b => {
                const ingId = b.ingredientId;
                stockMap[ingId] = (stockMap[ingId] || 0) + (b.currentQuantity || 0);
            });

            // 3. Identify Needs (Reorder Point Logic)
            const needs = ingredients.filter(ing => {
                const current = stockMap[ing.id] ?? ing.stock ?? 0;
                const optimal = ing.optimalStock || 0;
                const reorder = ing.reorderPoint ?? (optimal * 0.2);

                return optimal > 0 && current <= reorder;
            }).map(ing => ({
                ingredient: ing,
                quantity: (ing.optimalStock || 0) - (stockMap[ing.id] ?? ing.stock ?? 0)
            }));

            if (needs.length === 0) {
                console.log(`No needs identified for outlet: ${outletId}`);
                continue;
            }

            // 4. Group by Supplier and filter out those with existing drafts today
            const bySupplier: Record<string, typeof needs> = {};
            needs.forEach(item => {
                const supId = item.ingredient.supplierId || 'SIN_ASIGNAR';
                if (existingSupplierIds.has(supId)) return; // Skip if draft already exists

                if (!bySupplier[supId]) bySupplier[supId] = [];
                bySupplier[supId].push(item);
            });

            // 5. Create Purchase Orders
            const batch = db.batch();
            let ordersCreatedCount = 0;
            const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

            for (const [supplierId, items] of Object.entries(bySupplier)) {
                if (supplierId === 'SIN_ASIGNAR') continue;

                const ref = db.collection('purchaseOrders').doc();
                const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.ingredient.costPerUnit), 0);
                const shortId = ref.id.slice(0, 4).toUpperCase();
                const orderNumber = `AUTO-${todayStr}-${shortId}`;

                batch.set(ref, {
                    id: ref.id,
                    orderNumber,
                    supplierId,
                    outletId,
                    date: new Date().toISOString(),
                    status: 'DRAFT',
                    type: 'AUTOMATIC',
                    generatedAt: new Date().toISOString(),
                    items: items.map(i => ({
                        ingredientId: i.ingredient.id,
                        quantity: i.quantity,
                        unit: i.ingredient.unit,
                        costPerUnit: i.ingredient.costPerUnit,
                        tempDescription: i.ingredient.name
                    })),
                    totalCost,
                    notes: 'Generado automáticamente por planificador (Stock Bajo)'
                });
                ordersCreatedCount++;
            }

            if (ordersCreatedCount > 0) {
                await batch.commit();

                await db.collection('notifications').add({
                    type: 'SYSTEM',
                    message: `Se han generado ${ordersCreatedCount} borradores de pedido automáticos por stock bajo.`,
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    outletId,
                    link: '/purchasing'
                });

                console.log(`Generated ${ordersCreatedCount} orders for outlet ${outletId}`);
            }
        }

    } catch (error: any) {
        console.error("Error in Auto Purchase Scheduler:", error);
    }
});
