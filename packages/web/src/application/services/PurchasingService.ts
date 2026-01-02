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
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseStatus,
  AppState,
  AppNotification,
  Ingredient,
  IngredientSupplierConfig,
  SupplierOption
} from '@/types';
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
    const items: PurchaseOrderItem[] = needs.map((n) => ({
      ingredientId: n.ingredientId,
      ingredientName: n.ingredientName,
      quantityOrdered: n.orderQuantity,
      unit: n.unit as Unit,
      pricePerUnit: n.costPerUnit,
      totalPrice: n.orderQuantity * n.costPerUnit,
    }));

    const total = items.reduce((sum, i) => sum + i.totalPrice, 0);

    const order: PurchaseOrder = {
      id: uuidv4(),
      supplierId,
      outletId,
      items,
      status: 'DRAFT' as PurchaseStatus,
      totalAmount: total,
      createdAt: new Date().toISOString(),
      notes: 'Auto-generated from reorder needs',
    };

    return order;
  },

  /**
   * Save purchase order to database
   */
  savePurchaseOrder: async (order: PurchaseOrder): Promise<void> => {
    await firestoreService.set(COLLECTIONS.PURCHASE_ORDERS, order.id, order);
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

    if (status === 'APPROVED') {
      updates.approvedAt = new Date().toISOString();
    }

    if (status === 'RECEIVED') {
      updates.receivedAt = new Date().toISOString();
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
    await PurchasingService.updateOrderStatus(orderId, 'APPROVED');

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
   */
  getIngredientSuppliers: async (
    ingredientId: string
  ): Promise<IngredientSupplierConfig | null> => {
    // In production this would fetch from Firestore
    // For now returns null (mock implementation)
    return null;
  },

  /**
   * Save supplier configuration for an ingredient
   */
  saveIngredientSuppliers: async (config: IngredientSupplierConfig): Promise<void> => {
    await firestoreService.set(
      COLLECTIONS.INGREDIENT_SUPPLIERS,
      config.ingredientId,
      config
    );
  },

  /**
   * Select optimal supplier based on weighted criteria
   * Uses scoring algorithm: price, quality, reliability, lead time
   */
  selectOptimalSupplier: async (
    ingredientId: string,
    quantityNeeded: number,
    urgency: 'normal' | 'urgent' = 'normal'
  ): Promise<SupplierOption | null> => {
    const config = await PurchasingService.getIngredientSuppliers(ingredientId);
    if (!config) return null;

    const available = config.suppliers.filter((s) => s.isActive);
    if (available.length === 0) return null;

    // Normalize helper (0-100 scale)
    const normalize = (val: number, min: number, max: number) => {
      if (max === min) return 100;
      return ((val - min) / (max - min)) * 100;
    };

    // Calculate ranges for normalization
    const prices = available.map((s) => s.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const leadTimes = available.map((s) => s.leadTimeDays);
    const minLead = Math.min(...leadTimes);
    const maxLead = Math.max(...leadTimes);

    // Calculate weighted scores
    const scored = available.map((supplier) => {
      const weights = config.selectionCriteria.weights;

      // Price: Lower is better (min price = 100 score)
      const priceScore =
        maxPrice === minPrice ? 100 : 100 - normalize(supplier.price, minPrice, maxPrice);

      // Lead Time: Lower is better
      const leadTimeScore =
        maxLead === minLead
          ? 100
          : 100 - normalize(supplier.leadTimeDays, minLead, maxLead);

      // Quality: 1-5 to 0-100
      const qualityScore = (supplier.qualityRating / 5) * 100;

      // Reliability: 0-100 direct
      const reliabScore = supplier.reliabilityScore;

      const totalScore =
        priceScore * weights.price +
        qualityScore * weights.quality +
        reliabScore * weights.reliability +
        leadTimeScore * weights.leadTime;

      return { supplier, score: totalScore };
    });

    // Urgency-based sorting
    if (urgency === 'urgent') {
      // Urgent: prioritize lead time first, then score
      scored.sort((a, b) => {
        const leadDiff = a.supplier.leadTimeDays - b.supplier.leadTimeDays;
        if (leadDiff !== 0) return leadDiff;
        return b.score - a.score;
      });
    } else {
      // Normal: sort by total score
      scored.sort((a, b) => b.score - a.score);
    }

    return scored[0]?.supplier || null;
  },

  // ========== REORDER NOTIFICATIONS ==========

  /**
   * Check if ingredient needs reorder and create notification
   * Prevents spam by checking for existing alerts today
   */
  checkAndNotify: (state: AppState, ingredientId: string): void => {
    const ingredient = state.ingredients.find((i: Ingredient) => i.id === ingredientId);
    if (!ingredient) return;

    // Helper to extract value from legacy or new format
    const getVal = (v: any) => (typeof v === 'object' && v !== null ? v.value : Number(v) || 0);

    const currentStock = getVal(ingredient.stock) || getVal((ingredient as any).currentStock);
    const reorderPoint = getVal(ingredient.reorderPoint);

    if (reorderPoint > 0 && currentStock <= reorderPoint) {
      // Check if alert already exists for today (avoid spam)
      const today = new Date().toISOString().split('T')[0];
      const existingAlert = state.notifications.find(
        (n: AppNotification) =>
          n.type === 'SYSTEM' &&
          n.message.includes(ingredient.name) &&
          (n.timestamp instanceof Date
            ? n.timestamp.toISOString()
            : n.timestamp
          ).startsWith(today)
      );

      if (!existingAlert) {
        const newNotification: AppNotification = {
          id: crypto.randomUUID(),
          message: `CRITICAL: Stock de ${ingredient.name} bajo (${currentStock} ${ingredient.unit}). Reorder Point: ${reorderPoint}.`,
          type: 'SYSTEM',
          timestamp: new Date().toISOString(),
          read: false,
          outletId: state.activeOutletId || undefined,
        };
        state.addNotification(newNotification);
      }
    }
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
