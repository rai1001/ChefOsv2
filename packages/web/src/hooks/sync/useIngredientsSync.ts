import { useEffect, useState } from 'react';
import { query } from 'firebase/firestore';
import { onSnapshotMockable } from '@/services/mockSnapshot';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import type { Ingredient } from '@/types';

export const useIngredientsSync = () => {
    const { setIngredients } = useStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        const q = query(
            collections.ingredients
        );

        const unsubscribe = onSnapshotMockable(
            q,
            'ingredients',
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Ingredient[];

                setIngredients(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error syncing ingredients:", err);
                setError(err);
                setLoading(false);
            },
            'global'
        );

        return () => unsubscribe();
    }, [setIngredients]);

    return { loading, error };
};
