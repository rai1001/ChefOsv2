import { injectable } from 'inversify';
import { getCollection, setDocument, updateDocument } from '@/services/firestoreService';
import { PurchaseOrder } from '@culinaryos/core';

export interface IPurchasingRepository {
  getOrdersByOutlet(outletId: string): Promise<PurchaseOrder[]>;
  createOrder(order: PurchaseOrder): Promise<void>;
  updateOrder(id: string, order: Partial<PurchaseOrder>): Promise<void>;
}

@injectable()
export class FirebasePurchasingRepository implements IPurchasingRepository {
  private collectionName = 'purchaseOrders';

  async getOrdersByOutlet(outletId: string): Promise<PurchaseOrder[]> {
    const orders = await getCollection<any>(this.collectionName);
    return orders.filter((o) => o.outletId === outletId) as PurchaseOrder[];
  }

  async createOrder(order: PurchaseOrder): Promise<void> {
    await setDocument(this.collectionName, order.id, {
      ...order,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
      updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
      expectedDeliveryDate:
        order.expectedDeliveryDate instanceof Date
          ? order.expectedDeliveryDate.toISOString()
          : order.expectedDeliveryDate,
      actualDeliveryDate:
        order.actualDeliveryDate instanceof Date
          ? order.actualDeliveryDate.toISOString()
          : order.actualDeliveryDate,
      approvedAt:
        order.approvedAt instanceof Date ? order.approvedAt.toISOString() : order.approvedAt,
    } as any);
  }

  async updateOrder(id: string, order: Partial<PurchaseOrder>): Promise<void> {
    const updateData: any = { ...order, updatedAt: new Date().toISOString() };
    // Serialization of dates is handled by the caller or by setDocument if needed, but we ensure consistency here
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] instanceof Date) {
        updateData[key] = updateData[key].toISOString();
      }
    });
    await updateDocument(this.collectionName, id, updateData);
  }
}
