'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useEvents } from '@/features/commercial/hooks/use-events'
import {
  EVENT_TYPE_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS,
} from '@/features/commercial/types'
import { Plus, CalendarDays, List } from 'lucide-react'
import { cn } from '@/lib/utils'

type View = 'list' | 'calendar'

export default function EventsPage() {
  const [view, setView] = useState<View>('list')
  const { data: events, isLoading } = useEvents()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Eventos</h1>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-md border border-border">
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-sm',
                view === 'list'
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              <List className="h-4 w-4" />
              Lista
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-sm border-l border-border',
                view === 'calendar'
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              <CalendarDays className="h-4 w-4" />
              Calendario
            </button>
          </div>

          <Link
            href="/events/new"
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Nuevo evento
          </Link>
        </div>
      </div>

      {/* List view */}
      {view === 'list' && (
        <div className="rounded-lg border border-border bg-bg-card">
          {isLoading ? (
            <div className="space-y-0">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
                  <div className="h-4 w-32 animate-pulse rounded bg-bg-hover" />
                  <div className="h-4 w-20 animate-pulse rounded bg-bg-hover" />
                  <div className="h-4 w-16 animate-pulse rounded bg-bg-hover" />
                </div>
              ))}
            </div>
          ) : !events || events.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-text-muted" />
              <p className="mt-3 text-text-secondary">No hay eventos todavía</p>
              <Link
                href="/events/new"
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                <Plus className="h-4 w-4" />
                Crear primer evento
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Pax</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">BEO</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-border last:border-0 hover:bg-bg-hover"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/events/${event.id}`}
                        className="font-medium text-text-primary hover:text-accent"
                      >
                        {event.name}
                      </Link>
                      {event.venue && (
                        <p className="text-xs text-text-muted">{event.venue}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {new Date(event.event_date).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                      {event.start_time && (
                        <span className="ml-1 text-text-muted">
                          {event.start_time.slice(0, 5)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {EVENT_TYPE_LABELS[event.event_type]}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {event.guest_count}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          EVENT_STATUS_COLORS[event.status]
                        )}
                      >
                        {EVENT_STATUS_LABELS[event.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {event.beo_number}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Calendar view placeholder */}
      {view === 'calendar' && (
        <div className="rounded-lg border border-border bg-bg-card p-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-text-muted" />
          <p className="mt-3 text-text-secondary">
            Vista de calendario — próximamente
          </p>
        </div>
      )}
    </div>
  )
}
