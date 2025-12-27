import { useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useStore } from '@/presentation/store/useStore';
import type { AppNotification } from '@/types';

export const useNotificationSubscription = () => {
    const { addNotification } = useStore();

    useEffect(() => {
        if (!db) return;

        // Subscribe to recent unread notifications
        const q = query(
            collection(db, 'notifications'),
            where('read', '==', false)
            // orderBy/limit requires index. We filter client side if needed or just show all unread.
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const notification: AppNotification = {
                        id: change.doc.id,
                        type: data.type,
                        message: data.message,
                        pccId: data.pccId,
                        read: data.read,
                        timestamp: data.timestamp
                    };
                    addNotification(notification);
                }
            });
        });

        return () => unsubscribe();
    }, [addNotification]);
};
