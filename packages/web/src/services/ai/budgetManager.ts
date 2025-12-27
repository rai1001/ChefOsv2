import { db } from '@/config/firebase';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import type { AIFeature, BudgetCheckResult, BudgetConfig } from './types';

// Default limits
const DEFAULT_BUDGET: BudgetConfig = {
    monthly: { hardCap: 100, softCap: 80, currentSpend: 0, resetDate: null },
    daily: { hardCap: 10, softCap: 8, currentSpend: 0, resetDate: null },
    perFeature: {
        invoiceScanner: { dailyLimit: 100, currentCount: 0 },
        beoScanner: { dailyLimit: 50, currentCount: 0 },
        sportsMenuScanner: { dailyLimit: 30, currentCount: 0 },
        zeroWasteEngine: { dailyLimit: 20, currentCount: 0 },
        universalImporter: { dailyLimit: 50, currentCount: 0 },
        inventoryOptimization: { dailyLimit: 10, currentCount: 0 },
        purchaseSuggestion: { dailyLimit: 10, currentCount: 0 },
        wasteAnalysis: { dailyLimit: 10, currentCount: 0 },
        menuGenerator: { dailyLimit: 10, currentCount: 0 }
    },
    rateLimiting: {
        maxCallsPerMinute: 10,
        maxCallsPerHour: 200,
        windowStart: null
    }
};

export class BudgetExceededError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BudgetExceededError';
    }
}

export async function checkBudgetBeforeCall(outletId: string, feature: AIFeature, estimatedCost: number): Promise<BudgetCheckResult> {
    try {
        const docRef = doc(db, 'aiBudgets', outletId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return { allowed: true };
        }

        const data = docSnap.data() as BudgetConfig;

        // Check Monthly Hard Cap
        if ((data.monthly?.currentSpend || 0) + estimatedCost > (data.monthly?.hardCap || Infinity)) {
            throw new BudgetExceededError(`Monthly budget exceeded. Current: $${data.monthly.currentSpend.toFixed(2)}, Limit: $${data.monthly.hardCap}`);
        }

        // Check Daily Hard Cap
        if ((data.daily?.currentSpend || 0) + estimatedCost > (data.daily?.hardCap || Infinity)) {
            throw new BudgetExceededError(`Daily budget exceeded. Current: $${data.daily.currentSpend.toFixed(2)}, Limit: $${data.daily.hardCap}`);
        }

        // Check Feature Limit
        const featureRef = data.perFeature?.[feature];
        if (featureRef && featureRef.currentCount >= featureRef.dailyLimit) {
            throw new BudgetExceededError(`Daily limit for ${feature} exceeded (${featureRef.dailyLimit} calls)`);
        }

        return { allowed: true };
    } catch (error: any) {
        if (error instanceof BudgetExceededError) throw error;
        console.error("Budget check failed", error);
        return { allowed: true }; // Fail open for technical errors
    }
}

export async function updateUsageAfterCall(outletId: string, cost: number, feature: AIFeature): Promise<void> {
    const docRef = doc(db, 'aiBudgets', outletId);

    try {
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(docRef);

            if (!docSnap.exists()) {
                const newConfig = JSON.parse(JSON.stringify(DEFAULT_BUDGET));
                newConfig.monthly.currentSpend = cost;
                newConfig.daily.currentSpend = cost;
                if (newConfig.perFeature[feature]) {
                    newConfig.perFeature[feature].currentCount = 1;
                }
                newConfig.daily.resetDate = new Date();
                transaction.set(docRef, newConfig);
                return;
            }

            const data = docSnap.data() as BudgetConfig;

            const newMonthlySpend = (data.monthly?.currentSpend || 0) + cost;
            const newDailySpend = (data.daily?.currentSpend || 0) + cost;

            const featureLimits = data.perFeature || DEFAULT_BUDGET.perFeature;
            // Ensure feature exists in config
            const currentFeatureCount = (featureLimits[feature]?.currentCount || 0) + 1;

            transaction.update(docRef, {
                'monthly.currentSpend': newMonthlySpend,
                'daily.currentSpend': newDailySpend,
                [`perFeature.${feature}.currentCount`]: currentFeatureCount
            });
        });
    } catch (e) {
        console.error("Failed to update budget usage", e);
    }
}
