// automation-worker — ChefOS v2 Edge Function
// Procesa jobs pendientes de la cola automation_jobs.
// Se invoca via POST (desde Supabase Cron, pg_cron, o llamada HTTP autenticada).
// Usa service_role key → bypasa RLS → puede llamar claim_next_job sin auth.uid().

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_CONCURRENT = 3
const JOB_TIMEOUT_MS = 30_000 // 30 segundos por job

interface Job {
  id: string
  hotel_id: string
  job_type: string
  payload: Record<string, unknown>
  attempts: number
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Verificar token exacto para invocaciones externas.
  // El caller (pg_cron / Supabase Cron) debe enviar el service_role key.
  const authHeader = req.headers.get('Authorization')
  const expectedToken = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`
  if (!authHeader || authHeader !== expectedToken) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const workerId = `worker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  // Procesar hasta MAX_CONCURRENT jobs en paralelo
  const slots = Array.from({ length: MAX_CONCURRENT }, (_, i) =>
    processNextJob(supabase, `${workerId}-${i}`)
  )

  const results = await Promise.allSettled(slots)
  const processed = results.filter(
    (r) => r.status === 'fulfilled' && r.value === true
  ).length
  const errors = results.filter((r) => r.status === 'rejected').length

  return Response.json({ processed, errors, workerId })
})

async function processNextJob(
  supabase: ReturnType<typeof createClient>,
  workerId: string
): Promise<boolean> {
  const { data: jobs, error: claimError } = await supabase.rpc('claim_next_job', {
    p_worker_id: workerId,
  })

  if (claimError) {
    console.error(`[${workerId}] Error al reclamar job:`, claimError.message)
    return false
  }

  if (!jobs || jobs.length === 0) {
    return false
  }

  const job = jobs[0] as Job

  try {
    const result = await withTimeout(executeJob(supabase, job), JOB_TIMEOUT_MS)

    const { error: completeError } = await supabase.rpc('complete_job', {
      p_job_id: job.id,
      p_result: result ?? null,
    })

    if (completeError) {
      console.error(`[${workerId}] Error al completar job ${job.id}:`, completeError.message)
    }

    return true
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[${workerId}] Job ${job.id} (${job.job_type}) falló:`, errorMsg)

    await supabase.rpc('fail_job', {
      p_job_id: job.id,
      p_error: errorMsg,
      p_retry: true,
    })

    return false
  }
}

async function executeJob(
  supabase: ReturnType<typeof createClient>,
  job: Job
): Promise<Record<string, unknown> | null> {
  switch (job.job_type) {
    case 'generate_workflow': {
      const eventId = job.payload.event_id as string
      if (!eventId) throw new Error('payload.event_id requerido')

      const { data, error } = await supabase.rpc('generate_event_workflow', {
        p_hotel_id: job.hotel_id,
        p_event_id: eventId,
      })
      if (error) throw new Error(error.message)
      return { workflow_id: data }
    }

    case 'generate_shopping_list': {
      const date = job.payload.date as string
      if (!date) throw new Error('payload.date requerido')

      const { error } = await supabase.rpc('generate_shopping_list', {
        p_hotel_id: job.hotel_id,
        p_date: date,
      })
      if (error) throw new Error(error.message)
      return { date }
    }

    case 'generate_snapshot': {
      const { data, error } = await supabase.rpc('generate_daily_snapshot', {
        p_hotel_id: job.hotel_id,
      })
      if (error) throw new Error(error.message)
      return { snapshot_id: data as string }
    }

    case 'reserve_stock': {
      const eventId = job.payload.event_id as string
      if (!eventId) throw new Error('payload.event_id requerido')

      const { error } = await supabase.rpc('reserve_stock_for_event', {
        p_hotel_id: job.hotel_id,
        p_event_id: eventId,
      })
      if (error) throw new Error(error.message)
      return { event_id: eventId }
    }

    case 'calculate_cost': {
      const eventId = job.payload.event_id as string
      if (!eventId) throw new Error('payload.event_id requerido')

      const { error } = await supabase.rpc('calculate_event_cost_estimate', {
        p_hotel_id: job.hotel_id,
        p_event_id: eventId,
      })
      if (error) throw new Error(error.message)
      return { event_id: eventId }
    }

    case 'send_notification':
      // M14 Notificaciones — implementado en Etapa 2.4
      console.warn(`[automation-worker] job_type 'send_notification' no implementado aún`)
      return { skipped: true, reason: 'pending M14' }

    case 'export_pdf':
      // M10 Documentos — los PDFs se generan client-side con react-pdf
      console.warn(`[automation-worker] job_type 'export_pdf' no implementado aún`)
      return { skipped: true, reason: 'client-side rendering' }

    default:
      throw new Error(`Tipo de job no soportado: ${job.job_type}`)
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Job timeout (${ms}ms)`)), ms)
    ),
  ])
}
