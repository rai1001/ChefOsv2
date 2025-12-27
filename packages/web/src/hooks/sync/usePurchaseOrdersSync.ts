import { useEffect, useState } from 'react';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import type { PurchaseOrder } from '@/types';

export const usePurchaseOrdersSync = () => {
    const { setPurchaseOrders, activeOutletId } = useStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!activeOutletId) {
            setPurchaseOrders([]);
            setLoading(false);
            return;
        }

        // Optimization: Only sync orders from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateLimit = thirtyDaysAgo.toISOString();

        const q = query(
            collections.purchaseOrders,
            where('outletId', '==', activeOutletId),
            where('date', '>=', dateLimit),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as PurchaseOrder[];

            setPurchaseOrders(ordersData);
            setLoading(false);
        }, (error) => {
            console.error("Error syncing purchase orders:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [activeOutletId, setPurchaseOrders]);

    return { loading };
};
