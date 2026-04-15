// automation-worker — ChefOS v2 Edge Function
// Procesa jobs pendientes de la cola automation_jobs.
// Se invoca via POST (desde Supabase Cron, pg_cron, o llamada HTTP autenticada).
// Usa service_role key → bypasa RLS → puede llamar claim_next_job sin auth.uid().

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ────────────────────────────────────────────────────────────────────────────
// Adaptadores PMS/POS (M12) — importados directamente en Deno
// ────────────────────────────────────────────────────────────────────────────
// Se usan URL relativas a la raíz del proyecto en el bundle de Supabase Functions.
// En despliegue real, se incluirán con --import-map si el proyecto lo configura.
// Aquí usamos stubs inline para mantener el worker sin dependencias externas.

interface OccupancyData {
  date: string; rooms_occupied: number; rooms_total: number
  occupancy_pct: number; guests_in_house: number
  arrivals_today: number; departures_today: number
}
interface SalesData {
  date: string; pos_ticket_id: string; table_ref?: string
  covers: number; total_revenue: number; currency: string
  items: { pos_item_id: string; name: string; quantity: number; unit_price: number; total_price: number }[]
}
interface ConnectionTestResult { success: boolean; latency_ms?: number; message: string }

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

    // ── M12 Integraciones PMS ──────────────────────────────────────────────
    case 'sync_pms': {
      const integrationId = job.payload.integration_id as string
      const syncType      = job.payload.sync_type      as string
      const logId         = job.payload.log_id         as string

      if (!integrationId || !syncType || !logId) {
        throw new Error('sync_pms: integration_id, sync_type y log_id son requeridos')
      }

      return await executePmsSync(supabase, job.hotel_id, integrationId, syncType, logId)
    }

    // ── M12 Integraciones POS ──────────────────────────────────────────────
    case 'sync_pos': {
      const integrationId = job.payload.integration_id as string
      const syncType      = job.payload.sync_type      as string
      const logId         = job.payload.log_id         as string

      if (!integrationId || !syncType || !logId) {
        throw new Error('sync_pos: integration_id, sync_type y log_id son requeridos')
      }

      return await executePosSync(supabase, job.hotel_id, integrationId, syncType, logId)
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

// ============================================================================
// M12 — helpers de sync PMS
// ============================================================================

interface PmsIntegrationRow {
  pms_type:    string
  credentials: Record<string, string>
  config:      Record<string, unknown>
}

async function executePmsSync(
  supabase: ReturnType<typeof createClient>,
  hotelId:       string,
  integrationId: string,
  syncType:      string,
  logId:         string,
): Promise<Record<string, unknown>> {
  // Obtener credenciales con service_role (bypasa RLS)
  const { data: row, error: fetchErr } = await supabase
    .from('pms_integrations')
    .select('pms_type, credentials, config')
    .eq('id', integrationId)
    .eq('hotel_id', hotelId)
    .single()

  if (fetchErr || !row) {
    await closeSyncLog(supabase, logId, 'failed', 0, 0, null, 'Integración PMS no encontrada')
    throw new Error('Integración PMS no encontrada')
  }

  const integration = row as PmsIntegrationRow
  const creds = integration.credentials

  try {
    if (syncType === 'test_connection') {
      const result = await testPmsConnection(integration.pms_type, creds)
      await closeSyncLog(supabase, logId,
        result.success ? 'success' : 'failed', 0, 0,
        { message: result.message, latency_ms: result.latency_ms },
        result.success ? null : result.message,
      )
      return { success: result.success, message: result.message }
    }

    if (syncType === 'sync_occupancy') {
      const today = new Date().toISOString().slice(0, 10)
      const occupancy = await fetchPmsOccupancy(integration.pms_type, creds, today)
      // Almacenar resultado en response_payload del log (no hay tabla destino en M12 aún)
      await closeSyncLog(supabase, logId, 'success', 1, 0, occupancy as unknown as Record<string, unknown>, null)
      return { occupancy }
    }

    if (syncType === 'sync_reservations') {
      const today    = new Date().toISOString().slice(0, 10)
      const nextWeek = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10)
      const reservations = await fetchPmsReservations(integration.pms_type, creds, today, nextWeek)
      await closeSyncLog(supabase, logId, 'success', reservations.length, 0,
        { count: reservations.length }, null)
      return { synced: reservations.length }
    }

    throw new Error(`sync_type desconocido: ${syncType}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await closeSyncLog(supabase, logId, 'failed', 0, 0, null, msg)
    throw err
  }
}

// ============================================================================
// M12 — helpers de sync POS
// ============================================================================

interface PosIntegrationRow {
  pos_type:    string
  credentials: Record<string, string>
  config:      Record<string, unknown>
}

async function executePosSync(
  supabase: ReturnType<typeof createClient>,
  hotelId:       string,
  integrationId: string,
  syncType:      string,
  logId:         string,
): Promise<Record<string, unknown>> {
  const { data: row, error: fetchErr } = await supabase
    .from('pos_integrations')
    .select('pos_type, credentials, config')
    .eq('id', integrationId)
    .eq('hotel_id', hotelId)
    .single()

  if (fetchErr || !row) {
    await closeSyncLog(supabase, logId, 'failed', 0, 0, null, 'Integración POS no encontrada')
    throw new Error('Integración POS no encontrada')
  }

  const integration = row as PosIntegrationRow
  const creds = integration.credentials

  try {
    if (syncType === 'test_connection') {
      const result = await testPosConnection(integration.pos_type, creds)
      await closeSyncLog(supabase, logId,
        result.success ? 'success' : 'failed', 0, 0,
        { message: result.message, latency_ms: result.latency_ms },
        result.success ? null : result.message,
      )
      return { success: result.success, message: result.message }
    }

    if (syncType === 'sync_sales') {
      const today = new Date().toISOString().slice(0, 10)
      const sales = await fetchPosSales(integration.pos_type, creds, today)
      await closeSyncLog(supabase, logId, 'success', sales.length, 0,
        { tickets: sales.length, revenue: sales.reduce((s, t) => s + t.total_revenue, 0) }, null)
      return { synced: sales.length }
    }

    if (syncType === 'push_kitchen_orders') {
      // Obtener comandas KDS pendientes del hotel
      // Columna real en kitchen_order_items: 'title' (no 'product_name')
      const { data: orders } = await supabase
        .from('kitchen_orders')
        .select('id, notes, kitchen_order_items(title, servings)')
        .eq('hotel_id', hotelId)
        .eq('status', 'pending')
        .limit(20)

      const mapped = (orders ?? []).map((o: Record<string, unknown>) => ({
        table_ref: String(o.notes ?? ''),
        items: ((o.kitchen_order_items ?? []) as { title: string; servings: number }[]).map((i) => ({
          name: i.title, quantity: i.servings,
        })),
      }))

      const result = await pushKitchenOrdersToPos(integration.pos_type, creds, mapped)

      // Marcar como 'delivered' las comandas que se enviaron al POS externo
      // para evitar duplicados en la próxima invocación del worker
      if (result.pushed_count > 0) {
        const pushedIds = (orders ?? []).slice(0, result.pushed_count).map(
          (o: Record<string, unknown>) => o.id as string
        )
        await supabase
          .from('kitchen_orders')
          .update({ status: 'delivered' })
          .in('id', pushedIds)
      }

      await closeSyncLog(supabase, logId,
        result.success ? 'success' : 'partial',
        result.pushed_count, mapped.length - result.pushed_count,
        { pushed: result.pushed_count }, null)
      return { pushed: result.pushed_count }
    }

    throw new Error(`sync_type desconocido: ${syncType}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await closeSyncLog(supabase, logId, 'failed', 0, 0, null, msg)
    throw err
  }
}

// ============================================================================
// Cerrar log via RPC (service_role)
// ============================================================================
async function closeSyncLog(
  supabase: ReturnType<typeof createClient>,
  logId:          string,
  status:         string,
  recordsSynced:  number,
  recordsFailed:  number,
  response:       Record<string, unknown> | null,
  error:          string | null,
) {
  await supabase.rpc('mark_sync_complete', {
    p_log_id:         logId,
    p_status:         status,
    p_records_synced: recordsSynced,
    p_records_failed: recordsFailed,
    p_response:       response,
    p_error:          error,
  })
}

// ============================================================================
// Stubs de API por tipo de PMS/POS
// En producción, estos harían llamadas HTTP reales.
// Devuelven datos simulados para que el worker funcione en demo/sandbox.
// ============================================================================

async function testPmsConnection(pmsType: string, creds: Record<string, string>): Promise<ConnectionTestResult> {
  // Demo: simular test de conexión (reemplazar por llamadas reales)
  const hasRequiredKey = pmsType === 'mews'
    ? !!(creds.api_token && creds.property_id)
    : pmsType === 'opera_cloud'
    ? !!(creds.client_id && creds.client_secret)
    : !!(Object.keys(creds).length > 0)

  if (!hasRequiredKey) {
    return { success: false, message: `Credenciales incompletas para ${pmsType}` }
  }
  // Simular latencia de red
  await new Promise((r) => setTimeout(r, 200))
  return { success: true, latency_ms: 200, message: `${pmsType} — credenciales validadas (modo demo)` }
}

async function fetchPmsOccupancy(pmsType: string, _creds: Record<string, string>, date: string): Promise<OccupancyData> {
  await new Promise((r) => setTimeout(r, 100))
  // Datos simulados — reemplazar por llamada real al PMS
  return {
    date,
    rooms_occupied:  Math.floor(Math.random() * 80) + 10,
    rooms_total:     100,
    occupancy_pct:   Math.floor(Math.random() * 60) + 30,
    guests_in_house: Math.floor(Math.random() * 120) + 15,
    arrivals_today:  Math.floor(Math.random() * 20),
    departures_today: Math.floor(Math.random() * 20),
  }
}

async function fetchPmsReservations(_pmsType: string, _creds: Record<string, string>, from: string, _to: string) {
  await new Promise((r) => setTimeout(r, 100))
  return [
    { pms_id: 'demo-1', guest_name: 'Demo Guest', check_in: from, check_out: from, adults: 2, children: 0, room_type: 'DBL', status: 'confirmed' },
  ]
}

async function testPosConnection(posType: string, creds: Record<string, string>): Promise<ConnectionTestResult> {
  const hasRequiredKey = Object.keys(creds).length > 0
  if (!hasRequiredKey) return { success: false, message: `Credenciales vacías para ${posType}` }
  await new Promise((r) => setTimeout(r, 150))
  return { success: true, latency_ms: 150, message: `${posType} — credenciales validadas (modo demo)` }
}

async function fetchPosSales(_posType: string, _creds: Record<string, string>, date: string): Promise<SalesData[]> {
  await new Promise((r) => setTimeout(r, 100))
  return [
    {
      date, pos_ticket_id: 'demo-001', covers: 2, total_revenue: 85.5, currency: 'EUR',
      items: [{ pos_item_id: 'i1', name: 'Menú degustación', quantity: 2, unit_price: 42.75, total_price: 85.5 }],
    },
  ]
}

async function pushKitchenOrdersToPos(
  _posType: string,
  _creds: Record<string, string>,
  orders: { table_ref: string; items: { name: string; quantity: number }[] }[],
): Promise<{ success: boolean; pushed_count: number }> {
  await new Promise((r) => setTimeout(r, 100))
  return { success: true, pushed_count: orders.length }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Job timeout (${ms}ms)`)), ms)
    ),
  ])
}
