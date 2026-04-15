'use client'

import { useActiveAlerts, useDismissAlert, useGenerateDailySnapshot } from '@/features/reporting/hooks/use-alerts'
import {
  ALERT_SEVERITY_COLORS,
  ALERT_SEVERITY_BG,
  ALERT_TYPE_LABELS,
} from '@/features/reporting/types'
import type { Alert } from '@/features/reporting/types'
import { AlertTriangle, Bell, RefreshCw, X, Package, Clock, TrendingUp, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const ALERT_ICONS: Record<string, React.ElementType> = {
  low_stock: Package,
  expiring_soon: Clock,
  cost_overrun: TrendingUp,
  food_cost_high: TrendingUp,
  waste_high: Trash2,
  pending_approvals: AlertTriangle,
  custom: Bell,
}

const ENTITY_LINKS: Record<string, (id: string) => string> = {
  event: (id) => `/events/${id}`,
  product: (id) => `/catalog?product=${id}`,
}

function AlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
  const Icon = ALERT_ICONS[alert.alert_type] ?? Bell
  const entityLink = alert.related_entity_id && alert.related_entity_type
    ? ENTITY_LINKS[alert.related_entity_type]?.(alert.related_entity_id)
    : null

  return (
    <div className={cn(
      'flex items-start gap-4 rounded-lg border p-4',
      ALERT_SEVERITY_BG[alert.severity]
    )}>
      <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', ALERT_SEVERITY_COLORS[alert.severity])} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn('text-sm font-medium', ALERT_SEVERITY_COLORS[alert.severity])}>
              {alert.title}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {ALERT_TYPE_LABELS[alert.alert_type]} ·{' '}
              {new Date(alert.created_at).toLocaleString('es-ES', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary shrink-0"
            title="Descartar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {alert.message && (
          <p className="mt-1.5 text-sm text-text-secondary">{alert.message}</p>
        )}

        {alert.details && alert.alert_type === 'cost_overrun' && (
          <div className="mt-2 flex gap-4 text-xs text-text-muted">
            <span>Teórico: {Number(alert.details.theoretical ?? 0).toFixed(2)} €</span>
            <span>Real: {Number(alert.details.actual ?? 0).toFixed(2)} €</span>
            {alert.details.overrun_pct != null && (
              <span className={ALERT_SEVERITY_COLORS.critical}>
                +{String(alert.details.overrun_pct)}%
              </span>
            )}
          </div>
        )}

        {entityLink && (
          <Link
            href={entityLink}
            className="mt-2 inline-block text-xs text-accent hover:text-accent-hover"
          >
            Ver detalle →
          </Link>
        )}
      </div>
    </div>
  )
}

export default function AlertsPage() {
  const { data: alerts = [], isLoading } = useActiveAlerts()
  const dismiss = useDismissAlert()
  const generateSnapshot = useGenerateDailySnapshot()

  const critical = alerts.filter((a) => a.severity === 'critical')
  const warning = alerts.filter((a) => a.severity === 'warning')
  const info = alerts.filter((a) => a.severity === 'info')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Alertas</h1>
          <p className="text-sm text-text-muted">
            {alerts.length === 0 ? 'Sin alertas activas' : `${alerts.length} alerta${alerts.length !== 1 ? 's' : ''} activa${alerts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => generateSnapshot.mutate()}
          disabled={generateSnapshot.isPending}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', generateSnapshot.isPending && 'animate-spin')} />
          {generateSnapshot.isPending ? 'Generando…' : 'Generar snapshot'}
        </button>
      </div>

      {generateSnapshot.isSuccess && (
        <p className="text-sm text-success">Snapshot generado. Alertas actualizadas.</p>
      )}
      {generateSnapshot.error && (
        <p className="text-sm text-danger">{(generateSnapshot.error as Error).message}</p>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-bg-card" />
          ))}
        </div>
      )}

      {!isLoading && alerts.length === 0 && (
        <div className="rounded-lg border border-border bg-bg-card p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-text-muted" />
          <p className="mt-3 text-text-secondary">Sin alertas activas</p>
          <p className="mt-1 text-xs text-text-muted">
            Pulsa &ldquo;Generar snapshot&rdquo; para revisar el estado actual y detectar alertas.
          </p>
        </div>
      )}

      {!isLoading && critical.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-danger uppercase tracking-wider">
            Críticas ({critical.length})
          </h2>
          {critical.map((a) => (
            <AlertCard key={a.id} alert={a} onDismiss={(id) => dismiss.mutate(id)} />
          ))}
        </section>
      )}

      {!isLoading && warning.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-warning uppercase tracking-wider">
            Avisos ({warning.length})
          </h2>
          {warning.map((a) => (
            <AlertCard key={a.id} alert={a} onDismiss={(id) => dismiss.mutate(id)} />
          ))}
        </section>
      )}

      {!isLoading && info.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-info uppercase tracking-wider">
            Información ({info.length})
          </h2>
          {info.map((a) => (
            <AlertCard key={a.id} alert={a} onDismiss={(id) => dismiss.mutate(id)} />
          ))}
        </section>
      )}
    </div>
  )
}
