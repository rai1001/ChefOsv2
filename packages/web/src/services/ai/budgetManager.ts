import { db } from '@/config/firebase';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import type { AIFeature, BudgetCheckResult, BudgetConfig } from './types';

// Helper to check if a date is today
function isToday(date: any): boolean {
  if (!date) return false;
  const resetDate = date.toDate ? date.toDate() : new Date(date);
  const today = new Date();
  return (
    resetDate.getDate() === today.getDate() &&
    resetDate.getMonth() === today.getMonth() &&
    resetDate.getFullYear() === today.getFullYear()
  );
}

// Helper to check if a date is in the current month
function isThisMonth(date: any): boolean {
  if (!date) return false;
  const resetDate = date.toDate ? date.toDate() : new Date(date);
  const today = new Date();
  return (
    resetDate.getMonth() === today.getMonth() && resetDate.getFullYear() === today.getFullYear()
  );
}

const DEFAULT_BUDGET: BudgetConfig = {
  monthly: { hardCap: 100, softCap: 80, currentSpend: 0, resetDate: null },
  daily: { hardCap: 25, softCap: 20, currentSpend: 0, resetDate: null },
  perFeature: {
    invoiceScanner: { dailyLimit: 100, currentCount: 0 },
    beoScanner: { dailyLimit: 50, currentCount: 0 },
    sportsMenuScanner: { dailyLimit: 30, currentCount: 0 },
    zeroWasteEngine: { dailyLimit: 20, currentCount: 0 },
    universalImporter: { dailyLimit: 50, currentCount: 0 },
    inventoryOptimization: { dailyLimit: 10, currentCount: 0 },
    purchaseSuggestion: { dailyLimit: 10, currentCount: 0 },
    wasteAnalysis: { dailyLimit: 10, currentCount: 0 },
    inventoryScanner: { dailyLimit: 50, currentCount: 0 },
    haccpScanner: { dailyLimit: 50, currentCount: 0 },
    ocrScanner: { dailyLimit: 100, currentCount: 0 },
    menuGenerator: { dailyLimit: 10, currentCount: 0 },
  },
  rateLimiting: {
    maxCallsPerMinute: 10,
    maxCallsPerHour: 200,
    windowStart: null,
  },
};

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

export async function checkBudgetBeforeCall(
  outletId: string,
  feature: AIFeature,
  estimatedCost: number
): Promise<BudgetCheckResult> {
  try {
    const docRef = doc(db, 'aiBudgets', outletId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { allowed: true };
    }

    const data = docSnap.data() as BudgetConfig;

    // Daily Reset Check
    const needsDailyReset = !isToday(data.daily?.resetDate);
    const dailySpend = needsDailyReset ? 0 : data.daily?.currentSpend || 0;

    // Monthly Reset Check
    const needsMonthlyReset = !isThisMonth(data.monthly?.resetDate);
    const monthlySpend = needsMonthlyReset ? 0 : data.monthly?.currentSpend || 0;

    // Check Monthly Hard Cap
    if (monthlySpend + estimatedCost > (data.monthly?.hardCap || Infinity)) {
      throw new BudgetExceededError(
        `Monthly budget exceeded. Current: $${monthlySpend.toFixed(2)}, Limit: $${data.monthly.hardCap}`
      );
    }

    // Check Daily Hard Cap
    if (dailySpend + estimatedCost > (data.daily?.hardCap || Infinity)) {
      throw new BudgetExceededError(
        `Daily budget exceeded. Current: $${dailySpend.toFixed(2)}, Limit: $${data.daily.hardCap}`
      );
    }

    // Check Feature Limit
    const featureRef = data.perFeature?.[feature];
    if (featureRef) {
      const currentCount = needsDailyReset ? 0 : featureRef.currentCount;
      if (currentCount >= featureRef.dailyLimit) {
        throw new BudgetExceededError(
          `Daily limit for ${feature} exceeded (${featureRef.dailyLimit} calls)`
        );
      }
    }

    return { allowed: true };
  } catch (error: any) {
    if (error instanceof BudgetExceededError) throw error;
    console.error('Budget check failed', error);
    return { allowed: true }; // Fail open for technical errors
  }
}

export async function updateUsageAfterCall(
  outletId: string,
  cost: number,
  feature: AIFeature
): Promise<void> {
  const docRef = doc(db, 'aiBudgets', outletId);

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      const now = new Date();

      if (!docSnap.exists()) {
        const newConfig = JSON.parse(JSON.stringify(DEFAULT_BUDGET));
        newConfig.monthly.currentSpend = cost;
        newConfig.monthly.resetDate = now;
        newConfig.daily.currentSpend = cost;
        newConfig.daily.resetDate = now;
        if (newConfig.perFeature[feature]) {
          newConfig.perFeature[feature].currentCount = 1;
        }
        transaction.set(docRef, newConfig);
        return;
      }

      const data = docSnap.data() as BudgetConfig;

      // Identify which resets are needed
      const needsDailyReset = !isToday(data.daily?.resetDate);
      const needsMonthlyReset = !isThisMonth(data.monthly?.resetDate);

      // Full reset of per-feature counts if daily reset is needed
      let perFeatureUpdates = { ...(data.perFeature || DEFAULT_BUDGET.perFeature) };
      if (needsDailyReset) {
        // Create a clean copy with all counts at 0
        const resetPerFeature: any = {};
        Object.keys(DEFAULT_BUDGET.perFeature).forEach((k) => {
          resetPerFeature[k] = {
            ...DEFAULT_BUDGET.perFeature[k as AIFeature],
            currentCount: 0,
          };
        });
        perFeatureUpdates = resetPerFeature;
      }

      // Calculate new values based on whether they were reset
      const dailySpend = needsDailyReset ? 0 : data.daily?.currentSpend || 0;
      const monthlySpend = needsMonthlyReset ? 0 : data.monthly?.currentSpend || 0;

      const newMonthlySpend = monthlySpend + cost;
      const newDailySpend = dailySpend + cost;

      // Update specifically the current feature
      if (!perFeatureUpdates[feature]) {
        perFeatureUpdates[feature] = { dailyLimit: 50, currentCount: 0 };
      }
      perFeatureUpdates[feature].currentCount =
        (needsDailyReset ? 0 : perFeatureUpdates[feature].currentCount || 0) + 1;

      // Prepare final update object
      const updateData: any = {
        'monthly.currentSpend': newMonthlySpend,
        'daily.currentSpend': newDailySpend,
        perFeature: perFeatureUpdates,
      };

      if (needsDailyReset) {
        updateData['daily.resetDate'] = now;
      }
      if (needsMonthlyReset) {
        updateData['monthly.resetDate'] = now;
      }

      transaction.update(docRef, updateData);
    });
  } catch (e) {
    console.error('[Budget Manager] CRITICAL: Failed to update budget usage', e);
  }
}
