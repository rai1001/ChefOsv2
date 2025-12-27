import { PurchaseOrder, PurchaseOrderStatus } from '../../domain/entities/PurchaseOrder';
import { IPurchaseOrderRepository } from '../../infrastructure/repositories/IPurchaseOrderRepository';

export class UpdatePurchaseOrderUseCase {
  constructor(private readonly repository: IPurchaseOrderRepository) {}

  async execute(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new Error('Purchase order not found');
    }

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new Error('Can only update draft orders');
    }

    // In a real implementation we would map specific fields from valid DTO
    // For now, relying on repository to handle partial updates or we'd define a specific DTO
    // But since the interface says `updateStatus` and `create`, we might need a general update method in repo or just re-create.
    // The current IPurchaseOrderRepository definition does not have a general update method aside from updateStatus.
    // We should probably add one or assume for this iteration we can't fully update without it.
    // Let's assume we need to extend the repo interface or just fail for now?
    // Actually, looking at the plan: "Allow modifications only when in draft state".
    // I will assume for now we might need to add `update` to the repo interface.
    // But let's check the repo again.

    // Checked repo: has `create`, `approve`, `updateStatus`. No general `update`.
    // I will add `update` method to the repository interface in a separate step or just mock it here for now?
    // Better to do it right. I'll refrain from implementing this fully until I update the repo interface.
    // For now, I'll allow updating status back to draft if needed? No, that's regular workflow.

    // Let's implement what we can, which might be just nothing if repo doesn't support it.
    // Wait, the user plan says [NEW] UpdatePurchaseOrderUseCase.
    // I will assume I should add `update` to `IPurchaseOrderRepository`.

    return this.repository.update(id, updates);
  }
}
