'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { StockCount, StockCountLine, StockForensics, CountType } from '../types'

export function useStockCounts() {
  const { data: hotel } = useActiveHotel()

  return useQuery<StockCount[]>({
    queryKey: ['stock-counts', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('stock_counts')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .order('started_at', { ascending: false })
      if (error) throw error
      return data as StockCount[]
    },
  })
}

export function useStockCount(countId?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<StockCount | null>({
    queryKey: ['stock-count', hotel?.hotel_id, countId],
    enabled: !!hotel && !!countId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('stock_counts')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .eq('id', countId!)
        .single()
      if (error) throw error
      return data as StockCount
    },
  })
}

export function useStockCountLines(countId?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<StockCountLine[]>({
    queryKey: ['stock-count-lines', hotel?.hotel_id, countId],
    enabled: !!hotel && !!countId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('stock_count_lines')
        .select('*, product:products(id, name), lot:stock_lots(id, lot_number, expiry_date)')
        .eq('hotel_id', hotel!.hotel_id)
        .eq('count_id', countId!)
        .order('product_id')
      if (error) throw error
      return data as StockCountLine[]
    },
  })
}

export function useStartStockCount() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: {
      count_type?: CountType
      is_blind?: boolean
      label?: string
      location_id?: string
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('start_stock_count', {
        p_hotel_id: hotel!.hotel_id,
        p_count_type: input.count_type ?? 'full',
        p_is_blind: input.is_blind ?? false,
        p_label: input.label ?? null,
        p_location_id: input.location_id ?? null,
      })
      if (error) throw error
      return data as string  // returns count_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] })
    },
  })
}

export function useSubmitStockCountLine() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: {
      line_id: string
      counted_qty: number
      notes?: string
    }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('submit_stock_count_line', {
        p_hotel_id: hotel!.hotel_id,
        p_line_id: input.line_id,
        p_counted_qty: input.counted_qty,
        p_notes: input.notes ?? null,
      })
      if (error) throw error
    },
    onSuccess: (_, { line_id }) => {
      // Invalidar las líneas del conteo actual
      queryClient.invalidateQueries({ queryKey: ['stock-count-lines'] })
    },
  })
}

export function useReviewStockCount() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: { count_id: string; apply_adjustments?: boolean }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('review_stock_count', {
        p_hotel_id: hotel!.hotel_id,
        p_count_id: input.count_id,
        p_apply_adjustments: input.apply_adjustments ?? true,
      })
      if (error) throw error
      return data as {
        count_id: string
        adjustments_applied: number
        total_variance: number
        status: string
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] })
      queryClient.invalidateQueries({ queryKey: ['stock-count-lines'] })
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      queryClient.invalidateQueries({ queryKey: ['stock-lots'] })
    },
  })
}

export function useStockForensics(productId?: string, months: number = 3) {
  const { data: hotel } = useActiveHotel()

  return useQuery<StockForensics | null>({
    queryKey: ['stock-forensics', hotel?.hotel_id, productId, months],
    enabled: !!hotel && !!productId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_stock_forensics', {
        p_hotel_id: hotel!.hotel_id,
        p_product_id: productId!,
        p_months: months,
      })
      if (error) throw error
      return data as StockForensics
    },
  })
}
