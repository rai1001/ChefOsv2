import { useState, useEffect, useCallback } from 'react';
import {
  Batch,
  IBatchRepository,
  CreateBatchDTO,
  ConsumeFIFODTO,
  AddBatchUseCase,
  ConsumeFIFOUseCase,
  CheckExpiryUseCase,
} from '@culinaryos/core';
import { container } from '../di/Container';
import { TOKENS } from '../di/tokens';

export function useBatches(ingredientId: string | undefined) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Resolve Dependencies
  // We resolve repository directly for queries, and UseCases for commands
  const batchRepository = container.get<IBatchRepository>(TOKENS.BATCH_REPOSITORY);
  const addBatchUseCase = container.get<AddBatchUseCase>(TOKENS.ADD_BATCH_USE_CASE);
  const consumeFIFOUseCase = container.get<ConsumeFIFOUseCase>(TOKENS.CONSUME_FIFO_USE_CASE);
  const checkExpiryUseCase = container.get<CheckExpiryUseCase>(TOKENS.CHECK_EXPIRY_USE_CASE);

  const fetchBatches = useCallback(async () => {
    if (!ingredientId) return;

    setLoading(true);
    setError(null);
    try {
      // Used for displaying the list of active batches
      const data = await batchRepository.findActiveBatchesFIFO(ingredientId);
      setBatches(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [ingredientId, batchRepository]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const addBatch = async (dto: CreateBatchDTO) => {
    try {
      setLoading(true);
      const result = await addBatchUseCase.execute(dto);
      // Refresh list after add
      await fetchBatches();
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const consumeBatch = async (dto: ConsumeFIFODTO) => {
    try {
      setLoading(true);
      const result = await consumeFIFOUseCase.execute(dto);
      // Refresh list after consumption
      await fetchBatches();
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // NOTE: checkExpiry is usually per outlet, not per ingredient?
  // But if we want to check for THIS ingredient?
  // The UseCase CheckExpiry takes outletId.
  // The User Request said "checkExpiry" in return.
  // Maybe checking for this specific ingredient expiring soon?
  // UseCase returns list of ingredients.
  // I'll expose generic checkExpiry or filter it?
  // I will expose generic but maybe filtered.
  // Actually, let's just expose the UseCase execution.

  const checkExpiry = async (outletId: string, daysAhead: number) => {
    // This might return other ingredients too.
    return await checkExpiryUseCase.execute(outletId, daysAhead);
  };

  return {
    batches,
    loading,
    error,
    addBatch,
    consumeBatch,
    checkExpiry,
    refresh: fetchBatches,
  };
}
