import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

export const onBudgetUpdate = onDocumentUpdated('aiBudgets/{outletId}', async (event) => {
    const change = event.data;
    if (!change) return;

    const after = change.after.data();
    const before = change.before.data();
    const outletId = event.params.outletId;

    if (!after || !before) return;

    const currentSpend = after.monthly?.currentSpend || 0;
    const hardCap = after.monthly?.hardCap || 100;

    const previousSpend = before.monthly?.currentSpend || 0;

    // Calculate thresholds crossed
    const percent = (currentSpend / hardCap) * 100;
    const prevPercent = (previousSpend / hardCap) * 100;

    const alerts = [];

    // Check 100% Hard Cap
    if (percent >= 100 && prevPercent < 100) {
        alerts.push({
            level: 'CRITICAL',
            message: `CRÍTICO: Presupuesto de IA agotado ($${currentSpend.toFixed(2)}).`
        });
    }
    // Check 80% Soft Cap
    else if (percent >= 80 && prevPercent < 80) {
        alerts.push({
            level: 'WARNING',
            message: `ALERTA: 80% del presupuesto consumido ($${currentSpend.toFixed(2)}).`
        });
    }
    // Check 50%
    else if (percent >= 50 && prevPercent < 50) {
        alerts.push({
            level: 'INFO',
            message: `Info: 50% del presupuesto de IA consumido.`
        });
    }

    if (alerts.length === 0) return;

    const batch = db.batch();

    for (const alert of alerts) {
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
            outletId,
            title: 'Alerta de Presupuesto IA',
            message: alert.message,
            type: 'SYSTEM',
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            metadata: { level: alert.level, currentSpend, hardCap }
        });
        console.log(`[Budget Alert] ${outletId}: ${alert.message}`);
    }

    await batch.commit();
});
