import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const createOrderNotification = functions.firestore
    .document('purchaseOrders/{orderId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const previousData = change.before.data();
        const orderId = context.params.orderId;

        // Skip if status hasn't changed
        if (newData.status === previousData.status) return;

        const db = admin.firestore();
        const now = admin.firestore.Timestamp.now();

        let notification = null;

        // 1. Order Approved -> Notify Outlet Staff
        if (newData.status === 'APPROVED' && previousData.status === 'DRAFT') {
            notification = {
                type: 'ORDER_UPDATE',
                title: 'Pedido Aprobado',
                message: `El pedido ${newData.orderNumber} ha sido aprobado.`,
                outletId: newData.outletId,
                orderId: orderId,
                link: `/compras/${orderId}`,
                read: false,
                timestamp: now
            };
        }

        // 2. Order Received -> Notify Outlet Staff
        else if (newData.status === 'RECEIVED' && previousData.status !== 'RECEIVED') {
            notification = {
                type: 'ORDER_UPDATE',
                title: 'Pedido Recibido',
                message: `El pedido ${newData.orderNumber} ha sido marcado como recibido.`,
                outletId: newData.outletId,
                orderId: orderId,
                link: `/compras/${orderId}`,
                read: false,
                timestamp: now
            };
        }

        // 3. Order Rejected -> Notify Creator (if we tracked creatorId, leveraging outletId for now)
        else if (newData.status === 'REJECTED') {
            notification = {
                type: 'ORDER_UPDATE',
                title: 'Pedido Rechazado',
                message: `El pedido ${newData.orderNumber} ha sido rechazado.`,
                outletId: newData.outletId,
                orderId: orderId,
                link: `/compras/${orderId}`,
                read: false,
                timestamp: now
            };
        }

        if (notification) {
            await db.collection('notifications').add(notification);
            console.log(`Notification created for order ${orderId} (${newData.status})`);
        }
    });
