'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { AppccRecord, AppccRecordStatus, AppccCategory } from '../types';

const supabase = createClient();

// ── Queries ──────────────────────────────

export function useAppccRecords(
  hotelId: string,
  date: string,           // YYYY-MM-DD
  category?: AppccCategory,
) {
  return useQuery({
    queryKey: ['appcc-records', hotelId, date, category],
    queryFn: async (): Promise<AppccRecord[]> => {
      const { data, error } = await supabase.rpc('get_appcc_records', {
        p_hotel_id: hotelId,
        p_date:     date,
        p_category: category ?? null,
      });
      if (error) throw error;
      return data as AppccRecord[];
    },
    enabled: !!hotelId,
  });
}

// ── Mutations ────────────────────────────

export function useCreateAppccRecord(hotelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      template_id: string;
      status: AppccRecordStatus;
      value_measured?: string;
      observations?: string;
      corrective_action_taken?: string;
      event_id?: string;
      record_date?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_appcc_record', {
        p_hotel_id:                hotelId,
        p_template_id:             vars.template_id,
        p_status:                  vars.status,
        p_value_measured:          vars.value_measured ?? null,
        p_observations:            vars.observations ?? null,
        p_corrective_action_taken: vars.corrective_action_taken ?? null,
        p_event_id:                vars.event_id ?? null,
        p_record_date:             vars.record_date ?? undefined,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appcc-records', hotelId] });
    },
  });
}

export function useSeedAppccDefaults(hotelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('seed_appcc_defaults', {
        p_hotel_id: hotelId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appcc-records', hotelId] });
    },
  });
}
