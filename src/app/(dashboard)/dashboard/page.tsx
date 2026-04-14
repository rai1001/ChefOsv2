'use client'

import Link from 'next/link'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import { useDashboard } from '@/features/reporting/hooks/use-dashboard'
import {
  CalendarDays,
  ShoppingCart,
  Package,
  ChefHat,
  ClipboardList,
  Trash2,
  AlertTriangle,
  Users,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function KpiCard({
  label,
  value,
  icon: Icon,
  href,
  color,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  href?: string
  color?: string
  sub?: string
}) {
  const content = (
    <div className={cn(
      'rounded-lg border border-border bg-bg-card p-4 transition-colors',
      href && 'hover:border-accent/30 cursor-pointer'
    )}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
        <Icon className={cn('h-4 w-4', color ?? 'text-text-muted')} />
      </div>
      <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
    </div>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
}

export default function DashboardPage() {
  const { data: hotel } = useActiveHotel()
  const { data: d, isLoading } = useDashboard()

  if (!hotel) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">{hotel.hotel_name}</p>
      </div>

      {isLoading || !d ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-card p-4">
              <div className="h-3 w-20 animate-pulse rounded bg-bg-hover" />
              <div className="mt-3 h-7 w-12 animate-pulse rounded bg-bg-hover" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Eventos proximos (7d)"
              value={d.events.upcoming_7d}
              icon={CalendarDays}
              href="/events"
              color="text-accent"
              sub={`${d.events.total_pax_7d} pax total`}
            />
            <KpiCard
              label="Produccion hoy"
              value={d.production.has_plan
                ? `${d.production.done ?? 0}/${d.production.total ?? 0}`
                : 'Sin plan'}
              icon={ClipboardList}
              href={d.production.has_plan ? `/production/${d.production.plan_id}` : '/production'}
              color={d.production.has_plan ? 'text-info' : 'text-text-muted'}
              sub={d.production.has_plan ? `${d.production.pending ?? 0} pendientes` : undefined}
            />
            <KpiCard
              label="Pedidos pendientes"
              value={d.procurement.pending_orders}
              icon={ShoppingCart}
              href="/procurement"
              color={d.procurement.pending_orders > 0 ? 'text-warning' : 'text-text-muted'}
              sub={d.procurement.orders_value > 0 ? `${Number(d.procurement.orders_value).toFixed(0)} EUR` : undefined}
            />
            <KpiCard
              label="Valor inventario"
              value={`${Number(d.inventory.total_value).toFixed(0)} EUR`}
              icon={Package}
              href="/inventory"
              color="text-success"
              sub={`${d.inventory.products_in_stock} productos`}
            />
          </div>

          {/* Alerts row */}
          {(d.inventory.low_stock_count > 0 || d.inventory.expiring_7d > 0 || d.procurement.pending_requests > 0) && (
            <div className="grid gap-4 md:grid-cols-3">
              {d.inventory.low_stock_count > 0 && (
                <Link href="/inventory" className="flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4 hover:border-danger/50">
                  <AlertTriangle className="h-5 w-5 text-danger shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-danger">{d.inventory.low_stock_count} productos stock bajo</p>
                    <p className="text-xs text-text-muted">Requieren reposicion</p>
                  </div>
                </Link>
              )}
              {d.inventory.expiring_7d > 0 && (
                <Link href="/inventory" className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 hover:border-warning/50">
                  <Clock className="h-5 w-5 text-warning shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-warning">{d.inventory.expiring_7d} lotes caducan (7d)</p>
                    <p className="text-xs text-text-muted">Revisar caducidades</p>
                  </div>
                </Link>
              )}
              {d.procurement.pending_requests > 0 && (
                <Link href="/procurement" className="flex items-center gap-3 rounded-lg border border-info/30 bg-info/5 p-4 hover:border-info/50">
                  <ShoppingCart className="h-5 w-5 text-info shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-info">{d.procurement.pending_requests} solicitudes pendientes</p>
                    <p className="text-xs text-text-muted">Por aprobar</p>
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Second row: recipes + waste */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Recetas"
              value={d.recipes.total}
              icon={ChefHat}
              href="/recipes"
              sub={`${d.recipes.approved} aprobadas, ${d.recipes.draft} borrador`}
            />
            <KpiCard
              label="Mermas (7d)"
              value={d.waste.count_7d}
              icon={Trash2}
              href="/inventory/waste"
              color={d.waste.count_7d > 0 ? 'text-danger' : 'text-text-muted'}
              sub={d.waste.quantity_7d > 0 ? `${Number(d.waste.quantity_7d).toFixed(1)} uds perdidas` : undefined}
            />
            <KpiCard
              label="Confirmados"
              value={d.events.confirmed}
              icon={TrendingUp}
              href="/events"
              color="text-success"
            />
            <KpiCard
              label="En preparacion"
              value={d.events.in_preparation}
              icon={Users}
              href="/events"
              color="text-info"
            />
          </div>

          {/* Today events */}
          {d.events.today.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">
                  Eventos de hoy ({d.events.today.length})
                </h3>
              </div>
              <div className="divide-y divide-border">
                {d.events.today.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-bg-hover"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{ev.name}</p>
                      <p className="text-xs text-text-muted">
                        {ev.start_time ? ev.start_time.slice(0, 5) : '—'} · {ev.guest_count} pax
                      </p>
                    </div>
                    <span className={cn(
                      'text-xs font-medium rounded-full px-2 py-0.5',
                      ev.status === 'confirmed' ? 'bg-success/10 text-success' :
                      ev.status === 'in_preparation' ? 'bg-info/10 text-info' :
                      ev.status === 'in_operation' ? 'bg-accent/10 text-accent' :
                      'bg-bg-hover text-text-muted'
                    )}>
                      {ev.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Production today */}
          {d.production.has_plan && d.production.total && d.production.total > 0 && (
            <Link
              href={`/production/${d.production.plan_id}`}
              className="block rounded-lg border border-border bg-bg-card p-4 hover:border-accent/30"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">
                  Produccion del dia
                </h3>
                <span className="text-sm text-text-primary font-medium">
                  {d.production.done}/{d.production.total} tareas
                </span>
              </div>
              <div className="h-2 rounded-full bg-bg-hover overflow-hidden">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${((d.production.done ?? 0) / d.production.total) * 100}%` }}
                />
              </div>
            </Link>
          )}
        </>
      )}
    </div>
  )
}
