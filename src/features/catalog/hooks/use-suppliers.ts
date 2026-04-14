'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { Supplier, SupplierOffer } from '../types'

export function useSuppliers() {
  const { data: hotel } = useActiveHotel()

  return useQuery<Supplier[]>({
    queryKey: ['suppliers', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as Supplier[]
    },
  })
}

export function useSupplier(supplierId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<Supplier>({
    queryKey: ['supplier', supplierId],
    enabled: !!hotel && !!supplierId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId!)
        .eq('hotel_id', hotel!.hotel_id)
        .single()
      if (error) throw error
      return data as Supplier
    },
  })
}

export function useSupplierOffers(supplierId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<SupplierOffer[]>({
    queryKey: ['supplier-offers', supplierId],
    enabled: !!hotel && !!supplierId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('supplier_offers')
        .select('*, product:products(id, name), unit:units_of_measure(id, abbreviation)')
        .eq('supplier_id', supplierId!)
        .eq('hotel_id', hotel!.hotel_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as SupplierOffer[]
    },
  })
}

export function useProductOffers(productId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<SupplierOffer[]>({
    queryKey: ['product-offers', productId],
    enabled: !!hotel && !!productId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('supplier_offers')
        .select('*, supplier:suppliers(id, name), unit:units_of_measure(id, abbreviation)')
        .eq('product_id', productId!)
        .eq('hotel_id', hotel!.hotel_id)
        .order('is_preferred', { ascending: false })
        .order('unit_price', { ascending: true })
      if (error) throw error
      return data as SupplierOffer[]
    },
  })
}

interface CreateSupplierInput {
  name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  tax_id?: string
  payment_terms?: string
  delivery_days?: string[]
  min_order_amount?: number
  notes?: string
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: CreateSupplierInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          hotel_id: hotel!.hotel_id,
          name: input.name,
          contact_name: input.contact_name ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          address: input.address ?? null,
          tax_id: input.tax_id ?? null,
          payment_terms: input.payment_terms ?? null,
          delivery_days: input.delivery_days ?? [],
          min_order_amount: input.min_order_amount ?? null,
          notes: input.notes ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Supplier> & { id: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .eq('hotel_id', hotel!.hotel_id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier', vars.id] })
    },
  })
}

interface AddOfferInput {
  supplier_id: string
  product_id: string
  unit_id?: string
  unit_price: number
  min_quantity?: number
  valid_from?: string
  valid_to?: string
  sku_supplier?: string
  notes?: string
}

export function useAddOffer() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: AddOfferInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('supplier_offers')
        .insert({
          hotel_id: hotel!.hotel_id,
          supplier_id: input.supplier_id,
          product_id: input.product_id,
          unit_id: input.unit_id ?? null,
          unit_price: input.unit_price,
          min_quantity: input.min_quantity ?? null,
          valid_from: input.valid_from ?? null,
          valid_to: input.valid_to ?? null,
          sku_supplier: input.sku_supplier ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-offers', vars.supplier_id] })
      queryClient.invalidateQueries({ queryKey: ['product-offers', vars.product_id] })
    },
  })
}

export function useSetPreferredOffer() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (offerId: string) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('set_preferred_offer', {
        p_hotel_id: hotel!.hotel_id,
        p_offer_id: offerId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-offers'] })
      queryClient.invalidateQueries({ queryKey: ['product-offers'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
