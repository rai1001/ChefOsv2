'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { Client } from '../types'

export function useClients() {
  const { data: hotel } = useActiveHotel()

  return useQuery<Client[]>({
    queryKey: ['clients', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as Client[]
    },
  })
}

interface CreateClientInput {
  name: string
  company?: string
  contact_person?: string
  email?: string
  phone?: string
  notes?: string
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: CreateClientInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clients')
        .insert({
          hotel_id: hotel!.hotel_id,
          ...input,
        })
        .select()
        .single()
      if (error) throw error
      return data as Client
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
