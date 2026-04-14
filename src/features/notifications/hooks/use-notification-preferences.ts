'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { NotificationPreference, NotificationType } from '../types'

export function useNotificationPreferences() {
  const { data: hotel } = useActiveHotel()

  return useQuery<NotificationPreference[]>({
    queryKey: ['notification-preferences', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_notification_preferences', {
        p_hotel_id: hotel!.hotel_id,
      })
      if (error) throw error
      return (data as NotificationPreference[]) ?? []
    },
  })
}

export function useUpsertNotificationPreference() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async ({
      type,
      inApp,
      email,
    }: {
      type: NotificationType
      inApp: boolean
      email: boolean
    }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('upsert_notification_preference', {
        p_hotel_id: hotel!.hotel_id,
        p_type: type,
        p_in_app: inApp,
        p_email: email,
      })
      if (error) throw error
    },
    onMutate: async ({ type, inApp, email }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['notification-preferences'] })
      const prev = queryClient.getQueryData<NotificationPreference[]>(
        ['notification-preferences', hotel?.hotel_id]
      )
      queryClient.setQueryData<NotificationPreference[]>(
        ['notification-preferences', hotel?.hotel_id],
        (old) => old?.map((p) =>
          p.notification_type === type ? { ...p, in_app: inApp, email } : p
        ) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(
          ['notification-preferences', hotel?.hotel_id],
          ctx.prev
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })
}
