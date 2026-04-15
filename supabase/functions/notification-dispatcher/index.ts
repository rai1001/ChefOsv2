// notification-dispatcher — ChefOS v2 Edge Function
// Envía emails de notificación via Resend cuando se inserta una nueva notificación.
//
// Configuración necesaria en Supabase Dashboard:
//   1. Database → Webhooks → New webhook:
//      - Table: notifications, Event: INSERT
//      - URL: https://<project>.supabase.co/functions/v1/notification-dispatcher
//      - Headers: Authorization: Bearer <service_role_key>
//   2. Secrets → Añadir RESEND_API_KEY
//
// Seguridad (Codex audit 2026-04-15):
//   - Verifica Bearer == SUPABASE_SERVICE_ROLE_KEY (idéntico a automation-worker)
//     → sin esto, cualquiera con la URL pública podía forjar notificaciones y
//       usar el dispatcher como relé de phishing con el remitente ChefOS.
//   - safeUrl solo acepta rutas relativas (/...). URLs https externas se rechazan.
//     → elimina phishing via action_url controlado por atacante.
//   - El contenido del email se RECONSTRUYE leyendo la notificación real de DB
//     por id. El payload del webhook se usa ÚNICAMENTE para obtener ese id.
//     → si alguien fuerza la verificación Bearer (p. ej. leak del key), el
//       atacante no puede inyectar title/body/action_url arbitrarios: solo
//       puede disparar emails para notificaciones que existen realmente.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Helpers de seguridad ──────────────────────────────────────────────────────

/** Escapa caracteres HTML para evitar XSS en el cuerpo del email. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Valida que una URL sea segura para incluir en un enlace del email.
 * SOLO se aceptan rutas relativas (/...). URLs absolutas (https://, http://,
 * javascript:, data:, etc.) se rechazan siempre — previene phishing.
 * El link renderizado apunta a APP_BASE_URL + ruta.
 */
function safeUrl(url: string | null, baseUrl: string): string | null {
  if (!url) return null
  if (!url.startsWith('/')) return null
  if (url.startsWith('//')) return null // rechazar protocol-relative
  return `${baseUrl.replace(/\/$/, '')}${url}`
}

interface WebhookPayload {
  type: 'INSERT'
  table: string
  record: {
    id: string
    hotel_id: string
    user_id: string
    notification_type: string
    severity: string
    title: string
    body: string | null
    action_url: string | null
    created_at: string
  }
  old_record: null
  schema: 'public'
}

const SEVERITY_LABELS: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🚨',
}

serve(async (req: Request) => {
  // Solo aceptar POST (webhooks de Supabase)
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // ── AUTH: exigir service_role bearer (patrón de automation-worker) ─────────
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!serviceRoleKey) {
    console.error('[notification-dispatcher] SUPABASE_SERVICE_ROLE_KEY no configurado')
    return new Response('Server misconfigured', { status: 500 })
  }
  const authHeader = req.headers.get('Authorization')
  const expectedToken = `Bearer ${serviceRoleKey}`
  if (!authHeader || authHeader !== expectedToken) {
    return new Response('Unauthorized', { status: 401 })
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    console.warn('[notification-dispatcher] RESEND_API_KEY no configurada — email desactivado')
    return Response.json({ skipped: true, reason: 'no_resend_key' })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey,
  )

  let payload: WebhookPayload
  try {
    payload = await req.json() as WebhookPayload
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (payload.type !== 'INSERT' || payload.table !== 'notifications') {
    return Response.json({ skipped: true, reason: 'irrelevant_event' })
  }

  const notifId = payload.record?.id
  if (!notifId || typeof notifId !== 'string') {
    return new Response('Invalid payload: missing record.id', { status: 400 })
  }

  // ── RECONSTRUIR desde DB: no confiar en payload para contenido sensible ───
  // El payload solo se usa para obtener el id; title/body/action_url/severity
  // se leen de la fila real en la tabla notifications.
  const { data: notif, error: notifErr } = await supabase
    .from('notifications')
    .select('id, hotel_id, user_id, notification_type, severity, title, body, action_url')
    .eq('id', notifId)
    .maybeSingle()

  if (notifErr || !notif) {
    console.error('[notification-dispatcher] Notificación no encontrada:', notifId, notifErr?.message)
    return Response.json({ skipped: true, reason: 'notification_not_found' })
  }

  // Comprobar preferencia de email del usuario (desde DB, no del payload)
  const { data: pref } = await supabase
    .from('notification_preferences')
    .select('email')
    .eq('user_id', notif.user_id)
    .eq('hotel_id', notif.hotel_id)
    .eq('notification_type', notif.notification_type)
    .maybeSingle()

  const emailEnabled = pref?.email === true
  if (!emailEnabled) {
    return Response.json({ skipped: true, reason: 'email_disabled' })
  }

  // Obtener email del usuario
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(notif.user_id)
  if (userError || !userData?.user?.email) {
    console.error('[notification-dispatcher] No se pudo obtener el email del usuario:', userError?.message)
    return Response.json({ skipped: true, reason: 'no_user_email' })
  }

  // Obtener nombre del hotel
  const { data: hotel } = await supabase
    .from('hotels')
    .select('name')
    .eq('id', notif.hotel_id)
    .single()

  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://chefos.app'
  const toEmail = userData.user.email
  const icon = SEVERITY_LABELS[notif.severity] ?? 'ℹ️'
  const hotelName = hotel?.name ?? 'ChefOS'

  // Escapar todo contenido antes de interpolarlo en HTML
  const safeTitle     = escapeHtml(notif.title)
  const safeBody      = notif.body ? escapeHtml(notif.body) : null
  const safeHotel     = escapeHtml(hotelName)
  const safeIcon      = escapeHtml(icon)
  const safeActionUrl = safeUrl(notif.action_url, appBaseUrl)

  // Enviar email via Resend
  const emailBody = {
    from: `ChefOS <noreply@chefos.app>`,
    to: [toEmail],
    subject: `${icon} ${notif.title} — ${hotelName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 8px; font-size: 18px;">${safeIcon} ${safeTitle}</h2>
        ${safeBody ? `<p style="color: #666; margin: 0 0 16px;">${safeBody}</p>` : ''}
        ${safeActionUrl ? `
          <a href="${safeActionUrl}" style="
            display: inline-block; padding: 8px 16px; background: #2563eb;
            color: white; text-decoration: none; border-radius: 6px; font-size: 14px;
          ">Ver detalles</a>
        ` : ''}
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          ${safeHotel} · ChefOS — Puedes gestionar tus preferencias de notificación en la app.
        </p>
      </div>
    `,
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify(emailBody),
  })

  if (!resendRes.ok) {
    const errText = await resendRes.text()
    console.error('[notification-dispatcher] Resend error:', errText)
    return Response.json({ sent: false, error: errText }, { status: 500 })
  }

  const resendData = await resendRes.json()
  return Response.json({ sent: true, email_id: resendData.id })
})
