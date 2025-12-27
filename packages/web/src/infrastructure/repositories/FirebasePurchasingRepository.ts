import { injectable } from 'inversify';
import { db } from '@/config/firebase';
import { collection, doc, setDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
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
        const q = query(collection(db, this.collectionName), where('outletId', '==', outletId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PurchaseOrder));
    }

    async createOrder(order: PurchaseOrder): Promise<void> {
        await setDoc(doc(db, this.collectionName, order.id), {
            ...order,
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
            expectedDeliveryDate: order.expectedDeliveryDate?.toISOString(),
            actualDeliveryDate: order.actualDeliveryDate?.toISOString(),
            approvedAt: order.approvedAt?.toISOString()
        });
    }

    async updateOrder(id: string, order: Partial<PurchaseOrder>): Promise<void> {
        const updateData: any = { ...order, updatedAt: new Date().toISOString() };
        await updateDoc(doc(db, this.collectionName, id), updateData);
    }
}
