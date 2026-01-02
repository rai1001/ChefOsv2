import { useEffect, useState } from 'react';
import { query, where } from 'firebase/firestore';
import { onSnapshotMockable } from '@/services/mockSnapshot';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import type { InventoryItem } from '@/types';

export const useInventorySync = () => {
  const { activeOutletId, setInventory } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!activeOutletId) {
      setInventory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // We fetch all inventory for now, or could filter by outletId here if we wanted strict firestore filtering
    const q = query(collections.inventory, where('outletId', 'in', [activeOutletId, 'GLOBAL']));

    const unsubscribe = onSnapshotMockable(
      q,
      'inventory',
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as InventoryItem[];

        setInventory(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error syncing inventory:', err);
        setError(err);
        setLoading(false);
      },
      activeOutletId
    );

    return () => unsubscribe();
  }, [activeOutletId, setInventory]);

  return { loading, error };
};
