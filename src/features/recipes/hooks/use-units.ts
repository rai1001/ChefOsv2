'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { UnitOfMeasure } from '../types'

export function useUnits() {
  const { data: hotel } = useActiveHotel()

  return useQuery<UnitOfMeasure[]>({
    queryKey: ['units', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('units_of_measure')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .order('unit_type')
        .order('name')
      if (error) throw error
      return data as UnitOfMeasure[]
    },
  })
}
