import { useEffect, useState } from 'react';
import { query } from 'firebase/firestore';
import { onSnapshotMockable } from '@/services/mockSnapshot';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import type { Outlet } from '@/types';

export const useOutletsSync = () => {
    const { setOutlets, setActiveOutletId } = useStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to all outlets
        const q = query(collections.outlets);

        const unsubscribe = onSnapshotMockable(q, 'outlets', (snapshot) => {
            const outletsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Outlet[];

            console.log(`[Sync] Outlets synced (${outletsData.length})`);
            setOutlets(outletsData);

            // Access current state via store to avoid dependency loop
            const currentActiveId = useStore.getState().activeOutletId;

            // Auto-select logic if none selected or selection invalid
            if (outletsData.length > 0) {
                const isValid = outletsData.find(o => o.id === currentActiveId);
                if (!currentActiveId || !isValid) {
                    const defaultOutlet = outletsData.find(o => o.type === 'main_kitchen') || outletsData[0];
                    if (defaultOutlet) {
                        console.log("Auto-selecting outlet:", defaultOutlet.name);
                        setActiveOutletId(defaultOutlet.id);
                    }
                }
            }

            setLoading(false);
        }, (error) => {
            console.error("Error syncing outlets:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [setOutlets, setActiveOutletId]); // Removed activeOutletId to prevent infinite re-subscription loop

    return { loading };
};
