'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Label, LabelType, TreatmentType, LabelOrigin, TraceabilityChain } from '../types';

const supabase = createClient();

export function useLabels(
  hotelId: string,
  from?: string,   // YYYY-MM-DD
  to?: string,
  type?: LabelType,
) {
  return useQuery({
    queryKey: ['labels', hotelId, from, to, type],
    queryFn: async (): Promise<Label[]> => {
      const { data, error } = await supabase.rpc('get_labels', {
        p_hotel_id: hotelId,
        p_from:     from ?? undefined,
        p_to:       to ?? undefined,
        p_type:     type ?? null,
      });
      if (error) throw error;
      return data as Label[];
    },
    enabled: !!hotelId,
  });
}

export function useCreateLabel(hotelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      label_type: LabelType;
      expires_at: string;
      quantity?: number;
      unit?: string;
      treatment?: TreatmentType;
      product_id?: string;
      recipe_id?: string;
      name_free?: string;
      elaborated_at?: string;
      opened_at?: string;
      location?: string;
      origin?: LabelOrigin;
      event_id?: string;
      task_id?: string;
      lot_id?: string;
      allergens?: string[];
    }): Promise<{ label_id: string; barcode: string }> => {
      const { data, error } = await supabase.rpc('create_label', {
        p_hotel_id:     hotelId,
        p_label_type:   vars.label_type,
        p_expires_at:   vars.expires_at,
        p_quantity:     vars.quantity ?? 1,
        p_unit:         vars.unit ?? 'kg',
        p_treatment:    vars.treatment ?? 'none',
        p_product_id:   vars.product_id ?? null,
        p_recipe_id:    vars.recipe_id ?? null,
        p_name_free:    vars.name_free ?? null,
        p_elaborated_at: vars.elaborated_at ?? null,
        p_opened_at:    vars.opened_at ?? null,
        p_location:     vars.location ?? null,
        p_origin:       vars.origin ?? 'manual',
        p_event_id:     vars.event_id ?? null,
        p_task_id:      vars.task_id ?? null,
        p_lot_id:       vars.lot_id ?? null,
        p_allergens:    vars.allergens ?? [],
      });
      if (error) throw error;
      const row = (data as { label_id: string; barcode: string }[])[0];
      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labels', hotelId] });
    },
  });
}

export function usePrintLabel(hotelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase.rpc('print_label', {
        p_label_id: labelId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labels', hotelId] });
    },
  });
}

export function useTraceLot(lotId: string | null) {
  return useQuery({
    queryKey: ['trace-lot', lotId],
    queryFn: async (): Promise<TraceabilityChain> => {
      const { data, error } = await supabase.rpc('trace_lot', {
        p_lot_id: lotId!,
      });
      if (error) throw error;
      return data as TraceabilityChain;
    },
    enabled: !!lotId,
  });
}
