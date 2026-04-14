'use client'

import { use } from 'react'
import Link from 'next/link'
import { useEvent, useTransitionEvent } from '@/features/commercial/hooks/use-events'
import {
  EVENT_TYPE_LABELS,
  SERVICE_TYPE_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS,
} from '@/features/commercial/types'
import type { EventStatus } from '@/features/commercial/types'
import { ArrowLeft, Calendar, Users, MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// Valid next transitions per status
const NEXT_TRANSITIONS: Partial<Record<EventStatus, { label: string; status: EventStatus; variant: string }[]>> = {
  draft: [
    { label: 'Enviar para confirmación', status: 'pending_confirmation', variant: 'bg-warning text-black' },
  ],
  pending_confirmation: [
    { label: 'Confirmar evento', status: 'confirmed', variant: 'bg-success text-white' },
  ],
  confirmed: [
    { label: 'Iniciar preparación', status: 'in_preparation', variant: 'bg-info text-white' },
  ],
  in_preparation: [
    { label: 'Iniciar operación', status: 'in_operation', variant: 'bg-accent text-white' },
  ],
  in_operation: [
    { label: 'Completar evento', status: 'completed', variant: 'bg-success text-white' },
  ],
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: event, isLoading } = useEvent(id)
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
            <h1 className="text-2xl font-bold text-text-primary">{event.name}</h1>
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
      {(actions.length > 0 || canCancel) && (
        <div className="flex items-center gap-3 border-t border-border pt-4">
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
      )}

      {transition.error && (
        <p className="text-sm text-danger" role="alert">
          {(transition.error as Error).message}
        </p>
      )}
    </div>
  )
}
