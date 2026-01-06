import { useEffect, useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { supabase } from '@/config/supabase';
import type { Outlet } from '@/types';

export const useOutletsSync = () => {
  const { setOutlets, setActiveOutletId } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // NOTE: This hook must fetch outlets from Supabase; it was previously stubbed (Firebase).
    // Do not early return here: we always try to load outlets and auto-select one.
    const fetchOutlets = async () => {
      try {
        console.log('[Sync] Fetching outlets from Supabase...');

        const { data, error } = await supabase
          .from('outlets')
          .select('id, name, type, is_active, address')
          .eq('is_active', true);

        if (error) {
          console.error('[Sync] Error fetching outlets:', error);
          setLoading(false);
          return;
        }

        const outletsData = (data || []).map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          isActive: row.is_active,
          address: row.address,
        })) as Outlet[];

        console.log(`[Sync] Outlets synced (${outletsData.length})`);
        setOutlets(outletsData);

        // Access current state via store to avoid dependency loop
        const currentActiveId = useStore.getState().activeOutletId;

        // Auto-select logic if none selected or selection invalid
        if (outletsData.length > 0) {
          const isValid = outletsData.find((o) => o.id === currentActiveId);
          if (!currentActiveId || !isValid) {
            const defaultOutlet =
              outletsData.find((o) => o.type === 'main_kitchen') || outletsData[0];
            if (defaultOutlet) {
              console.log('[Sync] Auto-selecting outlet:', defaultOutlet.name);
              setActiveOutletId(defaultOutlet.id);
            }
          }
        } else {
          // No outlets found; clear active selection to avoid stale IDs
          setActiveOutletId(null);
        }

        setLoading(false);
      } catch (err) {
        console.error('[Sync] Error in fetchOutlets:', err);
        setLoading(false);
      }
    };

    fetchOutlets();

    // Set up real-time subscription
    const channel = supabase
      .channel('outlets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outlets',
        },
        (payload) => {
          console.log('[Sync] Outlet changed, refetching...', payload);
          fetchOutlets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setOutlets, setActiveOutletId]);

  return { loading };
};
