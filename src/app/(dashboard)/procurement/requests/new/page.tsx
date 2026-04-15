'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCreatePurchaseRequest } from '@/features/procurement/hooks/use-purchase-requests'
import { useProducts } from '@/features/catalog/hooks/use-products'
import { useEvents } from '@/features/commercial/hooks/use-events'
import { URGENCY_LEVELS, URGENCY_LABELS } from '@/features/procurement/types'
import type { UrgencyLevel } from '@/features/procurement/types'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

interface LineInput {
  product_id: string
  quantity: string
  notes: string
}

export default function NewPurchaseRequestPage() {
  const router = useRouter()
  const createPR = useCreatePurchaseRequest()
  const { data: products } = useProducts()
  const { data: events } = useEvents()

  const [urgency, setUrgency] = useState<UrgencyLevel>('normal')
  const [eventId, setEventId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineInput[]>([
    { product_id: '', quantity: '', notes: '' },
  ])

  function addLine() {
    setLines([...lines, { product_id: '', quantity: '', notes: '' }])
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return
    setLines(lines.filter((_, i) => i !== index))
  }

  function updateLine(index: number, field: keyof LineInput, value: string) {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: value }
    setLines(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validLines = lines
      .filter((l) => l.product_id && parseFloat(l.quantity) > 0)
      .map((l) => ({
        product_id: l.product_id,
        quantity: parseFloat(l.quantity),
        notes: l.notes || undefined,
      }))

    if (validLines.length === 0) return

    createPR.mutate(
      {
        urgency,
        event_id: eventId || undefined,
        notes: notes || undefined,
        lines: validLines,
      },
      {
        onSuccess: () => {
          router.push('/procurement')
        },
      }
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/procurement"
          className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-text-primary">Nueva solicitud de compra</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos basicos */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Datos generales</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="urgency" className="block text-sm text-text-secondary">
                Urgencia
              </label>
              <select
                id="urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {URGENCY_LEVELS.map((u) => (
                  <option key={u} value={u}>{URGENCY_LABELS[u]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="eventId" className="block text-sm text-text-secondary">
                Evento (opcional)
              </label>
              <select
                id="eventId"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Sin evento</option>
                {events
                  ?.filter((ev) => !['completed', 'cancelled', 'archived'].includes(ev.status))
                  .map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm text-text-secondary">
              Notas
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Observaciones para compras..."
            />
          </div>
        </div>

        {/* Lines */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Productos</h2>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-accent hover:bg-accent/10"
            >
              <Plus className="h-4 w-4" />
              Linea
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-1">
                  <select
                    value={line.product_id}
                    onChange={(e) => updateLine(index, 'product_id', e.target.value)}
                    className="w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
                    required
                  >
                    <option value="">Seleccionar producto</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                    className="w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Qty"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="mt-1.5 rounded p-1 text-text-muted hover:text-danger disabled:opacity-30"
                  disabled={lines.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/procurement"
            className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={createPR.isPending}
            className="rounded-md bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {createPR.isPending ? 'Creando...' : 'Crear solicitud'}
          </button>
        </div>

        {createPR.error && (
          <p className="text-sm text-danger" role="alert">
            {(createPR.error as Error).message}
          </p>
        )}
      </form>
    </div>
  )
}
