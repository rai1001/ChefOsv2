'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { GoodsReceipt, GoodsReceiptLine, QualityStatus } from '../types'

export function useGoodsReceipts(orderId?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<GoodsReceipt[]>({
    queryKey: ['goods-receipts', hotel?.hotel_id, orderId],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('goods_receipts')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .order('received_at', { ascending: false })

      if (orderId) {
        query = query.eq('order_id', orderId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as GoodsReceipt[]
    },
  })
}

export function useGoodsReceipt(receiptId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<GoodsReceipt & { lines: GoodsReceiptLine[] }>({
    queryKey: ['goods-receipt', receiptId],
    enabled: !!hotel && !!receiptId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('goods_receipts')
        .select('*, lines:goods_receipt_lines(*)')
        .eq('id', receiptId!)
        .eq('hotel_id', hotel!.hotel_id)
        .single()
      if (error) throw error
      return data as GoodsReceipt & { lines: GoodsReceiptLine[] }
    },
  })
}

interface ReceiveGoodsInput {
  order_id: string
  delivery_note_number?: string
  temperature_check?: boolean
  notes?: string
  lines: {
    order_line_id: string
    quantity_received: number
    lot_number?: string
    expiry_date?: string
    unit_cost?: number
    quality_status?: QualityStatus
    rejection_reason?: string
  }[]
}

export function useReceiveGoods() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: ReceiveGoodsInput) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('receive_goods', {
        p_hotel_id: hotel!.hotel_id,
        p_order_id: input.order_id,
        p_lines: input.lines,
        p_delivery_note_number: input.delivery_note_number ?? null,
        p_temperature_check: input.temperature_check ?? null,
        p_notes: input.notes ?? null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] })
    },
  })
}
