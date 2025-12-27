import { CreatePurchaseOrderDTO, PurchaseOrder } from '../../domain/entities/PurchaseOrder';
import { IPurchaseOrderRepository } from '../../infrastructure/repositories/IPurchaseOrderRepository';

export class CreatePurchaseOrderUseCase {
  constructor(private readonly repository: IPurchaseOrderRepository) {}

  async execute(dto: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
    // validation logic could go here
    if (!dto.outletId) {
      throw new Error('Outlet ID is required');
    }
    if (!dto.supplier) {
      throw new Error('Supplier is required');
    }
    if (!dto.lines || dto.lines.length === 0) {
      throw new Error('Order must have at least one line');
    }

    return this.repository.create(dto);
  }
}
