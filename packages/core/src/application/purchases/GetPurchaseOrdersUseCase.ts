import { PurchaseOrder, PurchaseOrderStatus } from '../../domain/entities/PurchaseOrder';
import { IPurchaseOrderRepository } from '../../infrastructure/repositories/IPurchaseOrderRepository';

export class GetPurchaseOrdersUseCase {
  constructor(private readonly repository: IPurchaseOrderRepository) {}

  async execute(outletId: string, status?: PurchaseOrderStatus): Promise<PurchaseOrder[]> {
    if (status) {
      return this.repository.findByStatus(outletId, status);
    }
    return this.repository.findByOutletId(outletId);
  }
}
