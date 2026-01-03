// import { db } from '@/config/firebase';
// import { doc, getDoc, runTransaction } from 'firebase/firestore';
import type { AIFeature, BudgetCheckResult, BudgetConfig } from './types';

// ... (helpers can be removed or kept if needed, but unused if stubbed)

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
  // Stubbed: Budget check bypassed
  return { allowed: true };
}

export async function updateUsageAfterCall(
  outletId: string,
  cost: number,
  feature: AIFeature
): Promise<void> {
  // Stubbed: Usage update disabled
  // console.log('[Budget Manager] Update stubbed', { outletId, cost, feature });
}
