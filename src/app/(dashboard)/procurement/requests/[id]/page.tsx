'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePurchaseRequest, useTransitionPR } from '@/features/procurement/hooks/use-purchase-requests'
import { useGeneratePO } from '@/features/procurement/hooks/use-purchase-orders'
import { useSuppliers } from '@/features/catalog/hooks/use-suppliers'
import {
  PR_STATUS_LABELS,
  PR_STATUS_COLORS,
  URGENCY_LABELS,
  URGENCY_COLORS,
} from '@/features/procurement/types'
import type { PrStatus } from '@/features/procurement/types'
import { ArrowLeft, Package, AlertTriangle, ShoppingCart } from 'lucide-react'
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
  const router = useRouter()
  const { data: pr, isLoading } = usePurchaseRequest(id)
  const { data: suppliers } = useSuppliers()
  const transition = useTransitionPR()
  const generatePO = useGeneratePO()
  const [showGenerate, setShowGenerate] = useState(false)
  const [supplierId, setSupplierId] = useState<string>('')
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().slice(0, 10)
  })

  function handleTransition(newStatus: PrStatus) {
    if (newStatus === 'cancelled') {
      const reason = prompt('Motivo de cancelacion:')
      if (!reason) return
      transition.mutate({ requestId: id, newStatus, reason })
    } else {
      transition.mutate({ requestId: id, newStatus })
    }
  }

  function handleGeneratePO() {
    if (!supplierId) return
    generatePO.mutate(
      {
        supplier_id: supplierId,
        request_ids: [id],
        expected_delivery: deliveryDate,
      },
      {
        onSuccess: (newOrderId) => {
          router.push(`/procurement/orders/${newOrderId}`)
        },
      }
    )
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
  const canGeneratePO = pr.status === 'approved'

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

      {/* Generar PO panel (cuando PR está aprobada) */}
      {showGenerate && canGeneratePO && (
        <div className="rounded-lg border border-info/30 bg-info/5 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-info" />
            <h3 className="font-medium text-text-primary">Generar pedido de compra</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1">Proveedor</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">— Selecciona proveedor —</option>
                {(suppliers ?? []).filter((s) => s.is_active).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-1">Entrega prevista</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <p className="text-xs text-text-muted">
            Se creará un pedido con las {pr.lines?.length ?? 0} líneas de esta solicitud al precio del proveedor preferido. La solicitud quedará marcada como CONSOLIDADA.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGeneratePO}
              disabled={!supplierId || generatePO.isPending}
              className="rounded-md bg-info px-4 py-2 text-sm font-medium text-white hover:bg-info/90 disabled:opacity-50"
            >
              {generatePO.isPending ? 'Generando…' : 'Generar pedido'}
            </button>
            <button
              onClick={() => setShowGenerate(false)}
              className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
          </div>
          {generatePO.error && (
            <p className="text-sm text-danger">{(generatePO.error as Error).message}</p>
          )}
        </div>
      )}

      {/* Actions */}
      {(actions.length > 0 || canCancel || canGeneratePO) && !showGenerate && (
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
          {canGeneratePO && (
            <button
              onClick={() => setShowGenerate(true)}
              className="flex items-center gap-2 rounded-md bg-info px-4 py-2 text-sm font-medium text-white hover:bg-info/90"
            >
              <ShoppingCart className="h-4 w-4" />
              Generar pedido (PO)
            </button>
          )}
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
