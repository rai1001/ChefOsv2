'use client'

import Link from 'next/link'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import { useDashboard } from '@/features/reporting/hooks/use-dashboard'
import { useActiveAlerts } from '@/features/reporting/hooks/use-alerts'
import {
  CalendarDays,
  ShoppingCart,
  Package,
  ChefHat,
  ClipboardList,
  Trash2,
  Users,
  TrendingUp,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function shiftLabel(now: Date): string {
  const h = now.getHours()
  if (h < 6) return 'Cena / madrugada'
  if (h < 11) return 'Desayuno'
  if (h < 16) return 'Comida'
  if (h < 22) return 'Cena'
  return 'Cierre'
}

function CommandBand({
  hotel,
  d,
}: {
  hotel: { hotel_name: string; hotel_id: string }
  d: NonNullable<ReturnType<typeof useDashboard>['data']>
}) {
  const now = new Date()
  const shift = shiftLabel(now)
  const firstEventToday = d.events.today[0]

  // Siguiente acción (prioridad: stock crítico > caducidades > solicitudes > pedidos)
  let action: { title: string; href: string; meta?: string; variant: 'urgent' | 'warning' | 'info' } | null = null
  if (d.inventory.low_stock_count > 0) {
    action = {
      title: `Revisar ${d.inventory.low_stock_count} producto${d.inventory.low_stock_count !== 1 ? 's' : ''} con stock bajo`,
      href: '/inventory',
      meta: 'Stock por debajo del mínimo',
      variant: 'urgent',
    }
  } else if (d.inventory.expiring_7d > 0) {
    action = {
      title: `${d.inventory.expiring_7d} lote${d.inventory.expiring_7d !== 1 ? 's' : ''} caduca${d.inventory.expiring_7d === 1 ? '' : 'n'} en 7 días`,
      href: '/inventory',
      meta: 'Priorizar consumo',
      variant: 'warning',
    }
  } else if (d.procurement.pending_requests > 0) {
    action = {
      title: `Aprobar ${d.procurement.pending_requests} solicitud${d.procurement.pending_requests !== 1 ? 'es' : ''} de compra`,
      href: '/procurement',
      variant: 'info',
    }
  } else if (d.procurement.pending_orders > 0) {
    action = {
      title: `Confirmar ${d.procurement.pending_orders} pedido${d.procurement.pending_orders !== 1 ? 's' : ''} pendiente${d.procurement.pending_orders !== 1 ? 's' : ''}`,
      href: '/procurement',
      variant: 'info',
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="status-rail info rounded-r-md bg-bg-card p-4">
        <p className="kpi-label">Turno activo</p>
        <p className="mt-2" style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {shift} · {now.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
        </p>
        <p className="mt-1 text-xs text-text-secondary">{hotel.hotel_name}</p>
      </div>

      <div className={cn('status-rail rounded-r-md bg-bg-card p-4', firstEventToday ? 'warning' : '')}>
        <p className="kpi-label">Servicio activo</p>
        {firstEventToday ? (
          <Link href={`/events/${firstEventToday.id}`} className="block">
            <p className="mt-2" style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {firstEventToday.name} <span className="text-text-secondary">({firstEventToday.guest_count}p)</span>
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {firstEventToday.start_time ? firstEventToday.start_time.slice(0, 5) : '—'} · Estado: <span className="text-text-primary">{firstEventToday.status}</span>
            </p>
          </Link>
        ) : (
          <>
            <p className="mt-2" style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Sin servicio hoy
            </p>
            <p className="mt-1 text-xs text-text-muted">Día tranquilo — planifica mañana</p>
          </>
        )}
      </div>

      <div className={cn('status-rail rounded-r-md bg-bg-card p-4', action ? action.variant : 'success')}>
        <p className="kpi-label">Siguiente acción</p>
        {action ? (
          <>
            <p className="mt-2" style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {action.title}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Link href={action.href} className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium">
                Resolver ahora
              </Link>
              {action.meta && <span className="text-xs text-text-muted">{action.meta}</span>}
            </div>
          </>
        ) : (
          <>
            <p className="mt-2" style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Todo bajo control
            </p>
            <p className="mt-1 text-xs text-text-secondary">0 urgencias · 0 avisos · 0 pendientes</p>
          </>
        )}
      </div>
    </div>
  )
}

function OperationalFeed({
  d,
  alerts,
}: {
  d: NonNullable<ReturnType<typeof useDashboard>['data']>
  alerts: ReturnType<typeof useActiveAlerts>['data']
}) {
  type Item = {
    key: string
    variant: 'urgent' | 'warning' | 'success' | 'info'
    title: string
    sub: string
    right: string
    rightSub: string
    href: string
  }

  const items: Item[] = []

  // Alertas críticas / warnings desde useActiveAlerts
  for (const a of (alerts ?? []).slice(0, 5)) {
    const variant: Item['variant'] =
      a.severity === 'critical' ? 'urgent' : a.severity === 'warning' ? 'warning' : 'info'
    items.push({
      key: `alert-${a.id}`,
      variant,
      title: a.title,
      sub: new Date(a.created_at).toLocaleString('es-ES', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      }),
      right: a.message ?? '',
      rightSub: a.alert_type,
      href: '/alerts',
    })
  }

  // Stock bajo
  if (d.inventory.low_stock_count > 0) {
    items.push({
      key: 'low-stock',
      variant: 'urgent',
      title: `${d.inventory.low_stock_count} producto${d.inventory.low_stock_count !== 1 ? 's' : ''} en STOCK BAJO`,
      sub: 'Reposición recomendada antes del próximo servicio',
      right: String(d.inventory.low_stock_count),
      rightSub: 'Por debajo del mínimo',
      href: '/inventory',
    })
  }

  // Caducidades próximas
  if (d.inventory.expiring_7d > 0) {
    items.push({
      key: 'expiring',
      variant: 'warning',
      title: `${d.inventory.expiring_7d} lote${d.inventory.expiring_7d !== 1 ? 's' : ''} caduca en 7 días`,
      sub: 'Priorizar consumo en próximos servicios',
      right: `${d.inventory.expiring_7d}`,
      rightSub: 'Lotes',
      href: '/inventory',
    })
  }

  // Pedidos pendientes
  if (d.procurement.pending_orders > 0) {
    items.push({
      key: 'po',
      variant: 'info',
      title: `${d.procurement.pending_orders} pedido${d.procurement.pending_orders !== 1 ? 's' : ''} enviado${d.procurement.pending_orders !== 1 ? 's' : ''} al proveedor`,
      sub: 'Pendientes de recepción',
      right: d.procurement.orders_value > 0 ? `€ ${Number(d.procurement.orders_value).toFixed(0)}` : '—',
      rightSub: 'Importe total',
      href: '/procurement',
    })
  }

  // Solicitudes pendientes aprobación
  if (d.procurement.pending_requests > 0) {
    items.push({
      key: 'pr',
      variant: 'warning',
      title: `${d.procurement.pending_requests} solicitud${d.procurement.pending_requests !== 1 ? 'es' : ''} de compra por aprobar`,
      sub: 'Revisa antes de generar los pedidos',
      right: String(d.procurement.pending_requests),
      rightSub: 'Pendientes',
      href: '/procurement',
    })
  }

  // Eventos confirmados hoy/próximos
  if (d.events.today.length === 0 && d.events.upcoming_7d > 0) {
    items.push({
      key: 'upcoming',
      variant: 'success',
      title: `${d.events.upcoming_7d} evento${d.events.upcoming_7d !== 1 ? 's' : ''} confirmado${d.events.upcoming_7d !== 1 ? 's' : ''} esta semana`,
      sub: `${d.events.total_pax_7d} comensales total`,
      right: String(d.events.upcoming_7d),
      rightSub: 'Próximos 7d',
      href: '/events',
    })
  }

  if (items.length === 0) {
    return (
      <div className="space-y-2">
        <p className="kpi-label">Feed operativo</p>
        <div className="status-rail success flex items-center justify-between rounded-r-md bg-bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">Todo en orden</p>
            <p className="mt-0.5 text-xs text-text-muted">0 alertas · 0 pedidos pendientes · 0 caducidades próximas</p>
          </div>
          <p className="font-data text-base text-success" style={{ fontVariantNumeric: 'tabular-nums' }}>OK</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="kpi-label">Feed operativo</p>
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={cn('alert-box flex items-center justify-between px-4 py-3 transition-colors', it.variant)}
        >
          <div className="min-w-0 flex-1 pr-4">
            <p className="alert-title text-sm font-medium truncate">{it.title}</p>
            <p className="mt-0.5 text-xs text-text-muted truncate">{it.sub}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-data text-base text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>{it.right}</p>
            <p className="text-xs text-text-muted">{it.rightSub}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

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
        <p className="kpi-label">{label}</p>
        <Icon className={cn('h-4 w-4', color ?? 'text-text-muted')} />
      </div>
      <p className="kpi-value mt-2">{value}</p>
      {sub && <p className="mt-1 text-xs text-text-muted">{sub}</p>}
    </div>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
}

export default function DashboardPage() {
  const { data: hotel } = useActiveHotel()
  const { data: d, isLoading } = useDashboard()
  const { data: alerts = [] } = useActiveAlerts()

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical')
  const warningAlerts = alerts.filter((a) => a.severity === 'warning')

  if (!hotel) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-text-primary" style={{ fontSize: '28px' }}>Dashboard</h1>
        <p className="text-sm text-text-secondary">{hotel.hotel_name}</p>
      </div>

      {isLoading || !d ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-card p-4">
              <div className="h-3 w-20 skeleton" />
              <div className="mt-3 h-7 w-12 skeleton" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Banda de mando — DESIGN.md §Layout */}
          <CommandBand hotel={hotel} d={d} />

          {/* Alertas activas (si hay) — alert-box: barra entera tintada para vistazo */}
          {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
            <Link
              href="/alerts"
              className={cn(
                'alert-box flex items-center justify-between px-4 py-3 transition-colors',
                criticalAlerts.length > 0 ? 'urgent' : 'warning',
              )}
            >
              <div className="flex items-center gap-3">
                <Bell className={cn('h-5 w-5 shrink-0', criticalAlerts.length > 0 ? 'text-danger' : 'text-warning')} />
                <div>
                  {criticalAlerts.length > 0 && (
                    <p className="text-sm font-medium text-danger">
                      {criticalAlerts.length} alerta{criticalAlerts.length !== 1 ? 's' : ''} crítica{criticalAlerts.length !== 1 ? 's' : ''}
                    </p>
                  )}
                  {warningAlerts.length > 0 && (
                    <p className={cn('text-sm', criticalAlerts.length > 0 ? 'text-text-muted' : 'font-medium text-warning')}>
                      {warningAlerts.length} aviso{warningAlerts.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-xs text-text-muted">Ver todas →</span>
            </Link>
          )}

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

          {/* Feed operativo — left-border rails (DESIGN.md §Dashboard) */}
          <OperationalFeed d={d} alerts={alerts} />

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
                      'badge-status',
                      ev.status === 'confirmed' ? 'success' :
                      ev.status === 'in_preparation' ? 'info' :
                      ev.status === 'in_operation' ? 'warning' :
                      'neutral'
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
