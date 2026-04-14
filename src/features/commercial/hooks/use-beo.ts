'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { BeoData } from '../types'

export function useEventBeo(eventId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<BeoData>({
    queryKey: ['event-beo', eventId],
    enabled: !!hotel && !!eventId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_event_beo', {
        p_hotel_id: hotel!.hotel_id,
        p_event_id: eventId!,
      })
      if (error) throw error
      return data as BeoData
    },
  })
}

export function useGenerateOperationalImpact() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('generate_event_operational_impact', {
        p_hotel_id: hotel!.hotel_id,
        p_event_id: eventId,
      })
      if (error) throw error
      return data as number
    },
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event-beo', eventId] })
    },
  })
}

export function useCalculateEventCostEstimate() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('calculate_event_cost_estimate', {
        p_hotel_id: hotel!.hotel_id,
        p_event_id: eventId,
      })
      if (error) throw error
      return data as number
    },
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event-beo', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
    },
  })
}
