import { useState, useEffect, useMemo } from 'react';
import type { AIMetrics } from '@/services/ai/types';

export function useAIMetrics(outletId: string, daysLookback: number = 30) {
  // Placeholder state to satisfy return type
  const [metrics, setMetrics] = useState<AIMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // Stub implementation to remove Firebase
    setLoading(true);
    // In future: Use supabasePersistenceService to fetch metrics
    setMetrics([]);
    setLoading(false);
  }, []);

  const aggregatedData = useMemo(() => {
    const dailyUsage: Record<string, { date: string; calls: number; cost: number }> = {};
    const featureUsage: Record<string, { name: string; value: number }> = {};
    let totalCost = 0;
    let totalCalls = metrics.length;
    let successCount = 0;
    let totalLatency = 0;

    metrics.forEach((m) => {
      const date = m.timestamp?.split('T')[0] || 'unknown';
      if (!dailyUsage[date]) {
        dailyUsage[date] = { date, calls: 0, cost: 0 };
      }
      dailyUsage[date].calls += 1;
      dailyUsage[date].cost += m.estimatedCost || 0;

      const featureName = m.feature || 'unknown';
      if (!featureUsage[featureName]) {
        featureUsage[featureName] = { name: featureName, value: 0 };
      }
      featureUsage[featureName].value += 1;

      totalCost += m.estimatedCost || 0;
      if (m.success) successCount++;
      totalLatency += m.latencyMs || 0;
    });

    return {
      dailyUsage: Object.values(dailyUsage).sort((a, b) => a.date.localeCompare(b.date)),
      featureUsage: Object.values(featureUsage),
      stats: {
        totalCost,
        totalCalls,
        successRate: totalCalls > 0 ? (successCount / totalCalls) * 100 : 0,
        avgLatency: totalCalls > 0 ? totalLatency / totalCalls : 0,
      },
    };
  }, [metrics]);

  return { metrics, aggregatedData, loading, error };
}
