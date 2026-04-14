'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { StockLevel, StockAlert, StockLot, StorageLocation } from '../types'

export function useStockLevels(locationId?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<StockLevel[]>({
    queryKey: ['stock-levels', hotel?.hotel_id, locationId],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_stock_levels', {
        p_hotel_id: hotel!.hotel_id,
        p_location_id: locationId ?? null,
      })
      if (error) throw error
      return (data as StockLevel[]) ?? []
    },
  })
}

export function useStockAlerts() {
  const { data: hotel } = useActiveHotel()

  return useQuery<StockAlert[]>({
    queryKey: ['stock-alerts', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('check_stock_alerts', {
        p_hotel_id: hotel!.hotel_id,
      })
      if (error) throw error
      return (data as StockAlert[]) ?? []
    },
  })
}

export function useStockLots(productId?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<StockLot[]>({
    queryKey: ['stock-lots', hotel?.hotel_id, productId],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('stock_lots')
        .select('*, product:products(id, name), storage_location:storage_locations(id, name)')
        .eq('hotel_id', hotel!.hotel_id)
        .gt('current_quantity', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false })

      if (productId) {
        query = query.eq('product_id', productId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as StockLot[]
    },
  })
}

export function useStorageLocations() {
  const { data: hotel } = useActiveHotel()

  return useQuery<StorageLocation[]>({
    queryKey: ['storage-locations', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('storage_locations')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data as StorageLocation[]
    },
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: { lot_id: string; new_quantity: number; reason: string }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('adjust_stock', {
        p_hotel_id: hotel!.hotel_id,
        p_lot_id: input.lot_id,
        p_new_quantity: input.new_quantity,
        p_reason: input.reason,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      queryClient.invalidateQueries({ queryKey: ['stock-lots'] })
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] })
    },
  })
}

export function useTransferStock() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: { lot_id: string; quantity: number; to_location_id: string; notes?: string }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('transfer_stock', {
        p_hotel_id: hotel!.hotel_id,
        p_lot_id: input.lot_id,
        p_quantity: input.quantity,
        p_to_location_id: input.to_location_id,
        p_notes: input.notes ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      queryClient.invalidateQueries({ queryKey: ['stock-lots'] })
    },
  })
}
