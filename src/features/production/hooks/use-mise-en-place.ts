'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { MiseEnPlaceList, MiseEnPlaceItem } from '../types'

export function useMiseEnPlaceLists(workflowId?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<MiseEnPlaceList[]>({
    queryKey: ['mep-lists', hotel?.hotel_id, workflowId],
    enabled: !!hotel && !!workflowId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('mise_en_place_lists')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .eq('workflow_id', workflowId!)
        .order('department')
      if (error) throw error
      return data as MiseEnPlaceList[]
    },
  })
}

export function useMiseEnPlaceItems(listId?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<MiseEnPlaceItem[]>({
    queryKey: ['mep-items', hotel?.hotel_id, listId],
    enabled: !!hotel && !!listId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('mise_en_place_items')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .eq('list_id', listId!)
        .order('sort_order')
      if (error) throw error
      return data as MiseEnPlaceItem[]
    },
  })
}

export function useMarkMiseEnPlaceItem() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: { item_id: string; is_done: boolean }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('mark_mise_en_place_item', {
        p_hotel_id: hotel!.hotel_id,
        p_item_id: input.item_id,
        p_is_done: input.is_done,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mep-items'] })
      queryClient.invalidateQueries({ queryKey: ['workflow-detail'] })
    },
  })
}
