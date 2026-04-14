'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { ProductionPlan, ProductionPlanItem, ProductionSummary, PlanStatus, PlanItemStatus } from '../types'

export function useProductionPlans() {
  const { data: hotel } = useActiveHotel()

  return useQuery<ProductionPlan[]>({
    queryKey: ['production-plans', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('production_plans')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .order('plan_date', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as ProductionPlan[]
    },
  })
}

export function useProductionPlan(planId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<ProductionPlan & { items: ProductionPlanItem[] }>({
    queryKey: ['production-plan', planId],
    enabled: !!hotel && !!planId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('production_plans')
        .select('*, items:production_plan_items(*, recipe:recipes(id, name, category), event:events(id, name))')
        .eq('id', planId!)
        .eq('hotel_id', hotel!.hotel_id)
        .single()
      if (error) throw error
      return data as ProductionPlan & { items: ProductionPlanItem[] }
    },
  })
}

export function useProductionSummary(date: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<ProductionSummary>({
    queryKey: ['production-summary', hotel?.hotel_id, date],
    enabled: !!hotel && !!date,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_production_summary', {
        p_hotel_id: hotel!.hotel_id,
        p_date: date,
      })
      if (error) throw error
      return data as ProductionSummary
    },
  })
}

export function useGeneratePlan() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (date: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('generate_production_plan', {
        p_hotel_id: hotel!.hotel_id,
        p_date: date,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-plans'] })
      queryClient.invalidateQueries({ queryKey: ['production-summary'] })
    },
  })
}

export function useTransitionPlan() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async ({ planId, newStatus }: { planId: string; newStatus: PlanStatus }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('transition_production_plan', {
        p_hotel_id: hotel!.hotel_id,
        p_plan_id: planId,
        p_new_status: newStatus,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-plans'] })
      queryClient.invalidateQueries({ queryKey: ['production-plan'] })
      queryClient.invalidateQueries({ queryKey: ['production-summary'] })
    },
  })
}

export function useTransitionPlanItem() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async ({ itemId, newStatus }: { itemId: string; newStatus: PlanItemStatus }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('transition_plan_item', {
        p_hotel_id: hotel!.hotel_id,
        p_item_id: itemId,
        p_new_status: newStatus,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-plan'] })
      queryClient.invalidateQueries({ queryKey: ['production-summary'] })
    },
  })
}
