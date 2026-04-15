'use client'

import { use } from 'react'
import Link from 'next/link'
import { usePurchaseRequest, useTransitionPR } from '@/features/procurement/hooks/use-purchase-requests'
import {
  PR_STATUS_LABELS,
  PR_STATUS_COLORS,
  URGENCY_LABELS,
  URGENCY_COLORS,
} from '@/features/procurement/types'
import type { PrStatus } from '@/features/procurement/types'
import { ArrowLeft, Package, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const NEXT_TRANSITIONS: Partial<Record<PrStatus, { label: string; status: PrStatus; variant: string }[]>> = {
  draft: [
    { label: 'Enviar para aprobacion', status: 'pending_approval', variant: 'bg-warning text-black' },
  ],
  pending_approval: [
    { label: 'Aprobar', status: 'approved', variant: 'bg-success text-white' },
  ],
}

export default function PRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: pr, isLoading } = usePurchaseRequest(id)
  const transition = useTransitionPR()

  function handleTransition(newStatus: PrStatus) {
    if (newStatus === 'cancelled') {
      const reason = prompt('Motivo de cancelacion:')
      if (!reason) return
      transition.mutate({ requestId: id, newStatus, reason })
    } else {
      transition.mutate({ requestId: id, newStatus })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 skeleton rounded" />
        <div className="h-48 skeleton rounded-lg" />
      </div>
    )
  }

  if (!pr) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Solicitud no encontrada</p>
        <Link href="/procurement" className="text-sm text-accent hover:text-accent-hover">
          Volver a compras
        </Link>
      </div>
    )
  }

  const actions = NEXT_TRANSITIONS[pr.status] ?? []
  const canCancel = !['consolidated', 'cancelled'].includes(pr.status)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/procurement"
            className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-text-primary">{pr.request_number}</h1>
            <p className="text-sm text-text-muted">
              Creada el {new Date(pr.created_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <span className={cn('rounded-md px-3 py-1 text-sm font-medium', PR_STATUS_COLORS[pr.status])}>
          {PR_STATUS_LABELS[pr.status]}
        </span>
      </div>

      {/* Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Detalles</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-text-muted">Urgencia: </span>
              <span className={cn('font-medium', URGENCY_COLORS[pr.urgency])}>
                {URGENCY_LABELS[pr.urgency]}
              </span>
            </p>
            {pr.event && (
              <p>
                <span className="text-text-muted">Evento: </span>
                <Link href={`/events/${pr.event.id}`} className="text-accent hover:text-accent-hover">
                  {pr.event.name}
                </Link>
              </p>
            )}
            {pr.approved_at && (
              <p>
                <span className="text-text-muted">Aprobada: </span>
                <span className="text-text-primary">
                  {new Date(pr.approved_at).toLocaleDateString('es-ES')}
                </span>
              </p>
            )}
          </div>
        </div>

        {pr.notes && (
          <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Notas</h3>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{pr.notes}</p>
          </div>
        )}
      </div>

      {/* Cancel reason */}
      {pr.cancel_reason && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-danger" />
            <h3 className="text-sm font-medium text-danger">Motivo de cancelacion</h3>
          </div>
          <p className="mt-1 text-sm text-text-secondary">{pr.cancel_reason}</p>
        </div>
      )}

      {/* Lines */}
      <div className="rounded-lg border border-border bg-bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">
            Productos ({pr.lines?.length ?? 0})
          </h3>
        </div>
        {pr.lines && pr.lines.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2 text-right">Cantidad</th>
                <th className="px-4 py-2">Unidad</th>
              </tr>
            </thead>
            <tbody>
              {pr.lines.map((line) => (
                <tr key={line.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm text-text-primary">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-text-muted" />
                      {line.product?.name ?? 'Producto eliminado'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">
                    {Number(line.quantity_requested).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {line.unit?.abbreviation ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-sm text-text-muted">Sin productos</p>
        )}
      </div>

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
              Cancelar solicitud
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
