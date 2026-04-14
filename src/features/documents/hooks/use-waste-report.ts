'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { WasteReportEntry } from '../types'

export function useWasteReport(from: string | undefined, to: string | undefined) {
  const { data: hotel } = useActiveHotel()

  return useQuery<WasteReportEntry[]>({
    queryKey: ['waste-report', hotel?.hotel_id, from, to],
    enabled: !!hotel && !!from && !!to,
    queryFn: async () => {
      const supabase = createClient()
      // Aggregate waste movements: group by product_name, sum qty, count incidents
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          quantity,
          unit_cost,
          notes,
          product_id,
          products!inner(name),
          stock_lots!inner(units_of_measure(abbreviation))
        `)
        .eq('hotel_id', hotel!.hotel_id)
        .eq('movement_type', 'waste')
        .gte('created_at', from!)
        .lte('created_at', to! + 'T23:59:59')

      if (error) throw error

      // Manual aggregation by product
      const map = new Map<string, WasteReportEntry>()

      for (const row of (data ?? []) as unknown[]) {
        const r = row as {
          quantity: number
          unit_cost: number | null
          product_id: string | null
          products: { name: string } | null
          stock_lots: { units_of_measure: { abbreviation: string } | null } | null
        }

        const name = r.products?.name ?? r.product_id ?? 'Desconocido'
        const unit = r.stock_lots?.units_of_measure?.abbreviation ?? null
        const val = r.unit_cost != null ? r.quantity * r.unit_cost : null

        if (map.has(name)) {
          const entry = map.get(name)!
          entry.total_qty += r.quantity
          entry.incidents += 1
          if (val != null) {
            entry.est_value = (entry.est_value ?? 0) + val
          }
        } else {
          map.set(name, {
            product_name: name,
            total_qty: r.quantity,
            unit,
            incidents: 1,
            est_value: val,
          })
        }
      }

      return Array.from(map.values()).sort((a, b) =>
        (b.est_value ?? 0) - (a.est_value ?? 0)
      )
    },
  })
}
