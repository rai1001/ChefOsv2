/**
 * Purchasing Service
 *
 * Consolidated service combining:
 * - purchasingService.ts (purchase order creation)
 * - pedidosService.ts (order management)
 * - reorderService.ts (reorder notifications)
 * - supplierSelectionService.ts (supplier selection logic)
 *
 * Part of Application Layer (business logic)
 * Total: ~450 lines consolidated into one service
 */

import { v4 as uuidv4 } from 'uuid';
import { firestoreService } from '@/services/firestoreService';
import { COLLECTIONS } from '@/config/collections';
import type { ReorderNeed } from './InventoryAnalyticsService';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseStatus } from '@/types/purchases';
import type { Ingredient } from '@/types';
import { collection, where, arrayUnion } from 'firebase/firestore';
import type { CollectionReference, UpdateData } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Unit } from '@/types/inventory';

// ==================== TYPES ====================

export interface SupplierSelectionWeights {
  price: number;
  quality: number;
  reliability: number;
  leadTime: number;
}

// ==================== SERVICE ====================

export const PurchasingService = {
  // ========== ORDER MANAGEMENT ==========

  /**
   * Group reorder needs by supplier
   */
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

  /**
   * Create draft purchase order from reorder needs
   */
  createDraftOrderFromNeeds: async (
    supplierId: string,
    needs: ReorderNeed[],
    outletId: string
  ): Promise<PurchaseOrder> => {
    const orderId = uuidv4();
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `PED-${todayStr}-${orderId.slice(0, 4)}`.toUpperCase();

    const items: PurchaseOrderItem[] = needs.map((n) => ({
      ingredientId: n.ingredientId,
      quantity: n.orderQuantity,
      unit: n.unit as Unit,
      costPerUnit: n.costPerUnit,
      tempDescription: n.ingredientName,
    }));

    const totalCost = items.reduce((sum, i) => sum + i.quantity * i.costPerUnit, 0);

    const order: PurchaseOrder = {
      id: orderId,
      orderNumber,
      supplierId,
      outletId,
      items,
      status: 'DRAFT' as PurchaseStatus,
      totalCost,
      date: new Date().toISOString(),
      type: 'AUTOMATIC',
      updatedAt: new Date().toISOString(),
      notes: 'Auto-generated from reorder needs',
    };

    return order;
  },

  /**
   * Save purchase order to database
   */
  savePurchaseOrder: async (order: PurchaseOrder): Promise<void> => {
    await firestoreService.create<PurchaseOrder>(
      collection(db, COLLECTIONS.PURCHASE_ORDERS) as CollectionReference<PurchaseOrder>,
      order
    );
  },

  /**
   * Create manual purchase order
   */
  createManualOrder: async (
    supplierId: string,
    items: PurchaseOrderItem[],
    outletId: string
  ): Promise<PurchaseOrder> => {
    const orderId = uuidv4();
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `MAN-${todayStr}-${orderId.slice(0, 4)}`.toUpperCase();

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

    await firestoreService.create<PurchaseOrder>(
      collection(db, COLLECTIONS.PURCHASE_ORDERS) as CollectionReference<PurchaseOrder>,
      order
    );

    return order;
  },

  /**
   * Update purchase order status (legacy - more complete version)
   */
  updateStatus: async (
    orderId: string,
    status: PurchaseStatus,
    userId?: string,
    extraData?: Partial<PurchaseOrder>
  ): Promise<void> => {
    const updateData: UpdateData<PurchaseOrder> = {
      ...extraData,
      status,
      updatedAt: new Date().toISOString(),
      history: arrayUnion({
        date: new Date().toISOString(),
        status,
        userId: userId || 'system',
        notes: extraData?.notes || '',
      }),
    };

    if (status === 'ORDERED') {
      updateData.sentAt = new Date().toISOString();
    }
    if (status === 'APPROVED' && userId) {
      updateData.approvedBy = userId;
    }

    await firestoreService.update(COLLECTIONS.PURCHASE_ORDERS, orderId, updateData);
  },

  /**
   * Update purchase order status (simple version)
   */
  updateOrderStatus: async (
    orderId: string,
    status: PurchaseStatus,
    notes?: string
  ): Promise<void> => {
    const updates: UpdateData<PurchaseOrder> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (notes) {
      updates.notes = notes;
    }

    await firestoreService.update(COLLECTIONS.PURCHASE_ORDERS, orderId, updates);
  },

  /**
   * Get all purchase orders for an outlet
   */
  getAll: async (outletId: string): Promise<PurchaseOrder[]> => {
    const q = collection(db, COLLECTIONS.PURCHASE_ORDERS);
    const orders = await firestoreService.query<PurchaseOrder>(
      q as CollectionReference,
      where('outletId', '==', outletId)
    );
    return orders;
  },

  /**
   * Get purchase orders by status (alias for backwards compatibility)
   */
  getPurchaseOrders: async (outletId: string): Promise<PurchaseOrder[]> => {
    return PurchasingService.getAll(outletId);
  },

  /**
   * Get purchase orders filtered by status
   */
  getOrdersByStatus: async (
    outletId: string,
    statuses: PurchaseStatus[]
  ): Promise<PurchaseOrder[]> => {
    const q = collection(db, COLLECTIONS.PURCHASE_ORDERS);
    const orders = await firestoreService.query<PurchaseOrder>(
      q as CollectionReference,
      where('outletId', '==', outletId),
      where('status', 'in', statuses)
    );
    return orders;
  },

  /**
   * Generate purchase orders from reorder needs (batch creation)
   */
  generateOrdersFromNeeds: async (
    allNeeds: ReorderNeed[],
    outletId: string
  ): Promise<PurchaseOrder[]> => {
    const grouped = PurchasingService.groupNeedsBySupplier(allNeeds);
    const orders: PurchaseOrder[] = [];

    for (const [supplierId, needs] of grouped.entries()) {
      if (supplierId === 'UNKNOWN_SUPPLIER') {
        console.warn('Items with no supplier found:', needs);
        continue;
      }

      const order = await PurchasingService.createDraftOrderFromNeeds(supplierId, needs, outletId);
      orders.push(order);
    }

    return orders;
  },

  /**
   * Approve and send purchase order
   */
  approvePurchaseOrder: async (orderId: string, approvedBy: string): Promise<void> => {
    await PurchasingService.updateStatus(orderId, 'APPROVED', approvedBy);

    const order = await firestoreService.getById<PurchaseOrder>(
      COLLECTIONS.PURCHASE_ORDERS,
      orderId
    );

    if (order?.supplierId) {
      // Update supplier's order history
      await firestoreService.update(COLLECTIONS.SUPPLIERS, order.supplierId, {
        orderIds: arrayUnion(orderId),
      });
    }
  },

  // ========== SUPPLIER SELECTION ==========

  /**
   * Get supplier configuration for an ingredient
   * Note: Placeholder implementation - returns null for now
   */
  getIngredientSuppliers: async (_ingredientId: string): Promise<any | null> => {
    // In production this would fetch from Firestore
    // For now returns null (mock implementation)
    return null;
  },

  /**
   * Save supplier configuration for an ingredient
   * Note: Placeholder implementation
   */
  saveIngredientSuppliers: async (_config: any): Promise<void> => {
    // To be implemented when supplier config feature is ready
    console.warn('saveIngredientSuppliers not yet implemented');
  },

  /**
   * Select optimal supplier based on weighted criteria
   * Note: Placeholder implementation - returns null for now
   */
  selectOptimalSupplier: async (
    _ingredientId: string,
    _quantityNeeded: number,
    _urgency: 'normal' | 'urgent' = 'normal'
  ): Promise<any | null> => {
    // To be implemented when supplier selection feature is ready
    return null;
  },

  // ========== REORDER NOTIFICATIONS ==========

  /**
   * Check if ingredient needs reorder and create notification
   * Note: This is a placeholder - actual notification logic should be implemented in the UI layer
   */
  checkAndNotify: (_ingredients: Ingredient[], _ingredientId: string): void => {
    // To be implemented: notification logic
    console.warn('checkAndNotify not yet fully implemented');
  },

  // ========== AUTO-PURCHASE WORKFLOW ==========

  /**
   * Complete auto-purchase workflow:
   * 1. Group needs by supplier
   * 2. Create draft orders
   * 3. Optionally auto-approve if configured
   */
  executeAutoPurchase: async (
    needs: ReorderNeed[],
    outletId: string,
    autoApprove: boolean = false
  ): Promise<PurchaseOrder[]> => {
    const grouped = PurchasingService.groupNeedsBySupplier(needs);
    const createdOrders: PurchaseOrder[] = [];

    for (const [supplierId, supplierNeeds] of grouped) {
      if (supplierId === 'UNKNOWN_SUPPLIER') continue; // Skip items without supplier

      const order = await PurchasingService.createDraftOrderFromNeeds(
        supplierId,
        supplierNeeds,
        outletId
      );

      await PurchasingService.savePurchaseOrder(order);
      createdOrders.push(order);

      // Auto-approve if enabled
      if (autoApprove) {
        await PurchasingService.approvePurchaseOrder(order.id, 'SYSTEM');
      }
    }

    return createdOrders;
  },
};
