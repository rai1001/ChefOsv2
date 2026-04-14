'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'

export interface DashboardData {
  date: string
  events: {
    upcoming_7d: number
    confirmed: number
    in_preparation: number
    today: { id: string; name: string; guest_count: number; status: string; start_time: string | null }[]
    total_pax_7d: number
  }
  production: {
    has_plan: boolean
    plan_id?: string
    status?: string
    total?: number
    pending?: number
    in_progress?: number
    done?: number
  }
  procurement: {
    pending_orders: number
    pending_requests: number
    orders_value: number
  }
  inventory: {
    products_in_stock: number
    total_value: number
    low_stock_count: number
    expiring_7d: number
  }
  recipes: {
    total: number
    approved: number
    draft: number
  }
  waste: {
    count_7d: number
    quantity_7d: number
  }
}

export function useDashboard() {
  const { data: hotel } = useActiveHotel()

  return useQuery<DashboardData>({
    queryKey: ['dashboard', hotel?.hotel_id],
    enabled: !!hotel,
    refetchInterval: 60000, // refresh every minute
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_dashboard_data', {
        p_hotel_id: hotel!.hotel_id,
      })
      if (error) throw error
      return data as DashboardData
    },
  })
}
