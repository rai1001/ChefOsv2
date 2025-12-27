import { db } from '@/config/firebase';
import { collection, addDoc } from 'firebase/firestore';

export interface CostRecord {
    timestamp: number;
    tokens: {
        prompt: number;
        completion: number;
        total: number;
    };
    estimatedCost: number;
    user?: string;
    outletId?: string;
    feature?: string;
}

const COST_PER_1K_TOKENS = 0.000125; // Example for Gemini 2.0 Flash (adjust per current pricing)

export class CostTracker {
    private static STORAGE_KEY = 'culinaryos_ai_costs';

    static logUsage(usage: { promptTokens: number; completionTokens: number; totalTokens: number }, context: { user?: string; outletId?: string; feature?: string }): void {
        const estimatedCost = (usage.totalTokens / 1000) * COST_PER_1K_TOKENS;

        const record: CostRecord = {
            timestamp: Date.now(),
            tokens: {
                prompt: usage.promptTokens,
                completion: usage.completionTokens,
                total: usage.totalTokens,
            },
            estimatedCost,
            ...context
        };

        console.log(`[CostTracker] AI Usage: ${usage.totalTokens} tokens, Est. Cost: $${estimatedCost.toFixed(6)}`);

        // Save to Firestore for the dashboard
        try {
            // Local fallback
            const records = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
            records.push(record);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));

            // Firestore sync (fire and forget)
            if (context.outletId) {
                addDoc(collection(db, 'aiUsageMetrics'), {
                    ...record,
                    // Use server timestamp or keep client timestamp? Client is fine for now.
                    timestamp: record.timestamp
                }).catch(err => console.error("Firestore log error:", err));
            }
        } catch (e) {
            console.error("Failed to save cost record:", e);
        }
    }

    static getHistory(): CostRecord[] {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    }

    static getTotalCost(): number {
        return this.getHistory().reduce((sum, r) => sum + r.estimatedCost, 0);
    }
}
