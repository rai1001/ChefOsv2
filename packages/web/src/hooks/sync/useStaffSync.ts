import { useEffect, useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { supabase } from '@/config/supabase';
import type { Employee } from '@/types';

export const useStaffSync = () => {
  const { activeOutletId, setStaff } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!activeOutletId) {
      setStaff([]);
      setLoading(false);
      return;
    }

    const fetchStaff = async () => {
      try {
        console.log(`[Sync] Fetching staff for outlet ${activeOutletId}...`);
        setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('employees')
          .select('*')
          .eq('outlet_id', activeOutletId);

        if (fetchError) {
          console.error('[Sync] Error fetching staff:', fetchError);
          setError(fetchError);
          setLoading(false);
          return;
        }

        const staff = (data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          role: row.role,
          email: row.email,
          phone: row.phone,
          outletId: row.outlet_id,
          isActive: row.is_active ?? true,
        })) as Employee[];

        console.log(`[Sync] Staff synced (${staff.length})`);
        setStaff(staff);
        setLoading(false);
      } catch (err: any) {
        console.error('[Sync] Error in fetchStaff:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchStaff();

    // Set up real-time subscription
    const channel = supabase
      .channel(`staff-${activeOutletId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `outlet_id=eq.${activeOutletId}`,
        },
        (payload) => {
          console.log('[Sync] Staff changed, refetching...', payload);
          fetchStaff();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOutletId, setStaff]);

  return { loading, error };
};
