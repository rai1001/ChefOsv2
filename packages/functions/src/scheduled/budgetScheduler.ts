import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const resetDailyBudgets = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'Europe/Madrid',
    region: 'europe-west1',
  },
  async (_event) => {
    // Fetch all budgets
    const snapshot = await db.collection('aiBudgets').get();

    if (snapshot.empty) return;

    // Batch processing (limit 500)
    const batch = db.batch();
    let count = 0;

    const currentDay = new Date().getDate(); // 1-31

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const resetData: Record<string, any> = {
        'daily.currentSpend': 0,
        'daily.resetDate': admin.firestore.FieldValue.serverTimestamp(),
      };

      // Reset Feature Counters
      if (data.perFeature) {
        Object.keys(data.perFeature).forEach((key) => {
          resetData[`perFeature.${key}.currentCount`] = 0;
        });
      }

      // Monthly Reset (if 1st of month)
      if (currentDay === 1) {
        resetData['monthly.currentSpend'] = 0;
        resetData['monthly.resetDate'] = admin.firestore.FieldValue.serverTimestamp();
      }

      batch.update(doc.ref, resetData);
      count++;
    });

    await batch.commit();
    console.log(`Reset daily budgets for ${count} outlets.`);
  }
);

export const sendWeeklyBudgetReport = onSchedule(
  {
    schedule: '0 9 * * 1',
    timeZone: 'Europe/Madrid',
    region: 'europe-west1',
  },
  async (_event) => {
    console.log('Weekly budget report generation started.');
    // Implementation would involve:
    // 1. Fetching all outlets
    // 2. Aggregating metrics for last 7 days
    // 3. Sending email (requires SendGrid or similar)
    // Leaving placeholder as per current scope.
  }
);
