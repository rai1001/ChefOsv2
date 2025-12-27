import { PurchaseOrderStatus } from '../../domain/entities/PurchaseOrder';
import { IPurchaseOrderRepository } from '../../infrastructure/repositories/IPurchaseOrderRepository';

export class CancelPurchaseOrderUseCase {
  constructor(private readonly repository: IPurchaseOrderRepository) {}

  async execute(id: string): Promise<void> {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new Error('Purchase order not found');
    }

    if (order.status === PurchaseOrderStatus.RECEIVED) {
      throw new Error('Cannot cancel received orders');
    }

    if (order.status === PurchaseOrderStatus.CANCELLED) {
      return; // Already cancelled
    }

    await this.repository.updateStatus(id, PurchaseOrderStatus.CANCELLED);
  }
}
