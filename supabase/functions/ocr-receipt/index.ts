// Edge Function: ocr-receipt
//
// Procesa una foto de albarán con Claude Vision. Tres capas de protección:
//   1. Idempotencia via SHA-256 del file (el cliente lo envía en body.image_hash).
//      Si el mismo hash ya procesó para este order_id, devuelve el GR existente
//      con flag already_processed=true (dedup transparente, sin coste Anthropic).
//   2. Rate limits via consume_rate_limit RPC (2 buckets):
//      - ocr:hotel:{hotel_id}:hour        → 30 req/h/hotel
//      - ocr:user:{user_id}:minute        → 5  req/min/usuario
//      Si alguno deniega, devuelve 429 con Retry-After.
//   3. Backoff exponencial con jitter al llamar a Anthropic (429 + 5xx).
//
// Auth:
//   - Bearer del usuario (RLS) o service_role (worker autónomo).
//
// Input (POST):
// {
//   hotel_id:    uuid,
//   order_id:    uuid,
//   image_path:  string,       // path en bucket delivery-notes
//   image_hash?: string        // SHA-256 hex del file (opcional pero recomendado)
// }
//
// Output:
// {
//   ok:       boolean,
//   already_processed?: boolean,
//   receipt_id?: uuid, lines_processed?, lines_pending?, price_alerts?,
//   error?:   string,
//   ocr_data?: object
// }
//
// Headers de respuesta (siempre que aplica rate limit):
//   X-RateLimit-Limit-Hotel, X-RateLimit-Remaining-Hotel, X-RateLimit-Reset-Hotel
//   Retry-After  (cuando devuelve 429)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const CLAUDE_MODEL      = Deno.env.get('OCR_MODEL') || 'claude-sonnet-4-5-20250929'

// Rate limit config (overridable via env)
const RL_HOTEL_PER_HOUR   = parseInt(Deno.env.get('OCR_RL_HOTEL_HOUR')   ?? '30')
const RL_USER_PER_MINUTE  = parseInt(Deno.env.get('OCR_RL_USER_MINUTE')  ?? '5')

// Anthropic backoff config
const ANTHROPIC_MAX_RETRIES = 3
const ANTHROPIC_MAX_WAIT_MS = 30_000

if (!ANTHROPIC_API_KEY) console.warn('[ocr-receipt] ANTHROPIC_API_KEY no definida')

const OCR_SYSTEM_PROMPT = `Eres un experto extractor de datos de albaranes españoles de proveedores de hostelería.

Recibes una foto/PDF de un albarán y debes devolver un JSON estructurado con la siguiente forma EXACTA:

{
  "supplier_name_detected": string|null,
  "delivery_note_number": string|null,
  "delivery_date": "YYYY-MM-DD"|null,
  "lines": [
    {
      "raw_text": string,
      "product_name_extracted": string,
      "quantity": number,
      "unit": "kg"|"L"|"ud"|"caja"|"l"|"g"|"ml"|null,
      "unit_price": number|null,
      "line_total": number|null,
      "lot_number": string|null,
      "expiry_date": "YYYY-MM-DD"|null
    }
  ],
  "subtotal": number|null,
  "vat_amount": number|null,
  "total": number|null,
  "warnings": string[]
}

REGLAS:
- Devuelve SOLO JSON, sin markdown, sin texto explicativo.
- Si un campo no está claro, usa null. NUNCA inventes datos.
- Normaliza unidades: "kgs"→"kg", "Kg"→"kg", "uds"→"ud", "Lts"→"L", "litros"→"L".
- Si ves "Sin IVA" o "+IVA": precios son sin IVA. Si ves importe total con IVA: separa subtotal y vat.
- Productos compuestos (ej "Pulpo gallego congelado x500g"): product_name_extracted = "Pulpo gallego congelado", quantity = 1, unit = "ud", añade nota en raw_text con el peso.
- Decimales con coma o punto: convierte siempre a punto (8,5 → 8.5).
- Si el albarán es totalmente ilegible o no parece un albarán: devuelve {"lines": [], "warnings": ["documento no es un albarán reconocible"]}`

interface OcrRequest {
  hotel_id:    string
  order_id:    string
  image_path:  string
  image_hash?: string
}

