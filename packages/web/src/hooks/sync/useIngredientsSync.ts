import { useEffect, useState } from 'react';
import { query, where } from 'firebase/firestore';
import { onSnapshotMockable } from '@/services/mockSnapshot';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import type { Ingredient } from '@/types';

import { Quantity, Money, Unit } from '@culinaryos/core';

export const useIngredientsSync = () => {
  const { setIngredients, activeOutletId } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!activeOutletId) {
      setIngredients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // OPTIMIZED: Query only ingredients for the active outlet
    const q = query(collections.ingredients, where('outletId', '==', activeOutletId));

    const unsubscribe = onSnapshotMockable(
      q,
      `ingredients-${activeOutletId}`,
      (snapshot) => {
        const data: Ingredient[] = [];

        snapshot.docs.forEach((doc) => {
          try {
            const d = doc.data();
            // Hydrate Core Value Objects safely
            const unit = d.currentStock?.unit || d.unit || 'ud';
            const coreUnit = Unit.from(typeof unit === 'string' ? unit : unit.type || 'ud');

            const currentStock = new Quantity(d.currentStock?.value || d.stock || 0, coreUnit);
            const minimumStock = new Quantity(d.minimumStock?.value || d.minStock || 0, coreUnit);
            const lastCost = d.lastCost
              ? new Money(d.lastCost.amount, d.lastCost.currency)
              : new Money(d.costPerUnit || 0, 'EUR');

            data.push({
              id: doc.id,
              ...d,
              currentStock,
              minimumStock,
              lastCost,
              unit: d.unit,
              isTrackedInInventory: d.isTrackedInInventory ?? true,
              suppliers: d.suppliers || [],
            } as Ingredient);
          } catch (itemErr) {
            console.error(`Error hydrating ingredient ${doc.id}:`, itemErr);
            // Skip broken items to keep UI alive
          }
        });

        setIngredients(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error syncing ingredients:', err);
        setError(err);
        setLoading(false);
      },
      'global'
    );

    return () => unsubscribe();
  }, [setIngredients]);

  return { loading, error };
};
