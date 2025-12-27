import { useState, useCallback, useEffect } from 'react';
import { container } from '../di/Container';
import { TYPES } from '../di/types';
import { CalculateBCGMatrixUseCase } from '../use-cases/analytics/CalculateBCGMatrixUseCase';
import { MenuEngineeringResult } from '@/domain/entities/MenuEngineering';

export function useAnalytics() {
    const [data, setData] = useState<MenuEngineeringResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const calculateBCGUseCase = container.get<CalculateBCGMatrixUseCase>(TYPES.CalculateBCGMatrixUseCase);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const result = await calculateBCGUseCase.execute();
            setData(result);
            setError(null);
        } catch (err) {
            console.error("Error fetching analytics:", err);
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