interface RateLimitResult {
  allowed:   boolean
  remaining: number
  reset_at:  string | null
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

type SupabaseRpcClient = ReturnType<typeof createClient>

async function checkRateLimit(
  supa: SupabaseRpcClient,
  key: string,
  maxTokens: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const { data, error } = await supa.rpc('consume_rate_limit', {
    p_key: key,
    p_max_tokens: maxTokens,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    // fail-open: si la BD está caída no bloqueamos el flujo.
    console.error(`[ocr-receipt] rate limit RPC failed (${key}):`, error.message)
    return { allowed: true, remaining: maxTokens, reset_at: null }
  }
  const row = Array.isArray(data) ? data[0] : data
  return row as RateLimitResult
}

async function callAnthropicWithBackoff(
  url: string,
  init: RequestInit,
  maxRetries = ANTHROPIC_MAX_RETRIES,
): Promise<Response> {
  let lastRes: Response | null = null
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, init)
    if (res.ok) return res

    lastRes = res
    const retriable = res.status === 429 || res.status >= 500
    if (!retriable || attempt === maxRetries - 1) return res

    // Respetar Retry-After si viene, si no backoff exponencial con jitter
    const retryAfterHeader = res.headers.get('retry-after')
    let waitMs: number
    if (retryAfterHeader) {
      const retryAfterSec = parseInt(retryAfterHeader)
      waitMs = Number.isFinite(retryAfterSec) ? retryAfterSec * 1000 : 2000
    } else {
      waitMs = Math.min(
        1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 500),
        ANTHROPIC_MAX_WAIT_MS,
      )
    }
    console.log(
      `[ocr-receipt] Anthropic ${res.status}, retry ${attempt + 1}/${maxRetries} in ${waitMs}ms`,
    )
    await new Promise((s) => setTimeout(s, waitMs))
  }
  // Sólo se alcanza si todas las retries fallaron
  return lastRes ?? new Response('unreachable', { status: 500 })
}

