'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { AutomationJob, JobLog, JobType } from '../types'

// ── useJobs ──────────────────────────────────────────────────────────────────
// Lista de jobs recientes (últimos 50) para el hotel activo.
// Refresca cada 10s para reflejar cambios de estado del worker.
export function useJobs() {
  const { data: hotel } = useActiveHotel()

  return useQuery<AutomationJob[]>({
    queryKey: ['automation-jobs', hotel?.hotel_id],
    enabled: !!hotel,
    refetchInterval: 10_000,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_pending_jobs', {
        p_hotel_id: hotel!.hotel_id,
        p_limit: 50,
      })
      if (error) throw error
      return (data as AutomationJob[]) ?? []
    },
  })
}

// ── useJobLogs ────────────────────────────────────────────────────────────────
// Logs de un job específico.
// Si isRunning=true, refresca cada 3s para mostrar progreso en tiempo real.
export function useJobLogs(jobId: string | null, isRunning = false) {
  const { data: hotel } = useActiveHotel()

  return useQuery<JobLog[]>({
    queryKey: ['job-logs', jobId],
    enabled: !!hotel && !!jobId,
    refetchInterval: isRunning ? 3_000 : false,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_job_logs', {
        p_hotel_id: hotel!.hotel_id,
        p_job_id: jobId!,
      })
      if (error) throw error
      return (data as JobLog[]) ?? []
    },
  })
}

// ── useEnqueueJob ─────────────────────────────────────────────────────────────
// Encola un job. Devuelve el id del job creado.
export function useEnqueueJob() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async ({
      jobType,
      payload,
      scheduledAt,
    }: {
      jobType: JobType
      payload?: Record<string, unknown>
      scheduledAt?: string
    }): Promise<string> => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('enqueue_job', {
        p_hotel_id: hotel!.hotel_id,
        p_job_type: jobType,
        p_payload: payload ?? {},
        ...(scheduledAt ? { p_scheduled_at: scheduledAt } : {}),
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-jobs'] })
    },
  })
}

// ── useCancelJob ──────────────────────────────────────────────────────────────
// Cancela un job pendiente.
export function useCancelJob() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('cancel_job', {
        p_hotel_id: hotel!.hotel_id,
        p_job_id: jobId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-jobs'] })
    },
  })
}
