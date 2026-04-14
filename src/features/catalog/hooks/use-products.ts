'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { Product, Category, StorageType } from '../types'

export function useCategories() {
  const { data: hotel } = useActiveHotel()

  return useQuery<Category[]>({
    queryKey: ['categories', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data as Category[]
    },
  })
}

export function useProducts(filters?: {
  category_id?: string
  search?: string
  active_only?: boolean
}) {
  const { data: hotel } = useActiveHotel()

  return useQuery<Product[]>({
    queryKey: ['products', hotel?.hotel_id, filters],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('products')
        .select('*, category:categories(id, name), default_unit:units_of_measure(id, abbreviation)')
        .eq('hotel_id', hotel!.hotel_id)
        .order('name')

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id)
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }
      if (filters?.active_only !== false) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Product[]
    },
  })
}

export function useProduct(productId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<Product>({
    queryKey: ['product', productId],
    enabled: !!hotel && !!productId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(id, name), default_unit:units_of_measure(id, abbreviation)')
        .eq('id', productId!)
        .eq('hotel_id', hotel!.hotel_id)
        .single()
      if (error) throw error
      return data as Product
    },
  })
}

interface CreateProductInput {
  name: string
  category_id?: string
  description?: string
  sku?: string
  default_unit_id?: string
  min_stock?: number
  max_stock?: number
  reorder_point?: number
  allergens?: string[]
  storage_type?: StorageType
  shelf_life_days?: number
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products')
        .insert({
          hotel_id: hotel!.hotel_id,
          name: input.name,
          category_id: input.category_id ?? null,
          description: input.description ?? null,
          sku: input.sku ?? null,
          default_unit_id: input.default_unit_id ?? null,
          min_stock: input.min_stock ?? null,
          max_stock: input.max_stock ?? null,
          reorder_point: input.reorder_point ?? null,
          allergens: input.allergens ?? [],
          storage_type: input.storage_type ?? 'ambient',
          shelf_life_days: input.shelf_life_days ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .eq('hotel_id', hotel!.hotel_id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', vars.id] })
    },
  })
}