function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' })
  }

  let body: OcrRequest
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON body' })
  }

  if (!body.hotel_id || !body.order_id || !body.image_path) {
    return jsonResponse(400, {
      ok: false,
      error: 'Missing hotel_id, order_id or image_path',
    })
  }

  // Enforce storage path convention: {hotel_id}/{filename}.
  // Prevents cross-tenant traversal — service-role createSignedUrl would otherwise
  // access any path regardless of ownership.
  if (!body.image_path.startsWith(`${body.hotel_id}/`)) {
    return jsonResponse(403, { ok: false, error: 'Forbidden: image_path does not belong to hotel' })
  }

  if (!ANTHROPIC_API_KEY) {
    return jsonResponse(500, {
      ok: false,
      error: 'ANTHROPIC_API_KEY not configured in edge function secrets',
    })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const userToken = authHeader.replace('Bearer ', '').trim()

  // Reject requests with no Authorization header — prevents implicit service_role
  // fallback that would let unauthenticated callers hit the early idempotency path.
  if (!userToken) {
    return jsonResponse(401, { ok: false, error: 'Authorization required' })
  }

  const isServiceRole = userToken === SERVICE_ROLE

  // Business-logic client: user JWT (o service_role para workers autónomos).
  // Hereda permisos RLS del usuario para RPCs de negocio (process_ocr_receipt).
  const supabase = createClient(
    SUPABASE_URL!,
    isServiceRole ? SERVICE_ROLE! : userToken,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: isServiceRole
        ? undefined
        : { headers: { Authorization: `Bearer ${userToken}` } },
    },
  )

  // Infrastructure client: service_role para rate limits, idempotency y storage.
  // Estos RPCs se revocan de authenticated (solo service_role puede llamarlos).
  const adminClient = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const storage = adminClient.storage

  // ─── 1. Rate limit por hotel (30 req/h) ──────────────────────────────────
  const hotelKey = `ocr:hotel:${body.hotel_id}:hour`
  const hotelRl = await checkRateLimit(adminClient, hotelKey, RL_HOTEL_PER_HOUR, 3600)

  const rlHeaders: Record<string, string> = {
    'X-RateLimit-Limit-Hotel':     String(RL_HOTEL_PER_HOUR),
    'X-RateLimit-Remaining-Hotel': String(Math.max(0, hotelRl.remaining)),
    ...(hotelRl.reset_at
      ? { 'X-RateLimit-Reset-Hotel': hotelRl.reset_at }
      : {}),
  }

  if (!hotelRl.allowed) {
    const retryAfter = hotelRl.reset_at
      ? Math.max(1, Math.ceil((new Date(hotelRl.reset_at).getTime() - Date.now()) / 1000))
      : 3600
    return jsonResponse(
      429,
      {
        ok: false,
        error: `Rate limit exceeded for this hotel (${RL_HOTEL_PER_HOUR}/hour). Retry after ${retryAfter}s.`,
      },
      { ...rlHeaders, 'Retry-After': String(retryAfter) },
    )
  }

  // ─── 2. Rate limit por usuario (5 req/min) ───────────────────────────────
  let userId: string | null = null
  if (!isServiceRole) {
    const { data: userData } = await supabase.auth.getUser()
    userId = userData?.user?.id ?? null
  }
  if (userId) {
    const userKey = `ocr:user:${userId}:minute`
    const userRl = await checkRateLimit(adminClient, userKey, RL_USER_PER_MINUTE, 60)
    if (!userRl.allowed) {
      const retryAfter = userRl.reset_at
        ? Math.max(1, Math.ceil((new Date(userRl.reset_at).getTime() - Date.now()) / 1000))
        : 60
      return jsonResponse(
        429,
        {
          ok: false,
          error: `You are going too fast (${RL_USER_PER_MINUTE}/min per user). Retry after ${retryAfter}s.`,
        },
        { ...rlHeaders, 'Retry-After': String(retryAfter) },
      )
    }
  }

  // ─── 2b. Membership gate (user callers only) ────────────────────────────
  // Must run before service-role storage access to prevent cross-tenant reads.
  if (!isServiceRole) {
    const { data: isMember } = await supabase.rpc('is_member_of', { p_hotel_id: body.hotel_id })
    if (!isMember) {
      return jsonResponse(403, { ok: false, error: 'Forbidden' }, rlHeaders)
    }
  }

  // ─── 3. Early idempotency check (short-circuit antes de Claude) ──────────
  // Si el cliente pasó image_hash, buscamos GR existente con ese hash+order.
  // Si existe, devolvemos ya — sin coste Anthropic.
  if (body.image_hash) {
    const { data: existingGr } = await adminClient
      .from('goods_receipts')
      .select('id, receipt_number')
      .eq('order_id', body.order_id)
      .eq('delivery_note_image_hash', body.image_hash)
      .maybeSingle()

    if (existingGr) {
      const { data: linesCount } = await adminClient
        .from('goods_receipt_lines')
        .select('ocr_review_status', { count: 'exact', head: false })
        .eq('receipt_id', existingGr.id)

      const all = linesCount ?? []
      const pending = all.filter((l) => l.ocr_review_status === 'pending_review').length
      const unknown = all.filter((l) => l.ocr_review_status === 'product_unknown').length

      return jsonResponse(
        200,
        {
          ok: true,
          already_processed: true,
          receipt_id: existingGr.id,
          receipt_number: existingGr.receipt_number,
          lines_processed: all.length,
          lines_pending_review: pending,
          lines_product_unknown: unknown,
          lines_auto_matched: all.length - pending - unknown,
          price_alerts: 0,
        },
        rlHeaders,
      )
    }
  }

  // ─── 4. Descargar imagen ────────────────────────────────────────────────
  const { data: signed, error: signErr } = await storage
    .from('delivery-notes')
    .createSignedUrl(body.image_path, 60)
  if (signErr || !signed) {
    return jsonResponse(
      404,
      { ok: false, error: `Image not found in storage: ${signErr?.message}` },
      rlHeaders,
    )
  }

  const imgRes = await fetch(signed.signedUrl)
  if (!imgRes.ok) {
    return jsonResponse(
      500,
      { ok: false, error: 'Failed to download image from storage' },
      rlHeaders,
    )
  }
  const imgBytes = new Uint8Array(await imgRes.arrayBuffer())
  const imgBase64 = btoa(String.fromCharCode(...imgBytes))

  const ext = body.image_path.split('.').pop()?.toLowerCase() ?? 'jpeg'
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp',
    pdf: 'application/pdf', heic: 'image/heic',
  }
  const mediaType = mimeMap[ext] || 'image/jpeg'

  // ─── 5. Llamar Claude Vision con backoff ────────────────────────────────
  const claudeRes = await callAnthropicWithBackoff(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: OCR_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imgBase64 } },
            { type: 'text', text: 'Extrae los datos del albarán y devuelve SOLO el JSON con el formato indicado.' },
          ],
        }],
      }),
    },
  )

  if (!claudeRes.ok) {
    const errText = await claudeRes.text()
    return jsonResponse(
      502,
      {
        ok: false,
        error: `Claude API error ${claudeRes.status} after ${ANTHROPIC_MAX_RETRIES} retries: ${errText.slice(0, 300)}`,
      },
      rlHeaders,
    )
  }

  const claudeJson = (await claudeRes.json()) as {
    content: Array<{ type: string; text?: string }>
  }
  const rawText = claudeJson.content.find((c) => c.type === 'text')?.text ?? ''

  // ─── 6. Parsear JSON ─────────────────────────────────────────────────────
  let ocrData: Record<string, unknown>
  try {
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
    ocrData = JSON.parse(cleaned)
  } catch (e) {
    return jsonResponse(
      500,
      {
        ok: false,
        error: `Claude returned non-JSON: ${(e as Error).message}`,
        raw_response: rawText.slice(0, 500),
      },
      rlHeaders,
    )
  }

  // ─── 7. process_ocr_receipt RPC (con hash para idempotencia DB-side) ────
  const imageUrl = `delivery-notes/${body.image_path}`
  const { data: rpcResult, error: rpcErr } = await supabase.rpc('process_ocr_receipt', {
    p_hotel_id: body.hotel_id,
    p_order_id: body.order_id,
    p_ocr_data: ocrData,
    p_image_url: imageUrl,
    p_image_hash: body.image_hash ?? null,
  })

  if (rpcErr) {
    return jsonResponse(
      500,
      {
        ok: false,
        error: `process_ocr_receipt failed: ${rpcErr.message}`,
      },
      rlHeaders,
    )
  }

  return jsonResponse(
    200,
    {
      ok: true,
      ...(rpcResult as Record<string, unknown>),
      ocr_data: ocrData,
    },
    rlHeaders,
  )
})
