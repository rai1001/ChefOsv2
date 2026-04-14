'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { StockMovement } from '../types'

export function useStockMovements(filters?: {
  product_id?: string
  movement_type?: string
  limit?: number
}) {
  const { data: hotel } = useActiveHotel()

  return useQuery<StockMovement[]>({
    queryKey: ['stock-movements', hotel?.hotel_id, filters],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('stock_movements')
        .select('*, product:products(id, name)')
        .eq('hotel_id', hotel!.hotel_id)
        .order('created_at', { ascending: false })
        .limit(filters?.limit ?? 100)

      if (filters?.product_id) {
        query = query.eq('product_id', filters.product_id)
      }
      if (filters?.movement_type) {
        query = query.eq('movement_type', filters.movement_type)
      }

      const { data, error } = await query
      if (error) throw error
      return data as StockMovement[]
    },
  })
}
