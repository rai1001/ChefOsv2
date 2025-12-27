import { useEffect, useState } from 'react';
import { query, where } from 'firebase/firestore';
import { onSnapshotMockable } from '@/services/mockSnapshot';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import type { Recipe } from '@/types';

export const useRecipesSync = () => {
    const { activeOutletId, setRecipes } = useStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!activeOutletId) {
            setRecipes([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(
            collections.recipes,
            where('outletId', '==', activeOutletId)
        );

        const unsubscribe = onSnapshotMockable(
            q,
            'recipes',
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Recipe[];

                setRecipes(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error syncing recipes:", err);
                setError(err);
                setLoading(false);
            },
            activeOutletId
        );

        return () => unsubscribe();
    }, [activeOutletId, setRecipes]);

    return { loading, error };
};
