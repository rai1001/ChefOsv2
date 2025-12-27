import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Scheduled Cron Job: Checks stock levels daily at 08:00 AM.
 * Creates notifications for items below minStock.
 */
export const checkStockAlerts = functions.pubsub
    .schedule('0 8 * * *')
    .timeZone('Europe/Madrid') // Adjust timezone as needed
    .onRun(async (context) => {
        console.log('Running checkStockAlerts...');

        // 1. Get all outlets (to iterate inventory per outlet if structure requires, or query global inventory if possible)
        // Inventory is stored in `outlets/{outletId}/inventory` (subcollection) or root `inventory`?
        // Checking `collections.ts`: `inventory: collection(db, COLLECTION_NAMES.INVENTORY)` -> `inventory` root?
        // Wait, earlier I assumed `outlets/{outletId}/inventory`.
        // Let's check `src/services/inventoryService.ts` and `collections.ts` again.
        // `collections.inventory` -> `inventory` (root).
        // `inventoryService.ts` queries it with `where('outletId', '==', ...)`
        // So `inventory` IS A ROOT COLLECTION with `outletId` field.

        const inventoryRef = db.collection('inventory');
        // We can query all items with stock < minStock directly if Firestore allows (inequality filter).
        // However, we can't filter by `stock < minStock` directly because `minStock` is a field on the doc, not a constant.
        // Firestore doesn't support `where('stock', '<', FieldPath('minStock'))`.
        // We must fetch all items (or chunked) and check in code, OR rely on a pre-computed flag `isLowStock` (which we don't have yet).
        // For scalability, fetching ALL inventory every day might be heavy if millions of items.
        // But for a kitchen app, likely thousands.
        // We'll fetch all.

        const snapshot = await inventoryRef.get();
        const alerts: any[] = []; // Typed as Notification later

        const batch = db.batch();
        let batchCount = 0;

        snapshot.docs.forEach(doc => {
            const item = doc.data();
            // Check if stock is low
            if (item.stock !== undefined && item.minStock !== undefined && item.stock < item.minStock) {
                // Create Notification
                const notificationRef = db.collection('notifications').doc();
                const notification = {
                    id: notificationRef.id,
                    type: 'SYSTEM', // or specific STOCK_ALERT type if defined, types says HACCP_ALERT | SYSTEM | ORDER_UPDATE
                    title: 'Alerta de Stock Bajo',
                    message: `El producto ${item.name || 'Desconocido'} está por debajo del mínimo (${item.stock} / ${item.minStock} ${item.unit})`,
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    outletId: item.outletId,
                    link: `/inventory` // Deep link
                };

                batch.set(notificationRef, notification);
                alerts.push(notification);
                batchCount++;
            }
        });

        if (batchCount > 0) {
            await batch.commit();
            console.log(`Created ${batchCount} stock alerts.`);
        } else {
            console.log('No stock alerts needed.');
        }

        return null;
    });
