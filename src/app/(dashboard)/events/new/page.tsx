'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateEvent } from '@/features/commercial/hooks/use-events'
import { useClients } from '@/features/commercial/hooks/use-clients'
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
} from '@/features/commercial/types'
import type { EventType, ServiceType } from '@/features/commercial/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewEventPage() {
  const router = useRouter()
  const createEvent = useCreateEvent()
  const { data: clients } = useClients()

  const [name, setName] = useState('')
  const [eventType, setEventType] = useState<EventType>('banquet')
  const [serviceType, setServiceType] = useState<ServiceType>('seated')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [venue, setVenue] = useState('')
  const [clientId, setClientId] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    createEvent.mutate(
      {
        name,
        event_type: eventType,
        service_type: serviceType,
        event_date: eventDate,
        guest_count: parseInt(guestCount) || 0,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        venue: venue || undefined,
        client_id: clientId || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: (eventId) => {
          router.push(`/events/${eventId}`)
        },
      }
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/events"
          className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Nuevo evento</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos básicos */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Datos del evento</h2>

          <div>
            <label htmlFor="name" className="block text-sm text-text-secondary">
              Nombre del evento *
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Banquete Boda García"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="eventType" className="block text-sm text-text-secondary">
                Tipo de evento *
              </label>
              <select
                id="eventType"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventType)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="serviceType" className="block text-sm text-text-secondary">
                Tipo de servicio *
              </label>
              <select
                id="serviceType"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>{SERVICE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="eventDate" className="block text-sm text-text-secondary">
                Fecha *
              </label>
              <input
                id="eventDate"
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-sm text-text-secondary">
                Hora inicio
              </label>
              <input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm text-text-secondary">
                Hora fin
              </label>
              <input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="guestCount" className="block text-sm text-text-secondary">
                Comensales *
              </label>
              <input
                id="guestCount"
                type="number"
                required
                min={1}
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="200"
              />
            </div>
            <div>
              <label htmlFor="venue" className="block text-sm text-text-secondary">
                Espacio / Sala
              </label>
              <input
                id="venue"
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Salón principal"
              />
            </div>
          </div>
        </div>

        {/* Cliente */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Cliente</h2>
          <div>
            <label htmlFor="clientId" className="block text-sm text-text-secondary">
              Seleccionar cliente (opcional)
            </label>
            <select
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Sin cliente asignado</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` — ${c.company}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notas */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Notas</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Observaciones, alergias, requerimientos especiales..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/events"
            className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={createEvent.isPending}
            className="rounded-md bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {createEvent.isPending ? 'Creando...' : 'Crear evento'}
          </button>
        </div>

        {createEvent.error && (
          <p className="text-sm text-danger" role="alert">
            {(createEvent.error as Error).message}
          </p>
        )}
      </form>
    </div>
  )
}
