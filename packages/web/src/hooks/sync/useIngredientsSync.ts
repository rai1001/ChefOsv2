import { useEffect, useState } from 'react';
import { query } from 'firebase/firestore';
import { onSnapshotMockable } from '@/services/mockSnapshot';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import type { Ingredient } from '@/types';

import { Quantity, Money, Unit } from '@culinaryos/core';

export const useIngredientsSync = () => {
  const { setIngredients } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collections.ingredients);

    const unsubscribe = onSnapshotMockable(
      q,
      'ingredients',
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          // Hydrate Core Value Objects
          const currentStock = new Quantity(
            d.currentStock?.value || d.stock || 0,
            new Unit(d.currentStock?.unit || d.unit || 'un')
          );
          const minimumStock = new Quantity(
            d.minimumStock?.value || d.minStock || 0,
            new Unit(d.minimumStock?.unit || d.unit || 'un')
          );
          const lastCost = d.lastCost
            ? new Money(d.lastCost.amount, d.lastCost.currency)
            : new Money(d.costPerUnit || 0, 'EUR');

          return {
            id: doc.id,
            ...d,
            // Override/Hydrate Fields
            currentStock,
            minimumStock,
            lastCost,
            unit: d.unit, // Keep string for UI or map to Unit object? Interface says Unit | string.
            isTrackedInInventory: d.isTrackedInInventory ?? true,
            suppliers: d.suppliers || [],
            // Ensure legacy fields don't overwrite if they exist but we want hydrated ones favored
            // But we return an object matching Ingredient interface.
          } as Ingredient;
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
