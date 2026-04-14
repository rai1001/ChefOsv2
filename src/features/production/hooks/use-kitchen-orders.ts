'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { KitchenOrder, KitchenOrderItem, KOItemStatus, Department } from '../types'

export function useKitchenOrders(station?: Department) {
  const { data: hotel } = useActiveHotel()

  return useQuery<KitchenOrder[]>({
    queryKey: ['kitchen-orders', hotel?.hotel_id, station],
    enabled: !!hotel,
    refetchInterval: 10_000, // polling cada 10s (sin Realtime aún)
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('kitchen_orders')
        .select('*, items:kitchen_order_items(*)')
        .eq('hotel_id', hotel!.hotel_id)
        .not('status', 'in', '(delivered,cancelled)')
        .order('sequence_number', { ascending: true })

      if (station) {
        query = query.eq('station', station)
      }

      // Solo comandas de hoy
      const today = new Date().toISOString().slice(0, 10)
      query = query.gte('created_at', today + 'T00:00:00')

      const { data, error } = await query
      if (error) throw error
      return data as KitchenOrder[]
    },
  })
}

export function useCreateKitchenOrder() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: {
      station: Department
      event_id?: string
      notes?: string
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('create_kitchen_order', {
        p_hotel_id: hotel!.hotel_id,
        p_station: input.station,
        p_event_id: input.event_id ?? null,
        p_notes: input.notes ?? null,
      })
      if (error) throw error
      return data as string // order_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })
}

export function useAddKitchenOrderItem() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: {
      order_id: string
      title: string
      servings?: number
      recipe_id?: string
      notes?: string
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('add_kitchen_order_item', {
        p_hotel_id: hotel!.hotel_id,
        p_order_id: input.order_id,
        p_title: input.title,
        p_servings: input.servings ?? 1,
        p_recipe_id: input.recipe_id ?? null,
        p_notes: input.notes ?? null,
      })
      if (error) throw error
      return data as string // item_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })
}

export function useUpdateKOItemStatus() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: { item_id: string; status: KOItemStatus }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('update_kitchen_order_item_status', {
        p_hotel_id: hotel!.hotel_id,
        p_item_id: input.item_id,
        p_status: input.status,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })
}
