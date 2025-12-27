import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Trigger to update dashboard summary when inventory changes.
 * Listens to: outlets/{outletId}/inventory/{itemId}
 */
export const onInventoryUpdate = functions.firestore
    .document("outlets/{outletId}/inventory/{itemId}")
    .onWrite(async (change, context) => {
        const outletId = context.params.outletId;
        const summaryRef = db.doc(`outlets/${outletId}/summaries/dashboard`);

        const before = change.before.exists ? change.before.data() : null;
        const after = change.after.exists ? change.after.data() : null;

        let valueDelta = 0;
        let criticalDelta = 0;

        // Calculate Total Inventory Value Delta
        const beforeValue = before ? (before.stock || 0) * (before.costPerUnit || 0) : 0;
        const afterValue = after ? (after.stock || 0) * (after.costPerUnit || 0) : 0;
        valueDelta = afterValue - beforeValue;

        // Calculate Critical Stock Count Delta
        const isCriticalBefore = before ? (before.stock || 0) < (before.minStock || 0) : false;
        const isCriticalAfter = after ? (after.stock || 0) < (after.minStock || 0) : false;

        if (isCriticalBefore && !isCriticalAfter) {
            criticalDelta = -1;
        } else if (!isCriticalBefore && isCriticalAfter) {
            criticalDelta = 1;
        }

        if (valueDelta === 0 && criticalDelta === 0) {
            return null;
        }

        // Use FieldValue.increment for atomic updates
        await summaryRef.set({
            totalInventoryValue: admin.firestore.FieldValue.increment(valueDelta),
            criticalStockCount: admin.firestore.FieldValue.increment(criticalDelta),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return null;
    });
