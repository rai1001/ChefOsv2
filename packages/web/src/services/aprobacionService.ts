import { firestoreService } from '@/services/firestoreService';
import { COLLECTIONS } from '@/config/collections';
import { pedidosService } from './pedidosService';
import { auditService } from './auditService';
import type { PurchaseOrder } from '@/types';

export const aprobacionService = {
    approveOrder: async (orderId: string, userId: string, logistics?: Partial<PurchaseOrder>): Promise<void> => {
        // Mock Bypass delegated to pedidosService.updateStatus
        await pedidosService.updateStatus(orderId, 'APPROVED', userId, logistics);

        const mockDB = localStorage.getItem('E2E_MOCK_DB');
        if (!mockDB) {
            await auditService.log({
                action: 'PURCHASE_ORDER_Approved',
                entityId: orderId,
                userId,
                details: { status: 'APPROVED', ...logistics }
            });
        }
        console.log(`Order ${orderId} approved by ${userId}`);
    },

    rejectOrder: async (orderId: string, userId: string, reason: string): Promise<void> => {
        // ... (existing implementation)
        const mockDBStr = localStorage.getItem('E2E_MOCK_DB');
        if (mockDBStr) {
            const db = JSON.parse(mockDBStr) as Record<string, any[]>;
            const idx = db.purchaseOrders?.findIndex((o: any) => o.id === orderId);
            if (db.purchaseOrders && idx !== undefined && idx >= 0) {
                const order = db.purchaseOrders[idx];
                if (order) {
                    order.status = 'REJECTED';
                    order.rejectedBy = userId;
                    order.notes = reason;
                }
                localStorage.setItem('E2E_MOCK_DB', JSON.stringify(db));
                return;
            }
        }

        await firestoreService.update(COLLECTIONS.PURCHASE_ORDERS, orderId, {
            status: 'REJECTED',
            rejectedBy: userId,
            notes: reason,
            updatedAt: new Date().toISOString()
        });

        await auditService.log({
            action: 'PURCHASE_ORDER_Rejected',
            entityId: orderId,
            userId,
            details: { reason }
        });
        console.log(`Order ${orderId} rejected by ${userId}: ${reason}`);
    },

    sendOrder: async (orderId: string, userId: string, logistics?: Partial<PurchaseOrder>): Promise<void> => {
        await pedidosService.updateStatus(orderId, 'ORDERED', userId, logistics);

        const mockDB = localStorage.getItem('E2E_MOCK_DB');
        if (!mockDB) {
            await auditService.log({
                action: 'PURCHASE_ORDER_Sent',
                entityId: orderId,
                userId,
                details: { status: 'ORDERED', ...logistics }
            });
        }
        console.log(`Order ${orderId} sent to supplier`);
    }
};
