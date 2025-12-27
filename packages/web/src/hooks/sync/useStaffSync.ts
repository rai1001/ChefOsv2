import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import type { Employee } from '@/types';

export const useStaffSync = () => {
    const { activeOutletId, setStaff } = useStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!activeOutletId) {
            setStaff([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(
            collections.staff,
            where('outletId', '==', activeOutletId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Employee[];

            setStaff(data);
            setLoading(false);
        }, (err) => {
            console.error("Error syncing staff:", err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [activeOutletId, setStaff]);

    return { loading, error };
};
