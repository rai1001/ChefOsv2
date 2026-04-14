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
// El dispatcher comprueba las notification_preferences del usuario antes de enviar.

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
 * Valida que una URL sea segura para incluir en un enlace.
 * Solo se aceptan rutas relativas (/...) y URLs https absolutas.
 * Rechaza javascript:, data: y cualquier otra cosa.
 */
function safeUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('/') || url.startsWith('https://')) return url
  return null
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

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    console.warn('[notification-dispatcher] RESEND_API_KEY no configurada — email desactivado')
    return Response.json({ skipped: true, reason: 'no_resend_key' })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

  const notif = payload.record

  // Comprobar preferencia de email del usuario
  const { data: pref } = await supabase
    .from('notification_preferences')
    .select('email')
    .eq('user_id', notif.user_id)
    .eq('hotel_id', notif.hotel_id)
    .eq('notification_type', notif.notification_type)
    .maybeSingle()

  // Default: email=false si no hay preferencia explícita
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

  const toEmail = userData.user.email
  const icon = SEVERITY_LABELS[notif.severity] ?? 'ℹ️'
  const hotelName = hotel?.name ?? 'ChefOS'

  // Escapar todo contenido de usuario antes de interpolarlo en HTML
  const safeTitle    = escapeHtml(notif.title)
  const safeBody     = notif.body ? escapeHtml(notif.body) : null
  const safeHotel    = escapeHtml(hotelName)
  const safeIcon     = escapeHtml(icon)
  const safeActionUrl = safeUrl(notif.action_url)

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
