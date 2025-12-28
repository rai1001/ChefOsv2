import { useState, useCallback } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { CorePurchaseOrderRepositoryAdapter } from '@/infrastructure/repositories/CorePurchaseOrderRepositoryAdapter';
import {
  CreatePurchaseOrderUseCase,
  GetPurchaseOrdersUseCase,
  UpdatePurchaseOrderUseCase,
  ApprovePurchaseOrderUseCase,
  CancelPurchaseOrderUseCase,
  PurchaseOrder,
  CreatePurchaseOrderDTO,
  ApprovePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
} from '@culinaryos/core';
// Assuming DI container or simple instantiation. For now, manual instantiation if container isn't fully set up for web-core bridge.
// But wait, the adapter needs access to firebase.

export const usePurchases = () => {
  const { activeOutletId } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  // Lazy initialization of repo and use cases could be better, but for now:
  const repository = new CorePurchaseOrderRepositoryAdapter();

  // We need ProcessStockMovementUseCase for ReceivePurchaseOrderUseCase.
  // Ideally this comes from DI. For now, let's assume we might need a StockMovementAdapter or similar if it's hitting Core Logic.
  // If ReceivePurchaseOrderUseCase requires it in constructor:
  // const receiveUseCase = new ReceivePurchaseOrderUseCase(repository, stockMovementUseCase);

  // WAIT: ReceivePurchaseOrderUseCase in Core DOES depend on ProcessStockMovementUseCase.
  // I need to instantiate that too. And that needs a Stock repository.
  // This highlights the need for the DI container or proper factory.
  // For this step, I'll focus on the simple CRUD use cases first and mock/stub the complex one or implement the dependency.

  const fetchOrders = useCallback(async () => {
    if (!activeOutletId) return;
    setLoading(true);
    try {
      const useCase = new GetPurchaseOrdersUseCase(repository);
      const result = await useCase.execute(activeOutletId);
      setOrders(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeOutletId]);

  const createOrder = useCallback(
    async (dto: CreatePurchaseOrderDTO) => {
      setLoading(true);
      try {
        const useCase = new CreatePurchaseOrderUseCase(repository);
        await useCase.execute(dto);
        await fetchOrders();
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchOrders]
  );

  const updateOrder = useCallback(
    async (id: string, dto: UpdatePurchaseOrderDTO) => {
      setLoading(true);
      try {
        // In core, update use case expects (id, dto)
        const useCase = new UpdatePurchaseOrderUseCase(repository);
        await useCase.execute(id, dto);
        await fetchOrders();
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchOrders]
  );

  const approveOrder = useCallback(
    async (dto: ApprovePurchaseOrderDTO) => {
      setLoading(true);
      try {
        const useCase = new ApprovePurchaseOrderUseCase(repository);
        await useCase.execute(dto);
        await fetchOrders();
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchOrders]
  );

  const cancelOrder = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const useCase = new CancelPurchaseOrderUseCase(repository);
        await useCase.execute(id);
        await fetchOrders();
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchOrders]
  );

  return {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrder,
    approveOrder,
    cancelOrder,
    // receiveOrder - Deferred until Stock Dependency resolved
  };
};
