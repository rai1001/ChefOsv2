import { useEffect, useState } from 'react';
// import { onSnapshot, query, where } from 'firebase/firestore';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import type { Supplier } from '@/types';

export const useSuppliersSync = () => {
  const { activeOutletId, setSuppliers } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Stubbed for Supabase migration
    const fetchSuppliers = async () => {
      setLoading(false);
    };
    fetchSuppliers();
    /*
    if (!activeOutletId) {
      setSuppliers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collections.suppliers, where('outletId', '==', activeOutletId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Supplier[];

        setSuppliers(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error syncing suppliers:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    */
  }, [activeOutletId, setSuppliers]);

  return { loading, error };
};
