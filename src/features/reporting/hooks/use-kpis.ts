'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { FoodCostByEvent, FoodCostByService, CostVarianceRow } from '../types'

export function useFoodCostByEvent(from: string, to: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<FoodCostByEvent[]>({
    queryKey: ['food-cost-event', hotel?.hotel_id, from, to],
    enabled: !!hotel && !!from && !!to,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_food_cost_by_event', {
        p_hotel_id: hotel!.hotel_id,
        p_from: from,
        p_to: to,
      })
      if (error) throw error
      return (data as FoodCostByEvent[]) ?? []
    },
  })
}

export function useFoodCostByService(from: string, to: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<FoodCostByService[]>({
    queryKey: ['food-cost-service', hotel?.hotel_id, from, to],
    enabled: !!hotel && !!from && !!to,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_food_cost_by_service', {
        p_hotel_id: hotel!.hotel_id,
        p_from: from,
        p_to: to,
      })
      if (error) throw error
      return (data as FoodCostByService[]) ?? []
    },
  })
}

export function useCostVarianceReport(from: string, to: string, minVariancePct = 5) {
  const { data: hotel } = useActiveHotel()

  return useQuery<CostVarianceRow[]>({
    queryKey: ['cost-variance', hotel?.hotel_id, from, to, minVariancePct],
    enabled: !!hotel && !!from && !!to,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_cost_variance_report', {
        p_hotel_id: hotel!.hotel_id,
        p_from: from,
        p_to: to,
        p_min_variance_pct: minVariancePct,
      })
      if (error) throw error
      return (data as CostVarianceRow[]) ?? []
    },
  })
}
