'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { StockReservation } from '../types'

export function useEventReservations(eventId?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<StockReservation[]>({
    queryKey: ['event-reservations', hotel?.hotel_id, eventId],
    enabled: !!hotel && !!eventId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_event_reservations', {
        p_hotel_id: hotel!.hotel_id,
        p_event_id: eventId!,
      })
      if (error) throw error
      return (data as StockReservation[]) ?? []
    },
  })
}

export function useReserveStockForEvent() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('reserve_stock_for_event', {
        p_hotel_id: hotel!.hotel_id,
        p_event_id: eventId,
      })
      if (error) throw error
      return data as { event_id: string; reserved_lines: number; shortfalls: number }
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event-reservations', hotel?.hotel_id, eventId] })
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
    },
  })
}

export function useConsumeReservation() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: { reservation_id: string; qty: number }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('consume_reservation', {
        p_hotel_id: hotel!.hotel_id,
        p_reservation_id: input.reservation_id,
        p_qty: input.qty,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-reservations'] })
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      queryClient.invalidateQueries({ queryKey: ['stock-lots'] })
    },
  })
}

export function useReleaseReservation() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('release_reservation', {
        p_hotel_id: hotel!.hotel_id,
        p_reservation_id: reservationId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-reservations'] })
    },
  })
}

export function useCalculateRealCost() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('calculate_real_cost', {
        p_hotel_id: hotel!.hotel_id,
        p_event_id: eventId,
      })
      if (error) throw error
      return data as number
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event-reservations', hotel?.hotel_id, eventId] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
