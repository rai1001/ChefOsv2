'use client'

import { useState } from 'react'
import { useFoodCostByEvent, useFoodCostByService, useCostVarianceReport } from '@/features/reporting/hooks/use-kpis'
import { SERVICE_TYPE_LABELS } from '@/features/commercial/types'
import type { FoodCostByEvent, FoodCostByService, CostVarianceRow } from '@/features/reporting/types'
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIso(d: Date) {
  return d.toISOString().slice(0, 10)
}

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return { from: toIso(from), to: toIso(to) }
}

function fmtEur(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €'
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
}

function VarianceBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-text-muted">—</span>
  const isOver = pct > 0
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-sm font-medium',
      isOver ? 'text-danger' : 'text-success'
    )}>
      {isOver ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {fmtPct(pct)}
    </span>
  )
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function FoodCostByEventTable({ from, to }: { from: string; to: string }) {
  const { data = [], isLoading } = useFoodCostByEvent(from, to)

  if (isLoading) return <div className="h-40 skeleton rounded" />

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-card p-8 text-center">
        <p className="text-text-muted text-sm">Sin eventos con datos de coste en el período seleccionado.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">Evento</th>
            <th className="text-right px-4 py-3 font-medium">Fecha</th>
            <th className="text-right px-4 py-3 font-medium">Pax</th>
            <th className="text-right px-4 py-3 font-medium">Coste teórico</th>
            <th className="text-right px-4 py-3 font-medium">Coste real</th>
            <th className="text-right px-4 py-3 font-medium">Varianza</th>
            <th className="text-right px-4 py-3 font-medium">€/pax real</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row) => (
            <tr key={row.event_id} className="hover:bg-bg-hover">
              <td className="px-4 py-3 text-text-primary font-medium">{row.event_name}</td>
              <td className="px-4 py-3 text-right text-text-muted tabular-nums">
                {new Date(row.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </td>
              <td className="px-4 py-3 text-right text-text-primary tabular-nums">{row.guest_count}</td>
              <td className="px-4 py-3 text-right text-text-muted tabular-nums">{fmtEur(row.theoretical_cost)}</td>
              <td className="px-4 py-3 text-right text-text-primary tabular-nums font-medium">{fmtEur(row.actual_cost)}</td>
              <td className="px-4 py-3 text-right">
                <VarianceBadge pct={row.variance_pct} />
              </td>
              <td className="px-4 py-3 text-right text-text-muted tabular-nums">{fmtEur(row.cost_per_pax_actual)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FoodCostByServiceTable({ from, to }: { from: string; to: string }) {
  const { data = [], isLoading } = useFoodCostByService(from, to)

  if (isLoading) return <div className="h-40 skeleton rounded" />

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-card p-8 text-center">
        <p className="text-text-muted text-sm">Sin datos para el período seleccionado.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">Tipo servicio</th>
            <th className="text-right px-4 py-3 font-medium">Eventos</th>
            <th className="text-right px-4 py-3 font-medium">Total pax</th>
            <th className="text-right px-4 py-3 font-medium">Coste teórico total</th>
            <th className="text-right px-4 py-3 font-medium">Coste real total</th>
            <th className="text-right px-4 py-3 font-medium">€/pax medio</th>
            <th className="text-right px-4 py-3 font-medium">Varianza media</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row) => (
            <tr key={row.service_type} className="hover:bg-bg-hover">
              <td className="px-4 py-3 text-text-primary font-medium">
                {SERVICE_TYPE_LABELS[row.service_type as keyof typeof SERVICE_TYPE_LABELS] ?? row.service_type}
              </td>
              <td className="px-4 py-3 text-right text-text-muted tabular-nums">{row.event_count}</td>
              <td className="px-4 py-3 text-right text-text-muted tabular-nums">{row.total_pax}</td>
              <td className="px-4 py-3 text-right text-text-muted tabular-nums">{fmtEur(row.total_theoretical_cost)}</td>
              <td className="px-4 py-3 text-right text-text-primary font-medium tabular-nums">{fmtEur(row.total_actual_cost)}</td>
              <td className="px-4 py-3 text-right text-text-primary tabular-nums">{fmtEur(row.avg_cost_per_pax)}</td>
              <td className="px-4 py-3 text-right">
                <VarianceBadge pct={row.avg_variance_pct} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CostVarianceTable({ from, to }: { from: string; to: string }) {
  const { data = [], isLoading } = useCostVarianceReport(from, to, 5)

  if (isLoading) return <div className="h-40 skeleton rounded" />

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-card p-8 text-center">
        <p className="text-success text-sm font-medium">Sin cost overruns en el período</p>
        <p className="text-xs text-text-muted mt-1">Todos los eventos dentro del umbral del 5%</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">Evento</th>
            <th className="text-right px-4 py-3 font-medium">Fecha</th>
            <th className="text-right px-4 py-3 font-medium">Pax</th>
            <th className="text-right px-4 py-3 font-medium">Teórico</th>
            <th className="text-right px-4 py-3 font-medium">Real</th>
            <th className="text-right px-4 py-3 font-medium">Overrun</th>
            <th className="text-right px-4 py-3 font-medium">Δ €/pax</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row) => (
            <tr key={row.event_id} className="hover:bg-bg-hover">
              <td className="px-4 py-3 text-text-primary font-medium">{row.event_name}</td>
              <td className="px-4 py-3 text-right text-text-muted tabular-nums">
                {new Date(row.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </td>
              <td className="px-4 py-3 text-right text-text-muted tabular-nums">{row.guest_count}</td>
              <td className="px-4 py-3 text-right text-text-muted tabular-nums">{fmtEur(row.theoretical_cost)}</td>
              <td className="px-4 py-3 text-right text-text-primary tabular-nums">{fmtEur(row.actual_cost)}</td>
              <td className="px-4 py-3 text-right">
                <span className="text-danger font-medium">{fmtEur(row.variance_abs)} ({fmtPct(row.variance_pct)})</span>
              </td>
              <td className="px-4 py-3 text-right text-danger tabular-nums">{fmtEur(row.cost_per_pax_delta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'by-event', label: 'Por evento', icon: Calendar },
  { id: 'by-service', label: 'Por servicio', icon: BarChart3 },
  { id: 'variance', label: 'Cost overruns', icon: AlertTriangle },
] as const

type TabId = (typeof TABS)[number]['id']

export default function ReportsPage() {
  const [tab, setTab] = useState<TabId>('by-event')
  const [from, setFrom] = useState(defaultRange().from)
  const [to, setTo] = useState(defaultRange().to)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-text-primary">Reportes</h1>
        <p className="text-sm text-text-muted">Food cost, costes por evento y varianza presupuestaria</p>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-text-muted">Desde</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <label className="text-sm text-text-muted">Hasta</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-bg-card p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'by-event' && <FoodCostByEventTable from={from} to={to} />}
      {tab === 'by-service' && <FoodCostByServiceTable from={from} to={to} />}
      {tab === 'variance' && <CostVarianceTable from={from} to={to} />}
    </div>
  )
}
