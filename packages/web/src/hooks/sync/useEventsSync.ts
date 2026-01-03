import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import type { Event } from '@/types';

export const useEventsSync = () => {
  const { setEvents, activeOutletId } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (import.meta.env.VITE_USE_SUPABASE_READ === 'true') {
      setLoading(false);
      return;
    }
    if (!activeOutletId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const q = query(collections.events, where('outletId', 'in', [activeOutletId, 'GLOBAL']));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eventsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Event[];

        setEvents(eventsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error syncing events:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeOutletId, setEvents]);

  return { loading };
};
