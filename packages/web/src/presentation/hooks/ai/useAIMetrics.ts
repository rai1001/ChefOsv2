import { useState, useEffect, useMemo } from 'react';
import { db } from '@/config/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import type { AIMetrics } from '@/services/ai/types';

export function useAIMetrics(outletId: string, daysLookback: number = 30) {
  const [metrics, setMetrics] = useState<AIMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!outletId) return;

    setLoading(true);
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - daysLookback);

    const q = query(
      collection(db, 'aiUsageMetrics'),
      where('outletId', '==', outletId),
      where('timestamp', '>=', Timestamp.fromDate(lookbackDate)),
      orderBy('timestamp', 'desc'),
      limit(1000)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: AIMetrics[] = [];
        snapshot.forEach((doc) => {
          const metric = doc.data();
          data.push({
            ...metric,
            timestamp:
              metric.timestamp instanceof Timestamp
                ? metric.timestamp.toDate().toISOString()
                : metric.timestamp,
          } as AIMetrics);
        });
        setMetrics(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useAIMetrics] Error fetching metrics:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [outletId, daysLookback]);

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
