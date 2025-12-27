import {
  ApprovePurchaseOrderDTO,
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../../domain/entities/PurchaseOrder';
import { IPurchaseOrderRepository } from '../../infrastructure/repositories/IPurchaseOrderRepository';

export class ApprovePurchaseOrderUseCase {
  constructor(private readonly repository: IPurchaseOrderRepository) {}

  async execute(dto: ApprovePurchaseOrderDTO): Promise<PurchaseOrder> {
    const order = await this.repository.findById(dto.orderId);
    if (!order) {
      throw new Error('Purchase order not found');
    }

    if (
      order.status !== PurchaseOrderStatus.DRAFT &&
      order.status !== PurchaseOrderStatus.PENDING_APPROVAL
    ) {
      throw new Error(`Cannot approve order in status ${order.status}`);
    }

    return this.repository.approve(dto);
  }
}
