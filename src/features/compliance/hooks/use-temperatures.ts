'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { TemperatureLog } from '../types';

const supabase = createClient();

export function useTemperatureLogs(
  hotelId: string,
  location?: string,
  fromIso?: string,
  toIso?: string,
) {
  return useQuery({
    queryKey: ['temperature-logs', hotelId, location, fromIso, toIso],
    queryFn: async (): Promise<TemperatureLog[]> => {
      const { data, error } = await supabase.rpc('get_temperature_logs', {
        p_hotel_id: hotelId,
        p_location: location ?? null,
        p_from:     fromIso ?? undefined,
        p_to:       toIso ?? undefined,
      });
      if (error) throw error;
      return data as TemperatureLog[];
    },
    enabled: !!hotelId,
  });
}

export function useLogTemperature(hotelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      location: string;
      temperature: number;
      min_allowed?: number;
      max_allowed?: number;
      product_id?: string;
      lot_id?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('log_temperature', {
        p_hotel_id:   hotelId,
        p_location:   vars.location,
        p_temperature: vars.temperature,
        p_min_allowed: vars.min_allowed ?? null,
        p_max_allowed: vars.max_allowed ?? null,
        p_product_id:  vars.product_id ?? null,
        p_lot_id:      vars.lot_id ?? null,
        p_notes:       vars.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['temperature-logs', hotelId] });
    },
  });
}
