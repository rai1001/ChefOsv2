'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import { useCurrentUser } from '@/features/identity/hooks/use-auth'
import type { Notification } from '../types'

// ── useNotificationCount ──────────────────────────────────────────────────────
// Número de notificaciones no leídas — usado para el badge del topbar.
export function useNotificationCount() {
  const { data: hotel } = useActiveHotel()

  return useQuery<number>({
    queryKey: ['notifications-count', hotel?.hotel_id],
    enabled: !!hotel,
    refetchInterval: 60_000, // fallback poll cada minuto (Realtime cubre el resto)
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_notification_count', {
        p_hotel_id: hotel!.hotel_id,
      })
      if (error) throw error
      return (data as number) ?? 0
    },
  })
}

// ── useNotifications ──────────────────────────────────────────────────────────
// Últimas 20 notificaciones para el dropdown.
export function useNotifications(limit = 20) {
  const { data: hotel } = useActiveHotel()

  return useQuery<Notification[]>({
    queryKey: ['notifications', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_unread_notifications', {
        p_hotel_id: hotel!.hotel_id,
        p_limit: limit,
      })
      if (error) throw error
      return (data as Notification[]) ?? []
    },
  })
}

// ── useMarkRead ───────────────────────────────────────────────────────────────
export function useMarkRead() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('mark_notification_read', {
        p_hotel_id: hotel!.hotel_id,
        p_notification_id: notificationId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// ── useMarkAllRead ────────────────────────────────────────────────────────────
export function useMarkAllRead() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('mark_all_notifications_read', {
        p_hotel_id: hotel!.hotel_id,
      })
      if (error) throw error
      return data as number
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// ── useNotificationRealtime ───────────────────────────────────────────────────
// Suscripción Realtime a la tabla notifications.
// Invalida caché cuando llega una nueva notificación para el usuario activo.
// REQUISITO: habilitar Realtime en la tabla `notifications` en Supabase Dashboard
//   → Database → Replication → Source tables → añadir `notifications`
export function useNotificationRealtime() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()
  const { data: user } = useCurrentUser()

  useEffect(() => {
    if (!hotel || !user) return

    const supabase = createClient()

    const channel = supabase
      .channel(`notifications-${hotel.hotel_id}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications-count', hotel.hotel_id] })
          queryClient.invalidateQueries({ queryKey: ['notifications', hotel.hotel_id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hotel?.hotel_id, user?.id, queryClient])
}
