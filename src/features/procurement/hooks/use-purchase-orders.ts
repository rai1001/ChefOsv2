'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { PurchaseOrder, PurchaseOrderLine, PoStatus } from '../types'

export function usePurchaseOrders(filters?: {
  status?: PoStatus
  supplier_id?: string
}) {
  const { data: hotel } = useActiveHotel()

  return useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders', hotel?.hotel_id, filters],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('purchase_orders')
        .select('*, supplier:suppliers(id, name)')
        .eq('hotel_id', hotel!.hotel_id)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id)
      }

      const { data, error } = await query
      if (error) throw error
      return data as PurchaseOrder[]
    },
  })
}

export function usePurchaseOrder(orderId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<PurchaseOrder & { lines: PurchaseOrderLine[] }>({
    queryKey: ['purchase-order', orderId],
    enabled: !!hotel && !!orderId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, supplier:suppliers(id, name), lines:purchase_order_lines(*, product:products(id, name), unit:units_of_measure(id, abbreviation))')
        .eq('id', orderId!)
        .eq('hotel_id', hotel!.hotel_id)
        .single()
      if (error) throw error
      return data as PurchaseOrder & { lines: PurchaseOrderLine[] }
    },
  })
}

export function useGeneratePO() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: {
      supplier_id: string
      request_ids: string[]
      expected_delivery?: string
      payment_terms?: string
      notes?: string
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('generate_purchase_order', {
        p_hotel_id: hotel!.hotel_id,
        p_supplier_id: input.supplier_id,
        p_request_ids: input.request_ids,
        p_expected_delivery: input.expected_delivery ?? null,
        p_payment_terms: input.payment_terms ?? null,
        p_notes: input.notes ?? null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
    },
  })
}

export function useTransitionPO() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
      reason,
    }: {
      orderId: string
      newStatus: PoStatus
      reason?: string
    }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('transition_purchase_order', {
        p_hotel_id: hotel!.hotel_id,
        p_order_id: orderId,
        p_new_status: newStatus,
        p_reason: reason ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] })
    },
  })
}

export function useUpdatePOLine() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PurchaseOrderLine> & { id: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('purchase_order_lines')
        .update(updates)
        .eq('id', id)
        .eq('hotel_id', hotel!.hotel_id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] })
    },
  })
}
