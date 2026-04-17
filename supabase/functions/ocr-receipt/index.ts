// Edge Function: ocr-receipt
//
// Procesa una foto de albarán con Claude Vision (claude-sonnet-4-6).
// Devuelve JSON estructurado con líneas y luego llama a process_ocr_receipt RPC.
//
// Auth:
//   - Bearer del usuario (RLS) o service_role (worker autónomo).
//   - Si llega como worker (job), pasa user_token = "service_role" y se ejecuta como tal.
//
// Input (POST):
// {
//   hotel_id: uuid,
//   order_id: uuid,
//   image_path: string  // path en bucket delivery-notes, ej "{hotel}/{receipt}-{ts}.jpg"
// }
//
// Output:
// {
//   ok: boolean,
//   receipt_id?: uuid, lines_processed?, lines_pending?, price_alerts?,
//   error?: string,
//   ocr_data?: object  // raw para debug
// }

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const CLAUDE_MODEL = Deno.env.get('OCR_MODEL') || 'claude-sonnet-4-5-20250929'

if (!ANTHROPIC_API_KEY) console.warn('[ocr-receipt] ANTHROPIC_API_KEY no definida')

const OCR_SYSTEM_PROMPT = `Eres un experto extractor de datos de albaranes españoles de proveedores de hostelería.

Recibes una foto/PDF de un albarán y debes devolver un JSON estructurado con la siguiente forma EXACTA:

{
  "supplier_name_detected": string|null,
  "delivery_note_number": string|null,
  "delivery_date": "YYYY-MM-DD"|null,
  "lines": [
    {
      "raw_text": string,                    // texto original tal cual aparece
      "product_name_extracted": string,      // nombre del producto normalizado
      "quantity": number,
      "unit": "kg"|"L"|"ud"|"caja"|"l"|"g"|"ml"|null,
      "unit_price": number|null,             // EUR por unidad, sin IVA
      "line_total": number|null,             // EUR total línea, sin IVA
      "lot_number": string|null,             // L-XXX, lote, batch
      "expiry_date": "YYYY-MM-DD"|null
    }
  ],
  "subtotal": number|null,
  "vat_amount": number|null,
  "total": number|null,
  "warnings": string[]                       // ["línea 3 ilegible", ...]
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
  hotel_id: string
  order_id: string
  image_path: string
}

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
    return jsonResponse(400, { ok: false, error: 'Missing hotel_id, order_id or image_path' })
  }

  if (!ANTHROPIC_API_KEY) {
    return jsonResponse(500, { ok: false, error: 'ANTHROPIC_API_KEY not configured in edge function secrets' })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const userToken = authHeader.replace('Bearer ', '').trim()

  // Cliente con el JWT del usuario para que el RPC herede sus permisos (membership check)
  const supabase = createClient(
    SUPABASE_URL!,
    userToken && userToken !== SERVICE_ROLE ? userToken : SERVICE_ROLE!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: userToken && userToken !== SERVICE_ROLE
        ? { headers: { Authorization: `Bearer ${userToken}` } }
        : undefined,
    }
  )

  // Cliente service_role solo para Storage (no necesita auth de usuario)
  const storage = createClient(SUPABASE_URL!, SERVICE_ROLE!).storage

  // 1. Descargar imagen
  const { data: signed, error: signErr } = await storage
    .from('delivery-notes')
    .createSignedUrl(body.image_path, 60)
  if (signErr || !signed) {
    return jsonResponse(404, { ok: false, error: `Image not found in storage: ${signErr?.message}` })
  }

  const imgRes = await fetch(signed.signedUrl)
  if (!imgRes.ok) {
    return jsonResponse(500, { ok: false, error: 'Failed to download image from storage' })
  }
  const imgBytes = new Uint8Array(await imgRes.arrayBuffer())
  const imgBase64 = btoa(String.fromCharCode(...imgBytes))

  // Detectar mime type por extensión
  const ext = body.image_path.split('.').pop()?.toLowerCase() ?? 'jpeg'
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp',
    pdf: 'application/pdf', heic: 'image/heic',
  }
  const mediaType = mimeMap[ext] || 'image/jpeg'

  // 2. Llamar Claude Vision
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
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
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imgBase64 },
          },
          {
            type: 'text',
            text: 'Extrae los datos del albarán y devuelve SOLO el JSON con el formato indicado.',
          },
        ],
      }],
    }),
  })

  if (!claudeRes.ok) {
    const errText = await claudeRes.text()
    return jsonResponse(502, { ok: false, error: `Claude API error: ${claudeRes.status} ${errText.slice(0, 300)}` })
  }

  const claudeJson = await claudeRes.json() as {
    content: Array<{ type: string; text?: string }>
  }
  const rawText = claudeJson.content.find((c) => c.type === 'text')?.text ?? ''

  // 3. Parsear JSON (Claude a veces envuelve en ```json ... ```)
  let ocrData: Record<string, unknown>
  try {
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
    ocrData = JSON.parse(cleaned)
  } catch (e) {
    return jsonResponse(500, {
      ok: false,
      error: `Claude returned non-JSON: ${(e as Error).message}`,
      raw_response: rawText.slice(0, 500),
    })
  }

  // 4. Llamar a process_ocr_receipt RPC
  const imageUrl = `delivery-notes/${body.image_path}`
  const { data: rpcResult, error: rpcErr } = await supabase.rpc('process_ocr_receipt', {
    p_hotel_id: body.hotel_id,
    p_order_id: body.order_id,
    p_ocr_data: ocrData,
    p_image_url: imageUrl,
  })

  if (rpcErr) {
    return jsonResponse(500, {
      ok: false,
      error: `process_ocr_receipt failed: ${rpcErr.message}`,
      ocr_data: ocrData,
    })
  }

  return jsonResponse(200, {
    ok: true,
    ...(rpcResult as Record<string, unknown>),
    ocr_data: ocrData,
  })
})

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
