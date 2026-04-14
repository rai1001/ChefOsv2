'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { ShoppingListGroup } from '../types'

export function useShoppingList(date?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<ShoppingListGroup[]>({
    queryKey: ['shopping-list', hotel?.hotel_id, date],
    enabled: !!hotel && !!date,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('generate_shopping_list', {
        p_hotel_id: hotel!.hotel_id,
        p_date: date!,
      })
      if (error) throw error
      return (data as ShoppingListGroup[]) ?? []
    },
  })
}
