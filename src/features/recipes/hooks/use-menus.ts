'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { Menu, MenuType } from '../types'

export function useMenus() {
  const { data: hotel } = useActiveHotel()

  return useQuery<Menu[]>({
    queryKey: ['menus', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as Menu[]
    },
  })
}

interface CreateMenuInput {
  name: string
  menu_type: MenuType
  description?: string
  is_template?: boolean
  target_food_cost_pct?: number
  notes?: string
}

export function useCreateMenu() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: CreateMenuInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('menus')
        .insert({
          hotel_id: hotel!.hotel_id,
          name: input.name,
          menu_type: input.menu_type,
          description: input.description ?? null,
          is_template: input.is_template ?? false,
          target_food_cost_pct: input.target_food_cost_pct ?? null,
          notes: input.notes ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] })
    },
  })
}
