'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useStockLevels, useStockAlerts } from '@/features/inventory/hooks/use-stock'
import type { AlertLevel } from '@/features/inventory/types'
import { Package, AlertTriangle, ArrowRightLeft, Trash2, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const ALERT_ICON: Record<AlertLevel, string> = {
  ok: '',
  warning: 'bg-warning',
  low: 'bg-warning',
  critical: 'bg-danger',
}

const ALERT_VARIANT: Record<AlertLevel, 'neutral' | 'warning' | 'urgent'> = {
  ok: 'neutral',
  warning: 'warning',
  low: 'warning',
  critical: 'urgent',
}

const ALERT_LABEL: Record<AlertLevel, string> = {
  ok: 'OK',
  warning: 'Aviso',
  low: 'Bajo',
  critical: 'Crítico',
}

export default function InventoryPage() {
  const { data: levels, isLoading } = useStockLevels()
  const { data: alerts } = useStockAlerts()
  const [filter, setFilter] = useState<'all' | 'alerts'>('all')
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000)

  const displayLevels = filter === 'alerts'
    ? levels?.filter((l) => l.alert_level !== 'ok')
    : levels

  const stats = levels ? {
    total: levels.length,
    ok: levels.filter((l) => l.alert_level === 'ok').length,
    warning: levels.filter((l) => l.alert_level === 'warning' || l.alert_level === 'low').length,
    critical: levels.filter((l) => l.alert_level === 'critical').length,
    totalValue: levels.reduce((sum, l) => sum + (l.total_value || 0), 0),
  } : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-text-primary" style={{ fontSize: '28px' }}>Inventario</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/inventory/waste"
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            <Trash2 className="h-4 w-4" />
            Mermas
          </Link>
          <Link
            href="/inventory/movements"
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Movimientos
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-md border border-border bg-bg-card p-4">
            <p className="kpi-label">Productos en stock</p>
            <p className="kpi-value mt-2">{stats.total}</p>
          </div>
          <div className="rounded-md border border-border bg-bg-card p-4">
            <p className="kpi-label">Valor total</p>
            <p className="kpi-value mt-2">{stats.totalValue.toFixed(2)} <span className="text-base text-text-muted">EUR</span></p>
          </div>
          <div className="status-rail success rounded-r-md bg-bg-card p-4">
            <p className="kpi-label">OK</p>
            <p className="kpi-value mt-2">{stats.ok}</p>
          </div>
          <div className={cn(
            'status-rail rounded-r-md bg-bg-card p-4',
            stats.critical > 0 ? 'urgent' : stats.warning > 0 ? 'warning' : ''
          )}>
            <p className="kpi-label">Alertas</p>
            <p className="kpi-value mt-2">{stats.warning + stats.critical}</p>
          </div>
        </div>
      )}

      {/* Alerts banner */}
      {alerts && alerts.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-medium text-warning">{alerts.length} alertas activas</h3>
          </div>
          <div className="space-y-1">
            {alerts.slice(0, 5).map((alert, i) => (
              <p key={i} className="text-sm text-text-secondary">
                <span className={cn(
                  'inline-block w-2 h-2 rounded-full mr-2',
                  alert.severity === 'critical' ? 'bg-danger' : alert.severity === 'warning' ? 'bg-warning' : 'bg-info'
                )} />
                <span className="font-medium">{alert.product_name}</span>
                {alert.type === 'low_stock' && (
                  <span> — Stock: {alert.current_stock} (min: {alert.reorder_point ?? alert.min_stock})</span>
                )}
                {alert.type === 'expiry' && (
                  <span> — Caduca: {new Date(alert.expiry_date!).toLocaleDateString('es-ES')} ({alert.quantity} uds)</span>
                )}
              </p>
            ))}
            {alerts.length > 5 && (
              <p className="text-xs text-text-muted">+{alerts.length - 5} mas</p>
            )}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm',
            filter === 'all' ? 'bg-accent/10 text-accent font-medium' : 'text-text-muted hover:text-text-primary'
          )}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('alerts')}
          className={cn(
            'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm',
            filter === 'alerts' ? 'bg-accent/10 text-accent font-medium' : 'text-text-muted hover:text-text-primary'
          )}
        >
          <TrendingDown className="h-3.5 w-3.5" />
          Solo alertas
        </button>
      </div>

      {/* Stock levels table */}
      <div className="rounded-lg border border-border bg-bg-card">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
                <div className="h-4 w-32 skeleton" />
                <div className="h-4 w-20 skeleton" />
                <div className="h-4 w-16 skeleton" />
              </div>
            ))}
          </div>
        ) : !displayLevels || displayLevels.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-text-muted" />
            <p className="mt-3 text-text-secondary">
              {filter === 'alerts' ? 'No hay alertas de stock' : 'No hay stock registrado'}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              El stock se crea automaticamente al recibir mercancia
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-text-muted" style={{ borderColor: 'var(--border-strong)', fontFamily: 'var(--font-code)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 text-right font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Caducidad</th>
                <th className="px-4 py-3 text-right font-medium">Lotes</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {displayLevels.map((level) => {
                const variant = ALERT_VARIANT[level.alert_level]
                return (
                  <tr
                    key={level.product_id}
                    className={cn(
                      'status-rail border-b border-border last:border-0 hover:bg-bg-hover',
                      variant
                    )}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventory/product/${level.product_id}`}
                        className="font-medium text-text-primary hover:text-accent"
                      >
                        {level.product_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {level.category_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary text-right font-data">
                      {Number(level.current_stock).toFixed(2)}
                      {level.unit && <span className="ml-1 text-text-muted">{level.unit}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary text-right font-data">
                      {level.total_value > 0 ? Number(level.total_value).toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-data">
                      {level.earliest_expiry ? (
                        <span className={cn(
                          new Date(level.earliest_expiry) <= now ? 'text-danger font-medium' :
                          new Date(level.earliest_expiry) <= threeDaysFromNow ? 'text-warning' :
                          'text-text-secondary'
                        )}>
                          {new Date(level.earliest_expiry).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted text-right font-data">
                      {level.lot_count}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge-status', variant)}>
                        {ALERT_LABEL[level.alert_level]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
