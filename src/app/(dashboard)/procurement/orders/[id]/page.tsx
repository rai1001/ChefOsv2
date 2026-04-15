'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { usePurchaseOrder, useTransitionPO } from '@/features/procurement/hooks/use-purchase-orders'
import { useReceiveGoods } from '@/features/procurement/hooks/use-goods-receipts'
import {
  PO_STATUS_LABELS,
  PO_STATUS_COLORS,
} from '@/features/procurement/types'
import type { PoStatus, QualityStatus } from '@/features/procurement/types'
import { ArrowLeft, Package, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

const NEXT_TRANSITIONS: Partial<Record<PoStatus, { label: string; status: PoStatus; variant: string }[]>> = {
  draft: [
    { label: 'Enviar para aprobacion', status: 'pending_approval', variant: 'bg-warning text-black' },
  ],
  pending_approval: [
    { label: 'Aprobar', status: 'approved', variant: 'bg-success text-white' },
  ],
  approved: [
    { label: 'Marcar como enviado', status: 'sent', variant: 'bg-info text-white' },
  ],
  sent: [
    { label: 'Proveedor confirma', status: 'confirmed_by_supplier', variant: 'bg-accent text-white' },
  ],
}

export default function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: po, isLoading } = usePurchaseOrder(id)
  const transition = useTransitionPO()
  const receiveGoods = useReceiveGoods()
  const [showReceive, setShowReceive] = useState(false)

  function handleTransition(newStatus: PoStatus) {
    if (newStatus === 'cancelled') {
      const reason = prompt('Motivo de cancelacion:')
      if (!reason) return
      transition.mutate({ orderId: id, newStatus, reason })
    } else {
      transition.mutate({ orderId: id, newStatus })
    }
  }

  function handleReceiveAll() {
    if (!po?.lines) return

    const lines = po.lines.map((line) => ({
      order_line_id: line.id,
      quantity_received: Number(line.quantity_ordered) - Number(line.quantity_received),
      quality_status: 'accepted' as QualityStatus,
    }))

    receiveGoods.mutate(
      { order_id: id, lines },
      {
        onSuccess: () => {
          setShowReceive(false)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-bg-card" />
        <div className="h-48 animate-pulse rounded-lg bg-bg-card" />
      </div>
    )
  }

  if (!po) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Pedido no encontrado</p>
        <Link href="/procurement" className="text-sm text-accent hover:text-accent-hover">
          Volver a compras
        </Link>
      </div>
    )
  }

  const actions = NEXT_TRANSITIONS[po.status] ?? []
  const canCancel = !['received', 'cancelled'].includes(po.status)
  const canReceive = ['confirmed_by_supplier', 'partially_received'].includes(po.status)

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
            <h1 className="text-text-primary">{po.order_number}</h1>
            <p className="text-sm text-text-muted">{po.supplier?.name}</p>
          </div>
        </div>
        <span className={cn('rounded-md px-3 py-1 text-sm font-medium', PO_STATUS_COLORS[po.status])}>
          {PO_STATUS_LABELS[po.status]}
        </span>
      </div>

      {/* Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Total</p>
          <p className="mt-1 text-xl font-bold text-text-primary">
            {Number(po.total_amount).toFixed(2)} EUR
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Entrega prevista</p>
          <p className="mt-1 text-sm font-medium text-text-primary">
            {po.expected_delivery_date
              ? new Date(po.expected_delivery_date).toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })
              : 'Sin fecha'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Condiciones pago</p>
          <p className="mt-1 text-sm font-medium text-text-primary">
            {po.payment_terms ?? 'No especificadas'}
          </p>
        </div>
      </div>

      {/* Notes */}
      {po.notes && (
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-2">Notas</h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{po.notes}</p>
        </div>
      )}

      {/* Cancel reason */}
      {po.cancel_reason && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
          <h3 className="text-sm font-medium text-danger mb-1">Motivo de cancelacion</h3>
          <p className="text-sm text-text-secondary">{po.cancel_reason}</p>
        </div>
      )}

      {/* Lines */}
      <div className="rounded-lg border border-border bg-bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">
            Lineas ({po.lines?.length ?? 0})
          </h3>
        </div>
        {po.lines && po.lines.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2 text-right">Pedido</th>
                <th className="px-4 py-2 text-right">Recibido</th>
                <th className="px-4 py-2 text-right">P. Unit.</th>
                <th className="px-4 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {po.lines.map((line) => {
                const pct = Number(line.quantity_ordered) > 0
                  ? (Number(line.quantity_received) / Number(line.quantity_ordered)) * 100
                  : 0
                return (
                  <tr key={line.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm text-text-primary">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-text-muted" />
                        {line.product?.name ?? 'Producto eliminado'}
                      </div>
                      {line.unit && (
                        <span className="ml-6 text-xs text-text-muted">{line.unit.abbreviation}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary text-right">
                      {Number(line.quantity_ordered).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={cn(
                        'font-medium',
                        pct >= 100 ? 'text-success' : pct > 0 ? 'text-warning' : 'text-text-muted'
                      )}>
                        {Number(line.quantity_received).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary text-right">
                      {Number(line.unit_price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">
                      {(Number(line.quantity_ordered) * Number(line.unit_price)).toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td colSpan={4} className="px-4 py-3 text-sm font-medium text-text-primary text-right">
                  Total
                </td>
                <td className="px-4 py-3 text-sm font-bold text-text-primary text-right">
                  {Number(po.total_amount).toFixed(2)} EUR
                </td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="p-4 text-sm text-text-muted">Sin lineas</p>
        )}
      </div>

      {/* Receive confirmation */}
      {showReceive && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-success" />
            <h3 className="font-medium text-text-primary">Recepcion de mercancia</h3>
          </div>
          <p className="text-sm text-text-secondary">
            Se registrara la recepcion completa de todas las lineas pendientes.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReceiveAll}
              disabled={receiveGoods.isPending}
              className="rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50"
            >
              {receiveGoods.isPending ? 'Registrando...' : 'Confirmar recepcion completa'}
            </button>
            <button
              onClick={() => setShowReceive(false)}
              className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
          </div>
          {receiveGoods.error && (
            <p className="text-sm text-danger">{(receiveGoods.error as Error).message}</p>
          )}
        </div>
      )}

      {/* Actions */}
      {(actions.length > 0 || canCancel || canReceive) && !showReceive && (
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
          {canReceive && (
            <button
              onClick={() => setShowReceive(true)}
              className="flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90"
            >
              <Truck className="h-4 w-4" />
              Recibir mercancia
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => handleTransition('cancelled')}
              disabled={transition.isPending}
              className="ml-auto rounded-md px-4 py-2 text-sm text-danger hover:bg-danger/10 disabled:opacity-50"
            >
              Cancelar pedido
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
