'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { Event, CalendarEvent, EventType, ServiceType } from '../types'

export function useEvents() {
  const { data: hotel } = useActiveHotel()

  return useQuery<Event[]>({
    queryKey: ['events', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .neq('status', 'archived')
        .order('event_date', { ascending: true })
      if (error) throw error
      return data as Event[]
    },
  })
}

export function useEvent(eventId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<Event>({
    queryKey: ['event', eventId],
    enabled: !!hotel && !!eventId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId!)
        .eq('hotel_id', hotel!.hotel_id)
        .single()
      if (error) throw error
      return data as Event
    },
  })
}

export function useEventsCalendar(from: string, to: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<CalendarEvent[]>({
    queryKey: ['events-calendar', hotel?.hotel_id, from, to],
    enabled: !!hotel && !!from && !!to,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_events_calendar', {
        p_hotel_id: hotel!.hotel_id,
        p_from: from,
        p_to: to,
      })
      if (error) throw error
      return (data as CalendarEvent[]) ?? []
    },
  })
}

interface CreateEventInput {
  name: string
  event_type: EventType
  service_type: ServiceType
  event_date: string
  guest_count: number
  client_id?: string
  start_time?: string
  end_time?: string
  venue?: string
  notes?: string
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('create_event', {
        p_hotel_id: hotel!.hotel_id,
        p_name: input.name,
        p_event_type: input.event_type,
        p_service_type: input.service_type,
        p_event_date: input.event_date,
        p_guest_count: input.guest_count,
        p_client_id: input.client_id ?? null,
        p_start_time: input.start_time ?? null,
        p_end_time: input.end_time ?? null,
        p_venue: input.venue ?? null,
        p_notes: input.notes ?? null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events-calendar'] })
    },
  })
}

export function useTransitionEvent() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async ({
      eventId,
      newStatus,
      reason,
    }: {
      eventId: string
      newStatus: string
      reason?: string
    }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('transition_event', {
        p_hotel_id: hotel!.hotel_id,
        p_event_id: eventId,
        p_new_status: newStatus,
        p_reason: reason ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events-calendar'] })
      queryClient.invalidateQueries({ queryKey: ['event'] })
    },
  })
}
