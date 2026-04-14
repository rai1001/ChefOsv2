'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck, Settings } from 'lucide-react'
import {
  useNotificationCount,
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useNotificationRealtime,
} from '@/features/notifications/hooks/use-notifications'
import {
  NOTIFICATION_SEVERITY_DOT,
  NOTIFICATION_SEVERITY_COLORS,
} from '@/features/notifications/types'
import { cn } from '@/lib/utils'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `${min}min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function NotificationBell({ hotelId }: { hotelId: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: count = 0 } = useNotificationCount()
  const { data: notifications = [], isLoading } = useNotifications(15)
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()

  // Activar Realtime — mantiene el badge sincronizado sin polling
  useNotificationRealtime()

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleNotificationClick(id: string) {
    markRead.mutate(id)
    setOpen(false)
  }

  function handleMarkAll() {
    markAll.mutate()
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button + badge */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        aria-label="Notificaciones"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-lg border border-border bg-bg-card shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-sm font-medium text-text-primary">
              Notificaciones
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-danger/15 px-1.5 py-0.5 text-xs font-semibold text-danger">
                  {count}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button
                  onClick={handleMarkAll}
                  disabled={markAll.isPending}
                  title="Marcar todas como leídas"
                  className="rounded p-1 text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-50"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <Link
                href="/settings/notifications"
                onClick={() => setOpen(false)}
                title="Preferencias"
                className="rounded p-1 text-text-muted hover:text-text-primary hover:bg-bg-hover"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-bg-muted" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">
                Sin notificaciones
              </div>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    {n.action_url ? (
                      <Link
                        href={n.action_url}
                        onClick={() => handleNotificationClick(n.id)}
                        className={cn(
                          'flex items-start gap-2.5 px-3 py-2.5 text-left w-full hover:bg-bg-hover transition-colors',
                          !n.is_read && 'bg-bg-muted/50'
                        )}
                      >
                        <NotifDot severity={n.severity} read={n.is_read} />
                        <NotifContent title={n.title} body={n.body} time={n.created_at} severity={n.severity} />
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleNotificationClick(n.id)}
                        className={cn(
                          'flex items-start gap-2.5 px-3 py-2.5 text-left w-full hover:bg-bg-hover transition-colors',
                          !n.is_read && 'bg-bg-muted/50'
                        )}
                      >
                        <NotifDot severity={n.severity} read={n.is_read} />
                        <NotifContent title={n.title} body={n.body} time={n.created_at} severity={n.severity} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-3 py-2">
              <Link
                href="/settings/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Gestionar preferencias →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotifDot({ severity, read }: { severity: string; read: boolean }) {
  return (
    <span className="mt-1 shrink-0 relative flex h-2 w-2">
      {!read && (
        <span
          className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-50',
            NOTIFICATION_SEVERITY_DOT[severity as keyof typeof NOTIFICATION_SEVERITY_DOT] ?? 'bg-info'
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex h-2 w-2 rounded-full',
          read
            ? 'bg-bg-muted'
            : (NOTIFICATION_SEVERITY_DOT[severity as keyof typeof NOTIFICATION_SEVERITY_DOT] ?? 'bg-info')
        )}
      />
    </span>
  )
}

function NotifContent({
  title, body, time, severity,
}: {
  title: string
  body: string | null
  time: string
  severity: string
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className={cn(
        'text-sm font-medium leading-tight truncate',
        NOTIFICATION_SEVERITY_COLORS[severity as keyof typeof NOTIFICATION_SEVERITY_COLORS] ?? 'text-text-primary'
      )}>
        {title}
      </p>
      {body && (
        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{body}</p>
      )}
      <p className="text-xs text-text-muted/60 mt-0.5">{relativeTime(time)}</p>
    </div>
  )
}
