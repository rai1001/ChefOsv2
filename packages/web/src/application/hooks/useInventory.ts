import { useState } from 'react';
import {
  AddBatchUseCase,
  ConsumeFIFOUseCase,
  CheckExpiryUseCase,
  AdjustStockUseCase,
  CreateBatchDTO,
  ConsumeFIFODTO,
  AdjustStockDTO,
  Batch,
  ExpiryCheckResult,
} from '@culinaryos/core';
import { container } from '../di/Container';
import { TOKENS } from '../di/tokens';

export function useInventory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Resolve Use Cases
  // Ideally useMemo or simple resolution. Transient services creates new instance each fetch.
  // Use Cases are stateless usually so it's fine, but reuse might be cheaper.
  // Container handles lifetime.

  const addBatchUseCase = container.get<AddBatchUseCase>(TOKENS.ADD_BATCH_USE_CASE);
  const consumeFIFOUseCase = container.get<ConsumeFIFOUseCase>(TOKENS.CONSUME_FIFO_USE_CASE);
  const checkExpiryUseCase = container.get<CheckExpiryUseCase>(TOKENS.CHECK_EXPIRY_USE_CASE);
  const adjustStockUseCase = container.get<AdjustStockUseCase>(TOKENS.ADJUST_STOCK_USE_CASE);

  const addBatch = async (dto: CreateBatchDTO): Promise<Batch> => {
    setLoading(true);
    try {
      return await addBatchUseCase.execute(dto);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const consumeFIFO = async (dto: ConsumeFIFODTO) => {
    setLoading(true);
    try {
      return await consumeFIFOUseCase.execute(dto);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkExpiry = async (outletId: string, daysAhead: number): Promise<ExpiryCheckResult[]> => {
    setLoading(true);
    try {
      return await checkExpiryUseCase.execute(outletId, daysAhead);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const adjustStock = async (dto: AdjustStockDTO): Promise<void> => {
    setLoading(true);
    try {
      return await adjustStockUseCase.execute(dto);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    addBatch,
    consumeFIFO,
    checkExpiry,
    adjustStock,
    loading,
    error,
  };
}
