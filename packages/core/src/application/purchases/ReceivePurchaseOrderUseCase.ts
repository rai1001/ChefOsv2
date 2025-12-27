import { ReceivePurchaseOrderDTO, PurchaseOrderStatus } from '../../domain/entities/PurchaseOrder';
import { IPurchaseOrderRepository } from '../../infrastructure/repositories/IPurchaseOrderRepository';
import { ProcessStockMovementUseCase } from '../inventory/ProcessStockMovementUseCase';
// import { Quantity } from '../../domain/value-objects/Quantity';

export class ReceivePurchaseOrderUseCase {
  constructor(
    private readonly repository: IPurchaseOrderRepository,
    private readonly processStockMovementUseCase: ProcessStockMovementUseCase
  ) {}

  async execute(dto: ReceivePurchaseOrderDTO): Promise<void> {
    const order = await this.repository.findById(dto.orderId);
    if (!order) {
      throw new Error('Purchase order not found');
    }

    if (
      order.status !== PurchaseOrderStatus.APPROVED &&
      order.status !== PurchaseOrderStatus.SENT
    ) {
      throw new Error(`Cannot receive order in status ${order.status}`);
    }

    // Process stock movements for each line
    for (const line of order.lines) {
      await this.processStockMovementUseCase.execute({
        ingredientId: line.ingredientId,
        outletId: order.outletId,
        quantity: line.quantity,
        type: 'PURCHASE',
        performedBy: dto.receivedBy,
        unitCost: line.unitCost, // Assuming unitCost is available and correct
        referenceId: order.orderNumber || order.id,
        reason: `Purchase Order ${order.orderNumber || order.id}`,
      });
    }

    // Update order status
    await this.repository.updateStatus(order.id, PurchaseOrderStatus.RECEIVED);

    // TODO: Ideally we should store receivedDate and receivedBy in the order as well
    // using the generic update method if available or specific fields in updateStatus implementation
  }
}
