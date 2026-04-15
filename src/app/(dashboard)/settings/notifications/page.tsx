'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  useNotificationPreferences,
  useUpsertNotificationPreference,
} from '@/features/notifications/hooks/use-notification-preferences'
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
} from '@/features/notifications/types'
import type { NotificationType } from '@/features/notifications/types'
import { cn } from '@/lib/utils'

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40',
        checked ? 'bg-accent' : 'bg-bg-muted'
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-bg-card shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-1'
        )}
      />
    </button>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function PrefRow({
  type,
  inApp,
  email,
}: {
  type: NotificationType
  inApp: boolean
  email: boolean
}) {
  const upsert = useUpsertNotificationPreference()

  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-3 pr-4 text-sm text-text-primary">
        {NOTIFICATION_TYPE_LABELS[type]}
      </td>
      <td className="py-3 text-center w-24">
        <Toggle
          checked={inApp}
          onChange={(v) => upsert.mutate({ type, inApp: v, email })}
          disabled={upsert.isPending}
        />
      </td>
      <td className="py-3 text-center w-24">
        <Toggle
          checked={email}
          onChange={(v) => upsert.mutate({ type, inApp, email: v })}
          disabled={upsert.isPending}
        />
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NotificationSettingsPage() {
  const { data: prefs, isLoading } = useNotificationPreferences()

  // Construir mapa tipo → prefs para lookup rápido
  const prefMap = new Map(prefs?.map((p) => [p.notification_type, p]))

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-text-primary">Notificaciones</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Elige cómo y cuándo quieres recibir notificaciones.
          </p>
        </div>
      </div>

      {/* Note sobre email */}
      <div className="rounded-lg border border-border bg-bg-card p-4 text-sm text-text-secondary">
        <p>
          <span className="font-medium text-text-primary">Email:</span>{' '}
          Requiere que un administrador configure la clave RESEND_API_KEY en los secrets del
          proyecto Supabase y active el webhook de la tabla{' '}
          <code className="text-xs bg-bg-muted px-1 py-0.5 rounded">notifications</code>.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-bg-muted" />
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-text-muted uppercase tracking-wider w-24">
                  In-App
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-text-muted uppercase tracking-wider w-24">
                  Email
                </th>
              </tr>
            </thead>
            <tbody className="px-4">
              {NOTIFICATION_TYPES.map((type) => {
                const p = prefMap.get(type)
                return (
                  <PrefRow
                    key={type}
                    type={type}
                    inApp={p?.in_app ?? true}
                    email={p?.email ?? false}
                  />
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-text-muted text-center">
        Los cambios se guardan automáticamente.
      </p>
    </div>
  )
}
