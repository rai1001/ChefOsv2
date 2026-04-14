'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { WasteRecord, WasteType } from '../types'

export function useWasteRecords() {
  const { data: hotel } = useActiveHotel()

  return useQuery<WasteRecord[]>({
    queryKey: ['waste-records', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('waste_records')
        .select('*, product:products(id, name)')
        .eq('hotel_id', hotel!.hotel_id)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as WasteRecord[]
    },
  })
}

export function useRecordWaste() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: {
      product_id: string
      lot_id?: string
      quantity: number
      waste_type: WasteType
      department?: string
      reason?: string
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('record_waste', {
        p_hotel_id: hotel!.hotel_id,
        p_product_id: input.product_id,
        p_lot_id: input.lot_id ?? null,
        p_quantity: input.quantity,
        p_waste_type: input.waste_type,
        p_department: input.department ?? null,
        p_reason: input.reason ?? null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-records'] })
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      queryClient.invalidateQueries({ queryKey: ['stock-lots'] })
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] })
    },
  })
}
