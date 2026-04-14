'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { Alert } from '../types'

export function useActiveAlerts() {
  const { data: hotel } = useActiveHotel()

  return useQuery<Alert[]>({
    queryKey: ['alerts-active', hotel?.hotel_id],
    enabled: !!hotel,
    refetchInterval: 120000, // refresca cada 2min
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_active_alerts', {
        p_hotel_id: hotel!.hotel_id,
        p_limit: 50,
      })
      if (error) throw error
      return (data as Alert[]) ?? []
    },
  })
}

export function useDismissAlert() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (alertId: string) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('dismiss_alert', {
        p_hotel_id: hotel!.hotel_id,
        p_alert_id: alertId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-active'] })
    },
  })
}

export function useGenerateDailySnapshot() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('generate_daily_snapshot', {
        p_hotel_id: hotel!.hotel_id,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-active'] })
      queryClient.invalidateQueries({ queryKey: ['kpi-snapshots'] })
    },
  })
}
