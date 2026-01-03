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
  provider?: string;
}

/**
 * @deprecated Use geminiMetrics.ts for consistent cost tracking.
 * This class uses hardcoded pricing and performs duplicate logging.
 */
// Pricing for Gemini 2.0 Flash: $0.10/1M input, $0.40/1M output
const COST_PER_1K_INPUT_TOKENS = 0.0001;
const COST_PER_1K_OUTPUT_TOKENS = 0.0004;

export class CostTracker {
  private static STORAGE_KEY = 'culinaryos_ai_costs';

  static logUsage(
    usage: { promptTokens: number; completionTokens: number; totalTokens: number },
    context: { user?: string; outletId?: string; feature?: string; provider?: string }
  ): void {
    const isOpenAI = context.provider === 'openai';
    const inputRate = isOpenAI ? 0.005 : COST_PER_1K_INPUT_TOKENS; // OpenAI GPT-4o estimate
    const outputRate = isOpenAI ? 0.015 : COST_PER_1K_OUTPUT_TOKENS;

    const inputCost = (usage.promptTokens / 1000) * inputRate;
    const outputCost = (usage.completionTokens / 1000) * outputRate;
    const estimatedCost = inputCost + outputCost;

    const record: CostRecord = {
      timestamp: Date.now(),
      tokens: {
        prompt: usage.promptTokens,
        completion: usage.completionTokens,
        total: usage.totalTokens,
      },
      estimatedCost,
      ...context,
    };

    console.log(
      `[CostTracker] AI Usage: ${usage.totalTokens} tokens, Est. Cost: $${estimatedCost.toFixed(6)}`
    );

    // Save to Firestore for the dashboard
    try {
      // Local fallback
      const records = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      records.push(record);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));

      // Firestore sync (fire and forget)
      if (context.outletId) {
        // Using direct supabase client import or service to avoid circular deps if any,
        // but persistence service is safe.
        import('@/services/supabasePersistenceService').then(({ supabasePersistenceService }) => {
          supabasePersistenceService
            .create('aiUsageMetrics', {
              ...record,
              timestamp: record.timestamp,
            })
            .catch((err) => console.error('Supabase log error:', err));
        });
      }
    } catch (e) {
      console.error('Failed to save cost record:', e);
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
