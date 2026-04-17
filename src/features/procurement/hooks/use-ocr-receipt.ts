'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'

interface OcrResult {
  ok: boolean
  already_processed?: boolean
  receipt_id?: string
  receipt_number?: string
  lines_processed?: number
  lines_auto_matched?: number
  lines_pending_review?: number
  lines_product_unknown?: number
  price_alerts?: number
  error?: string
  ocr_data?: unknown
}

/**
 * Calcula SHA-256 (hex) del File via crypto.subtle.
 * Usado como idempotency key para dedup de albaranes OCR.
 */
async function sha256HexOfFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function useUploadDeliveryNote() {
  const { data: hotel } = useActiveHotel()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { order_id: string; file: File }): Promise<OcrResult> => {
      if (!hotel) throw new Error('No active hotel')
      const supabase = createClient()

      // 1. Hash SHA-256 del file para idempotencia (browser-side, rápido)
      const imageHash = await sha256HexOfFile(input.file)

      // 2. Upload file to delivery-notes bucket.
      //    El path incluye el hash → si el mismo file se sube 2 veces, upsert:true
      //    sobrescribe el mismo objeto en vez de duplicarlo. El dedup real del GR
      //    lo hace process_ocr_receipt vía delivery_note_image_hash.
      const ext = input.file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${hotel.hotel_id}/${input.order_id}-${imageHash.slice(0, 16)}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('delivery-notes')
        .upload(path, input.file, {
          contentType: input.file.type || 'image/jpeg',
          upsert: true,
        })
      if (upErr) throw new Error(`Upload falló: ${upErr.message}`)

      // 3. Get user JWT for edge function
      const { data: { session } } = await supabase.auth.getSession()
      const userToken = session?.access_token

      // 4. Invoke edge function con hash para dedup DB-side
      const { data, error } = await supabase.functions.invoke('ocr-receipt', {
        body: {
          hotel_id: hotel.hotel_id,
          order_id: input.order_id,
          image_path: path,
          image_hash: imageHash,
        },
        headers: userToken ? { Authorization: `Bearer ${userToken}` } : undefined,
      })

      if (error) throw new Error(`OCR falló: ${error.message}`)
      const result = data as OcrResult
      if (!result.ok) throw new Error(result.error || 'OCR falló sin detalle')

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['ocr-pending'] })
    },
  })
}

interface OcrPendingLine {
  id: string
  receipt_id: string
  receipt_number: string
  ocr_review_status: 'pending_review' | 'product_unknown'
  ocr_match_confidence: number | null
  ocr_raw_text: string | null
  ocr_product_name_extracted: string | null
  quantity_received: number
  unit_cost: number | null
  lot_number: string | null
  expiry_date: string | null
}

export function useOcrPendingLines(receiptId?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<OcrPendingLine[]>({
    queryKey: ['ocr-pending', hotel?.hotel_id, receiptId],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase
        .from('goods_receipt_lines')
        .select(`
          id, receipt_id, ocr_review_status, ocr_match_confidence,
          ocr_raw_text, ocr_product_name_extracted,
          quantity_received, unit_cost, lot_number, expiry_date,
          goods_receipts!inner(receipt_number, hotel_id)
        `)
        .eq('hotel_id', hotel!.hotel_id)
        .in('ocr_review_status', ['pending_review', 'product_unknown'])
        .order('id', { ascending: false })

      if (receiptId) q = q.eq('receipt_id', receiptId)

      const { data, error } = await q
      if (error) throw error
      type RawRow = {
        id: string
        receipt_id: string
        ocr_review_status: 'pending_review' | 'product_unknown'
        ocr_match_confidence: number | null
        ocr_raw_text: string | null
        ocr_product_name_extracted: string | null
        quantity_received: number
        unit_cost: number | null
        lot_number: string | null
        expiry_date: string | null
        goods_receipts: { receipt_number: string } | { receipt_number: string }[] | null
      }
      return (data as unknown as RawRow[] ?? []).map((row) => {
        const gr = Array.isArray(row.goods_receipts) ? row.goods_receipts[0] : row.goods_receipts
        return {
          id: row.id,
          receipt_id: row.receipt_id,
          receipt_number: gr?.receipt_number ?? '',
          ocr_review_status: row.ocr_review_status,
          ocr_match_confidence: row.ocr_match_confidence,
          ocr_raw_text: row.ocr_raw_text,
          ocr_product_name_extracted: row.ocr_product_name_extracted,
          quantity_received: row.quantity_received,
          unit_cost: row.unit_cost,
          lot_number: row.lot_number,
          expiry_date: row.expiry_date,
        }
      }) as OcrPendingLine[]
    },
  })
}

interface MatchSuggestion {
  product_id: string
  product_name: string
  category: string | null
  unit: string | null
  confidence: number
  match_type: string
}

export function useMatchSuggestions(query: string, enabled = true) {
  const { data: hotel } = useActiveHotel()

  return useQuery<MatchSuggestion[]>({
    queryKey: ['match-suggestions', hotel?.hotel_id, query],
    enabled: !!hotel && enabled && query.length > 1,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('match_product_by_alias', {
        p_hotel_id: hotel!.hotel_id,
        p_query: query,
        p_limit: 5,
      })
      if (error) throw error
      return (data ?? []) as MatchSuggestion[]
    },
  })
}

export function useResolveOcrLine() {
  const { data: hotel } = useActiveHotel()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      line_id: string
      product_id: string
      quantity_received?: number
      unit_cost?: number
      mark_status: 'reviewed_ok' | 'reviewed_fixed'
    }) => {
      if (!hotel) throw new Error('No active hotel')
      const supabase = createClient()

      // Update goods_receipt_line: asigna product via order_line_id si existe
      // Para simplificar: actualizamos el unit_cost / quantity y el ocr_review_status
      // El producto se asigna creando un stock_lot directo
      // (la línea ya existe con quality_status='partial')

      // 1. Si quieren cambiar qty/cost, update
      const updates: Record<string, unknown> = { ocr_review_status: input.mark_status }
      if (input.quantity_received != null) updates.quantity_received = input.quantity_received
      if (input.unit_cost != null) updates.unit_cost = input.unit_cost
      // Marcar como aceptada para que el trigger no la vuelva a intentar
      updates.quality_status = 'accepted'

      const { error: upErr } = await supabase
        .from('goods_receipt_lines')
        .update(updates)
        .eq('id', input.line_id)
        .eq('hotel_id', hotel.hotel_id)
      if (upErr) throw upErr

      // 2. Crear stock_lot manualmente (el trigger no se reactiva en UPDATE)
      const { data: line } = await supabase
        .from('goods_receipt_lines')
        .select('quantity_received, unit_cost, lot_number, expiry_date, receipt_id')
        .eq('id', input.line_id)
        .single()

      if (line) {
        const { error: lotErr } = await supabase.from('stock_lots').insert({
          hotel_id: hotel.hotel_id,
          product_id: input.product_id,
          goods_receipt_line_id: input.line_id,
          lot_number: line.lot_number,
          expiry_date: line.expiry_date,
          initial_quantity: line.quantity_received,
          current_quantity: line.quantity_received,
          unit_cost: line.unit_cost,
        })
        if (lotErr) throw lotErr
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocr-pending'] })
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] })
    },
  })
}
