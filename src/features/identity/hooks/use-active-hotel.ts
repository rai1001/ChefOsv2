'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Role, UXProfile } from '../types'
import { ROLE_TO_PROFILE } from '../types'

export interface ActiveHotel {
  membership_id: string
  hotel_id: string
  hotel_name: string
  hotel_slug: string
  timezone: string
  currency: string
  role: Role
  tenant_id: string
}

export interface UserHotel {
  membership_id: string
  hotel_id: string
  hotel_name: string
  hotel_slug: string
  role: Role
  is_default: boolean
}

export function useActiveHotel() {
  return useQuery<ActiveHotel>({
    queryKey: ['active-hotel'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_active_hotel')
      if (error) throw error
      return data as ActiveHotel
    },
  })
}

export function useUserHotels() {
  return useQuery<UserHotel[]>({
    queryKey: ['user-hotels'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_user_hotels')
      if (error) throw error
      return (data as UserHotel[]) ?? []
    },
  })
}

export function useSwitchHotel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (hotelId: string) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('switch_active_hotel', {
        p_hotel_id: hotelId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-hotel'] })
      queryClient.invalidateQueries({ queryKey: ['user-hotels'] })
      // Invalidar todo lo que dependa del hotel
      queryClient.invalidateQueries()
    },
  })
}

export function useUXProfile(): UXProfile | undefined {
  const { data } = useActiveHotel()
  if (!data) return undefined
  return ROLE_TO_PROFILE[data.role]
}
