import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import type { Menu } from '@/types';

export const useMenusSync = () => {
  const { activeOutletId, setMenus } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (import.meta.env.VITE_USE_SUPABASE_READ === 'true') {
      setLoading(false);
      return;
    }
    if (!activeOutletId) {
      setMenus([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collections.menus, where('outletId', '==', activeOutletId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Menu[];

        setMenus(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error syncing menus:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeOutletId, setMenus]);

  return { loading, error };
};
