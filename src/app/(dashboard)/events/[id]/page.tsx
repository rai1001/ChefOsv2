'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEvent, useTransitionEvent } from '@/features/commercial/hooks/use-events'
import {
  useEventBeo,
  useGenerateOperationalImpact,
  useCalculateEventCostEstimate,
} from '@/features/commercial/hooks/use-beo'
import {
  EVENT_TYPE_LABELS,
  SERVICE_TYPE_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS,
} from '@/features/commercial/types'
import type { EventStatus, BeoData } from '@/features/commercial/types'
import { useEnqueueJob } from '@/features/automation/hooks/use-automation'
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  Clock,
  RefreshCw,
  Calculator,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Package,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// BEO PDF button — wrapper completo (PDFDownloadLink + BeoDocument) cargado client-side.
// dynamic() sobre el botón entero, NUNCA sobre @react-pdf/renderer ni el documento por separado
// (eso rompe Turbopack SSR: "ModuleId not found for ident: @react-pdf/renderer").
const BeoBtn = dynamic(
  () => import('@/features/documents/components/pdf-buttons').then((m) => m.BeoBtn),
  { ssr: false, loading: () => null }
)

// Valid next transitions per status
const NEXT_TRANSITIONS: Partial<Record<EventStatus, { label: string; status: EventStatus; variant: string }[]>> = {
  draft: [{ label: 'Enviar para confirmación', status: 'pending_confirmation', variant: 'bg-warning text-black' }],
  pending_confirmation: [{ label: 'Confirmar evento', status: 'confirmed', variant: 'bg-success text-white' }],
  confirmed: [{ label: 'Iniciar preparación', status: 'in_preparation', variant: 'bg-info text-white' }],
  in_preparation: [{ label: 'Iniciar operación', status: 'in_operation', variant: 'bg-accent text-white' }],
  in_operation: [{ label: 'Completar evento', status: 'completed', variant: 'bg-success text-white' }],
}

const DEPT_LABELS: Record<string, string> = {
  cocina_caliente: 'Cocina Caliente',
  cocina_fria: 'Cocina Fría',
  pasteleria: 'Pastelería',
  panaderia: 'Panadería',
  bebidas: 'Bebidas',
  general: 'General',
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €'
}

// ─── Cost block ───────────────────────────────────────────────────────────────

