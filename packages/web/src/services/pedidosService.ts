import { v4 as uuidv4 } from 'uuid';
import { firestoreService } from '@/services/firestoreService';
import { COLLECTIONS } from '@/config/collections';
import type { ReorderNeed } from './necesidadesService';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseStatus } from '@/types/purchases';
import type { Unit } from '@/types/inventory';

export const pedidosService = {
  groupNeedsBySupplier: (needs: ReorderNeed[]): Map<string, ReorderNeed[]> => {
    const grouped = new Map<string, ReorderNeed[]>();

    for (const need of needs) {
      const supplierId = need.supplierId || 'UNKNOWN_SUPPLIER';
      const list = grouped.get(supplierId) || [];
      list.push(need);
      grouped.set(supplierId, list);
    }

    return grouped;
  },

  createDraftOrderFromNeeds: async (
    supplierId: string,
    needs: ReorderNeed[],
    outletId: string
  ): Promise<PurchaseOrder> => {
    const orderId = uuidv4();
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `PED-${todayStr}-${orderId.slice(0, 4)}`.toUpperCase();

    const items: PurchaseOrderItem[] = needs.map((need) => ({
      ingredientId: need.ingredientId,
      quantity: need.orderQuantity,
      unit: need.unit as Unit,
      costPerUnit: need.costPerUnit || 0,
      tempDescription: need.ingredientName,
    }));

    // Calculate total cost using the item's unit/quantity.
    // Assuming costPerUnit matches the item.unit.
    const totalCost = items.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0);

    const order: PurchaseOrder = {
      id: orderId,
      orderNumber,
      supplierId,
      outletId,
      date: new Date().toISOString(),
      status: 'DRAFT',
      items,
      totalCost,
      type: 'AUTOMATIC',
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore
    await firestoreService.create<PurchaseOrder>(COLLECTIONS.PURCHASE_ORDERS, order);

    return order;
  },

  generateOrdersFromNeeds: async (
    allNeeds: ReorderNeed[],
    outletId: string
  ): Promise<PurchaseOrder[]> => {
    const grouped = pedidosService.groupNeedsBySupplier(allNeeds);
    const orders: PurchaseOrder[] = [];

    for (const [supplierId, needs] of grouped.entries()) {
      if (supplierId === 'UNKNOWN_SUPPLIER') {
        console.warn('Items with no supplier found:', needs);
        continue;
      }

      const order = await pedidosService.createDraftOrderFromNeeds(supplierId, needs, outletId);
      orders.push(order);
    }

    return orders;
  },

  getAll: async (outletId: string): Promise<PurchaseOrder[]> => {
    // Using simple getAll and filter because query constraints are tricky in adapter stub
    const all = await firestoreService.getAll<PurchaseOrder>(COLLECTIONS.PURCHASE_ORDERS);
    return all.filter((o) => o.outletId === outletId);
  },

  getOrdersByStatus: async (
    outletId: string,
    statuses: PurchaseStatus[]
  ): Promise<PurchaseOrder[]> => {
    const all = await firestoreService.getAll<PurchaseOrder>(COLLECTIONS.PURCHASE_ORDERS);
    return all.filter((o) => o.outletId === outletId && statuses.includes(o.status));
  },

  updateStatus: async (
    orderId: string,
    status: PurchaseStatus,
    userId?: string,
    extraData?: Partial<PurchaseOrder>
  ) => {
    // Need manual fetch update for array union logic
    const order = await firestoreService.getById<PurchaseOrder>(
      COLLECTIONS.PURCHASE_ORDERS,
      orderId
    );
    if (!order) throw new Error('Order not found');

    const updateData: Partial<PurchaseOrder> = {
      ...extraData,
      status,
      updatedAt: new Date().toISOString(),
      history: [
        ...(order.history || []),
        {
          date: new Date().toISOString(),
          status,
          userId: userId || 'system',
          notes: extraData?.notes || '',
        },
      ],
    };

    if (status === 'ORDERED') {
      updateData.sentAt = new Date().toISOString();
    }
    if (status === 'APPROVED' && userId) {
      updateData.approvedBy = userId;
    }
    await firestoreService.update(COLLECTIONS.PURCHASE_ORDERS, orderId, updateData);
  },

  createManualOrder: async (
    supplierId: string,
    items: PurchaseOrderItem[],
    outletId: string
  ): Promise<PurchaseOrder> => {
    const orderId = uuidv4();
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `MAN-${todayStr}-${orderId.slice(0, 4)}`.toUpperCase();

    // Recalculate cost with robustness
    const totalCost = items.reduce((sum, item) => sum + item.quantity * (item.costPerUnit || 0), 0);

    const order: PurchaseOrder = {
      id: orderId,
      orderNumber,
      supplierId,
      outletId,
      date: new Date().toISOString(),
      status: 'DRAFT',
      items,
      totalCost,
      type: 'MANUAL',
      updatedAt: new Date().toISOString(),
      history: [
        {
          date: new Date().toISOString(),
          status: 'DRAFT',
          userId: 'user',
          notes: 'Creado manualmente desde Dashboard',
        },
      ],
    };

    // Save to Firestore
    await firestoreService.create<PurchaseOrder>(COLLECTIONS.PURCHASE_ORDERS, order);

    return order;
  },
};
