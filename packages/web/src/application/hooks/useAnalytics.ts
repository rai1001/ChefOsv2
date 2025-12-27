import { useState, useCallback, useEffect } from 'react';
import { container } from '../di/Container';
import { TYPES } from '../di/types';
import { CalculateBCGMatrixUseCase } from '@culinaryos/core';
import { MenuEngineeringResult } from '@/domain/entities/MenuEngineering';

export function useAnalytics() {
  const [data, setData] = useState<MenuEngineeringResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const calculateBCGUseCase = container.get<CalculateBCGMatrixUseCase>(
    TYPES.CalculateBCGMatrixUseCase
  );

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const result = await calculateBCGUseCase.execute();

      // Map Core result (Money) to Web result (number)
      const webResult: MenuEngineeringResult = {
        statistics: result.statistics.map((s) => ({
          id: s.id,
          name: s.name,
          margin: s.margin.amount,
          sales: s.sales,
          type: s.type,
          contribution: s.contribution.amount,
        })),
        averages: {
          margin: result.averages.margin.amount,
          popularity: result.averages.popularity,
        },
        totals: {
          contribution: result.totals.contribution.amount,
          volume: result.totals.volume,
        },
      };

      setData(webResult);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [calculateBCGUseCase]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, loading, error, refresh: fetchAnalytics };
}