function CostBlock({ eventId, beo }: { eventId: string; beo: BeoData | undefined }) {
  const calcCost = useCalculateEventCostEstimate()

  return (
    <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Coste estimado</h3>
        <button
          onClick={() => calcCost.mutate(eventId)}
          disabled={calcCost.isPending}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-50"
        >
          <Calculator className="h-3.5 w-3.5" />
          {calcCost.isPending ? 'Calculando…' : 'Recalcular'}
        </button>
      </div>

      {calcCost.error && (
        <p className="text-xs text-danger">{(calcCost.error as Error).message}</p>
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-text-muted mb-0.5">Coste teórico</p>
          <p className="text-lg font-semibold text-text-primary">
            {beo?.theoretical_cost != null ? fmt(beo.theoretical_cost) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-0.5">Coste real</p>
          <p className="text-lg font-semibold text-text-primary">
            {beo?.actual_cost != null ? fmt(beo.actual_cost) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-0.5">Por comensal</p>
          <p className="text-lg font-semibold text-text-primary">
            {beo?.theoretical_cost != null && beo.guest_count > 0
              ? fmt(beo.theoretical_cost / beo.guest_count)
              : '—'}
          </p>
        </div>
      </div>

      {beo?.theoretical_cost == null && (
        <p className="text-xs text-text-muted text-center">
          Pulsa &ldquo;Recalcular&rdquo; para estimar el food cost con los menús asignados.
        </p>
      )}
    </div>
  )
}

// ─── Operational impact block ─────────────────────────────────────────────────

function OperationalImpactBlock({ eventId, beo }: { eventId: string; beo: BeoData | undefined }) {
  const generate = useGenerateOperationalImpact()
  const [expanded, setExpanded] = useState(true)

  const impact = beo?.operational_impact ?? []
  const hasImpact = impact.length > 0

  return (
    <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-text-muted uppercase tracking-wider hover:text-text-primary"
        >
          Impacto operacional
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          onClick={() => generate.mutate(eventId)}
          disabled={generate.isPending}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', generate.isPending && 'animate-spin')} />
          {generate.isPending ? 'Generando…' : 'Regenerar'}
        </button>
      </div>

      {generate.error && (
        <p className="text-xs text-danger">{(generate.error as Error).message}</p>
      )}

      {expanded && (
        <>
          {!hasImpact && (
            <p className="text-xs text-text-muted text-center py-4">
              Sin datos. Pulsa &ldquo;Regenerar&rdquo; para calcular las necesidades de ingredientes desde los menús del evento.
            </p>
          )}

          {hasImpact && (
            <div className="space-y-4">
              {impact.map((dept) => (
                <div key={dept.department}>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
                    {DEPT_LABELS[dept.department] ?? dept.department}
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-text-muted border-b border-border">
                        <th className="text-left pb-1 font-medium">Producto</th>
                        <th className="text-right pb-1 font-medium w-24">Cantidad</th>
                        <th className="text-right pb-1 font-medium w-16">Ud.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dept.items.map((item, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-1 text-text-primary">{item.product_name}</td>
                          <td className="py-1 text-right text-text-primary tabular-nums">
                            {new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 }).format(item.quantity_needed)}
                          </td>
                          <td className="py-1 text-right text-text-muted">{item.unit ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Automate block ───────────────────────────────────────────────────────────

function AutomateBlock({ eventId }: { eventId: string }) {
  const enqueue = useEnqueueJob()
  const [lastAction, setLastAction] = useState<string | null>(null)

  async function handle(action: 'generate_workflow' | 'reserve_stock') {
    setLastAction(null)
    await enqueue.mutateAsync({
      jobType: action,
      payload: { event_id: eventId },
    })
    setLastAction(action)
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
      <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">
        Automatización
      </h3>

      {enqueue.error && (
        <p className="text-xs text-danger">{(enqueue.error as Error).message}</p>
      )}

      {lastAction && (
        <div className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle className="h-3.5 w-3.5" />
          Job encolado — revisa{' '}
          <Link href="/automation" className="underline hover:no-underline">
            Automatización
          </Link>{' '}
          para ver el estado.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handle('generate_workflow')}
          disabled={enqueue.isPending}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-primary hover:bg-bg-hover disabled:opacity-50"
        >
          <GitBranch className="h-4 w-4" />
          {enqueue.isPending ? 'Encolando…' : 'Generar workflow'}
        </button>
        <button
          onClick={() => handle('reserve_stock')}
          disabled={enqueue.isPending}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-primary hover:bg-bg-hover disabled:opacity-50"
        >
          <Package className="h-4 w-4" />
          {enqueue.isPending ? 'Encolando…' : 'Reservar stock FIFO'}
        </button>
      </div>

      <p className="text-xs text-text-muted">
        Los jobs se ejecutan en segundo plano. El worker los procesa en orden.
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: event, isLoading } = useEvent(id)
  const { data: beo } = useEventBeo(id)
  const transition = useTransitionEvent()

  function handleTransition(newStatus: EventStatus) {
    if (newStatus === 'cancelled') {
      const reason = prompt('Motivo de cancelación:')
      if (!reason) return
      transition.mutate({ eventId: id, newStatus, reason })
    } else {
      transition.mutate({ eventId: id, newStatus })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-bg-card" />
        <div className="h-48 animate-pulse rounded-lg bg-bg-card" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Evento no encontrado</p>
        <Link href="/events" className="text-sm text-accent hover:text-accent-hover">
          Volver a eventos
        </Link>
      </div>
    )
  }

  const actions = NEXT_TRANSITIONS[event.status] ?? []
  const canCancel = !['completed', 'cancelled', 'archived'].includes(event.status)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/events"
            className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-text-primary">{event.name}</h1>
            <p className="text-sm text-text-muted">{event.beo_number}</p>
          </div>
        </div>
        <span className={cn('rounded-md px-3 py-1 text-sm font-medium', EVENT_STATUS_COLORS[event.status])}>
          {EVENT_STATUS_LABELS[event.status]}
        </span>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Detalles</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-text-muted" />
              <span className="text-text-primary">
                {new Date(event.event_date).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            {(event.start_time || event.end_time) && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-text-muted" />
                <span className="text-text-primary">
                  {event.start_time?.slice(0, 5) ?? '—'} – {event.end_time?.slice(0, 5) ?? '—'}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-text-muted" />
              <span className="text-text-primary">{event.guest_count} comensales</span>
            </div>
            {event.venue && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-text-muted" />
                <span className="text-text-primary">{event.venue}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Servicio</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-text-muted">Tipo: </span>
              <span className="text-text-primary">{EVENT_TYPE_LABELS[event.event_type]}</span>
            </p>
            <p>
              <span className="text-text-muted">Servicio: </span>
              <span className="text-text-primary">{SERVICE_TYPE_LABELS[event.service_type]}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Coste estimado */}
      <CostBlock eventId={id} beo={beo} />

      {/* Impacto operacional */}
      <OperationalImpactBlock eventId={id} beo={beo} />

      {/* Automatización */}
      <AutomateBlock eventId={id} />

      {/* Notes */}
      {event.notes && (
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-2">Notas</h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{event.notes}</p>
        </div>
      )}

      {/* Cancel reason */}
      {event.cancel_reason && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
          <h3 className="text-sm font-medium text-danger mb-1">Motivo de cancelación</h3>
          <p className="text-sm text-text-secondary">{event.cancel_reason}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        {actions.map((action) => (
          <button
            key={action.status}
            onClick={() => handleTransition(action.status)}
            disabled={transition.isPending}
            className={cn('rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50', action.variant)}
          >
            {action.label}
          </button>
        ))}

        {beo && <BeoBtn beo={beo} />}

        {canCancel && (
          <button
            onClick={() => handleTransition('cancelled')}
            disabled={transition.isPending}
            className="ml-auto rounded-md px-4 py-2 text-sm text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            Cancelar evento
          </button>
        )}
      </div>

      {transition.error && (
        <p className="text-sm text-danger" role="alert">
          {(transition.error as Error).message}
        </p>
      )}
    </div>
  )
}
