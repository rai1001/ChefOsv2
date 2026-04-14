'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'

export interface EscandalloIngredient {
  id: string
  ingredient_name: string
  product_id: string | null
  quantity_gross: number
  waste_pct: number
  quantity_net: number
  unit_abbreviation: string | null
  unit_cost: number
  line_cost: number
  latest_gr_cost: number | null
  latest_gr_date: string | null
  latest_gr_receipt: string | null
  latest_gr_delivery_note: string | null
  latest_gr_supplier: string | null
  price_changed: boolean
  price_delta: number | null
  price_delta_pct: number | null
  line_cost_new: number
}

export interface EscandalloData {
  recipe_id: string
  recipe_name: string
  category: string
  servings: number
  status: string
  target_price: number | null
  stored_total_cost: number
  stored_cost_per_serving: number
  stored_food_cost_pct: number
  has_price_changes: boolean
  ingredients: EscandalloIngredient[]
}

export interface SyncChange {
  ingredient: string
  old_cost: number
  new_cost: number
  delta_pct: number | null
}

export interface SyncResult {
  changes_count: number
  changes: SyncChange[]
}

// ─── Recipe escandallo (requires existing recipe) ────────────────────────────

export function useEscandalloLive(recipeId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<EscandalloData>({
    queryKey: ['escandallo-live', hotel?.hotel_id, recipeId],
    enabled: !!hotel && !!recipeId,
    refetchOnWindowFocus: true,
    refetchInterval: 120000, // refresh every 2 min
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_escandallo_live', {
        p_hotel_id:  hotel!.hotel_id,
        p_recipe_id: recipeId!,
      })
      if (error) throw error
      return data as EscandalloData
    },
  })
}

export function useSyncEscandalloPrices() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('sync_escandallo_prices', {
        p_hotel_id:  hotel!.hotel_id,
        p_recipe_id: recipeId,
      })
      if (error) throw error
      return data as SyncResult
    },
    onSuccess: (_, recipeId) => {
      queryClient.invalidateQueries({ queryKey: ['escandallo-live'] })
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

// ─── Catalog prices for the simulator ────────────────────────────────────────

export interface CatalogProductPrice {
  product_id: string
  product_name: string
  sku: string | null
  category: string | null
  unit_abbreviation: string | null
  unit_id: string | null
  latest_gr_cost: number | null
  latest_gr_date: string | null
  latest_gr_supplier: string | null
  offer_price: number | null
  best_price: number | null // latest_gr_cost ?? offer_price ?? null
}

export function useCatalogPrices() {
  const { data: hotel } = useActiveHotel()

  return useQuery<CatalogProductPrice[]>({
    queryKey: ['catalog-prices', hotel?.hotel_id],
    enabled: !!hotel,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_catalog_prices', {
        p_hotel_id: hotel!.hotel_id,
      })
      if (error) throw error
      return (data ?? []) as CatalogProductPrice[]
    },
  })
}
