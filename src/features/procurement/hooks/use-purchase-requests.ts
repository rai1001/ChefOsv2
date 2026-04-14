'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { PurchaseRequest, PurchaseRequestLine, PrStatus, UrgencyLevel } from '../types'

export function usePurchaseRequests(filters?: {
  status?: PrStatus
  urgency?: UrgencyLevel
}) {
  const { data: hotel } = useActiveHotel()

  return useQuery<PurchaseRequest[]>({
    queryKey: ['purchase-requests', hotel?.hotel_id, filters],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('purchase_requests')
        .select('*, event:events(id, name)')
        .eq('hotel_id', hotel!.hotel_id)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.urgency) {
        query = query.eq('urgency', filters.urgency)
      }

      const { data, error } = await query
      if (error) throw error
      return data as PurchaseRequest[]
    },
  })
}

export function usePurchaseRequest(requestId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<PurchaseRequest & { lines: PurchaseRequestLine[] }>({
    queryKey: ['purchase-request', requestId],
    enabled: !!hotel && !!requestId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*, event:events(id, name), lines:purchase_request_lines(*, product:products(id, name), unit:units_of_measure(id, abbreviation))')
        .eq('id', requestId!)
        .eq('hotel_id', hotel!.hotel_id)
        .single()
      if (error) throw error
      return data as PurchaseRequest & { lines: PurchaseRequestLine[] }
    },
  })
}

interface CreatePRInput {
  event_id?: string
  urgency?: UrgencyLevel
  notes?: string
  lines: {
    product_id: string
    unit_id?: string
    quantity: number
    notes?: string
  }[]
}

export function useCreatePurchaseRequest() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: CreatePRInput) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('create_purchase_request', {
        p_hotel_id: hotel!.hotel_id,
        p_event_id: input.event_id ?? null,
        p_urgency: input.urgency ?? 'normal',
        p_notes: input.notes ?? null,
        p_lines: input.lines,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
    },
  })
}

export function useTransitionPR() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async ({
      requestId,
      newStatus,
      reason,
    }: {
      requestId: string
      newStatus: PrStatus
      reason?: string
    }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('transition_purchase_request', {
        p_hotel_id: hotel!.hotel_id,
        p_request_id: requestId,
        p_new_status: newStatus,
        p_reason: reason ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-request'] })
    },
  })
}
