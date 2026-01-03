import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import type { WasteRecord } from '@/types';

export const useWasteSync = () => {
  const { setWasteRecords, activeOutletId } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (import.meta.env.VITE_USE_SUPABASE_READ === 'true') {
      setLoading(false);
      return;
    }
    if (!activeOutletId) {
      setWasteRecords([]);
      setLoading(false);
      return;
    }

    const q = query(collections.wasteRecords, where('outletId', '==', activeOutletId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const wasteData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WasteRecord[];

        setWasteRecords(wasteData);
        setLoading(false);
      },
      (error) => {
        console.error('Error syncing waste records:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeOutletId, setWasteRecords]);

  return { loading };
};
