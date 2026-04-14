'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type {
  SupplierConfig,
  SupplierIncident,
  IncidentType,
  IncidentSeverity,
  PriceHistoryEntry,
  ProductSupplierRef,
  SupplierMetrics,
} from '../types'

// === Supplier Config ===

export function useSupplierConfig(supplierId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<SupplierConfig | null>({
    queryKey: ['supplier-config', supplierId],
    enabled: !!hotel && !!supplierId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('supplier_configs')
        .select('*')
        .eq('supplier_id', supplierId!)
        .eq('hotel_id', hotel!.hotel_id)
        .maybeSingle()
      if (error) throw error
      return data as SupplierConfig | null
    },
  })
}

interface UpsertSupplierConfigInput {
  supplier_id: string
  delivery_days?: string[]
  cutoff_time?: string | null
  lead_time_hours?: number | null
  min_order_amount?: number | null
  min_order_units?: number | null
  reception_window_start?: string | null
  reception_window_end?: string | null
  allows_urgent_delivery?: boolean
}

export function useUpsertSupplierConfig() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: UpsertSupplierConfigInput) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('supplier_configs')
        .upsert(
          {
            hotel_id: hotel!.hotel_id,
            supplier_id: input.supplier_id,
            delivery_days: input.delivery_days ?? [],
            cutoff_time: input.cutoff_time ?? null,
            lead_time_hours: input.lead_time_hours ?? null,
            min_order_amount: input.min_order_amount ?? null,
            min_order_units: input.min_order_units ?? null,
            reception_window_start: input.reception_window_start ?? null,
            reception_window_end: input.reception_window_end ?? null,
            allows_urgent_delivery: input.allows_urgent_delivery ?? false,
          },
          { onConflict: 'hotel_id,supplier_id' },
        )
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-config', vars.supplier_id] })
    },
  })
}

// === Supplier Incidents ===

export function useSupplierIncidents(supplierId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<SupplierIncident[]>({
    queryKey: ['supplier-incidents', supplierId],
    enabled: !!hotel && !!supplierId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('supplier_incidents')
        .select('*')
        .eq('supplier_id', supplierId!)
        .eq('hotel_id', hotel!.hotel_id)
        .order('occurred_at', { ascending: false })
      if (error) throw error
      return data as SupplierIncident[]
    },
  })
}

interface RecordIncidentInput {
  supplier_id: string
  incident_type: IncidentType
  description: string
  severity?: IncidentSeverity
  purchase_order_id?: string
  occurred_at?: string
}

export function useRecordSupplierIncident() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: RecordIncidentInput) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('record_supplier_incident', {
        p_hotel_id: hotel!.hotel_id,
        p_supplier_id: input.supplier_id,
        p_incident_type: input.incident_type,
        p_description: input.description,
        p_severity: input.severity ?? 'warning',
        p_purchase_order_id: input.purchase_order_id ?? null,
        p_occurred_at: input.occurred_at ?? new Date().toISOString(),
      })
      if (error) throw error
      return data as string
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['supplier-incidents', vars.supplier_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['supplier-metrics', vars.supplier_id],
      })
    },
  })
}

// === Supplier Metrics ===

export function useSupplierMetrics(supplierId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<SupplierMetrics>({
    queryKey: ['supplier-metrics', supplierId],
    enabled: !!hotel && !!supplierId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_supplier_metrics', {
        p_hotel_id: hotel!.hotel_id,
        p_supplier_id: supplierId!,
      })
      if (error) throw error
      return data as SupplierMetrics
    },
  })
}

// === Price History ===

export function useProductPriceTrend(productId: string | null, months = 6) {
  const { data: hotel } = useActiveHotel()

  return useQuery<PriceHistoryEntry[]>({
    queryKey: ['price-trend', productId, months],
    enabled: !!hotel && !!productId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_price_trend', {
        p_hotel_id: hotel!.hotel_id,
        p_product_id: productId!,
        p_months: months,
      })
      if (error) throw error
      return (data ?? []) as PriceHistoryEntry[]
    },
  })
}

// === Product Supplier Refs ===

export function useProductSupplierRefs(productId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<ProductSupplierRef[]>({
    queryKey: ['product-supplier-refs', productId],
    enabled: !!hotel && !!productId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('product_supplier_refs')
        .select('*')
        .eq('product_id', productId!)
        .eq('hotel_id', hotel!.hotel_id)
      if (error) throw error
      return data as ProductSupplierRef[]
    },
  })
}

interface UpsertRefInput {
  product_id: string
  supplier_id: string
  supplier_code: string
  supplier_name?: string
  purchase_unit_id?: string
  conversion_factor: number
  notes?: string
}

export function useUpsertProductSupplierRef() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: UpsertRefInput) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('product_supplier_refs')
        .upsert(
          {
            hotel_id: hotel!.hotel_id,
            product_id: input.product_id,
            supplier_id: input.supplier_id,
            supplier_code: input.supplier_code,
            supplier_name: input.supplier_name ?? null,
            purchase_unit_id: input.purchase_unit_id ?? null,
            conversion_factor: input.conversion_factor,
            notes: input.notes ?? null,
          },
          { onConflict: 'hotel_id,supplier_id,supplier_code' },
        )
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['product-supplier-refs', vars.product_id],
      })
    },
  })
}
