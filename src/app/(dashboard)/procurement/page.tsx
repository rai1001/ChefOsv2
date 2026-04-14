'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePurchaseRequests } from '@/features/procurement/hooks/use-purchase-requests'
import { usePurchaseOrders } from '@/features/procurement/hooks/use-purchase-orders'
import {
  PR_STATUS_LABELS,
  PR_STATUS_COLORS,
  PO_STATUS_LABELS,
  PO_STATUS_COLORS,
  URGENCY_LABELS,
  URGENCY_COLORS,
} from '@/features/procurement/types'
import { Plus, ClipboardList, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'requests' | 'orders'

export default function ProcurementPage() {
  const [tab, setTab] = useState<Tab>('requests')
  const { data: requests, isLoading: loadingPRs } = usePurchaseRequests()
  const { data: orders, isLoading: loadingPOs } = usePurchaseOrders()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Compras</h1>
        <Link
          href="/procurement/requests/new"
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Nueva solicitud
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-md border border-border p-1 w-fit">
        <button
          onClick={() => setTab('requests')}
          className={cn(
            'flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors',
            tab === 'requests'
              ? 'bg-accent/10 text-accent'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          <ClipboardList className="h-4 w-4" />
          Solicitudes
          {requests && requests.length > 0 && (
            <span className="rounded-full bg-bg-hover px-2 py-0.5 text-xs">{requests.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab('orders')}
          className={cn(
            'flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors',
            tab === 'orders'
              ? 'bg-accent/10 text-accent'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          Pedidos
          {orders && orders.length > 0 && (
            <span className="rounded-full bg-bg-hover px-2 py-0.5 text-xs">{orders.length}</span>
          )}
        </button>
      </div>

      {/* Purchase Requests Tab */}
      {tab === 'requests' && (
        <div className="rounded-lg border border-border bg-bg-card">
          {loadingPRs ? (
            <div className="space-y-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
                  <div className="h-4 w-28 animate-pulse rounded bg-bg-hover" />
                  <div className="h-4 w-20 animate-pulse rounded bg-bg-hover" />
                  <div className="h-4 w-16 animate-pulse rounded bg-bg-hover" />
                </div>
              ))}
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-text-muted" />
              <p className="mt-3 text-text-secondary">No hay solicitudes de compra</p>
              <Link
                href="/procurement/requests/new"
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                <Plus className="h-4 w-4" />
                Crear primera solicitud
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3">N.o Solicitud</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Urgencia</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((pr) => (
                  <tr
                    key={pr.id}
                    className="border-b border-border last:border-0 hover:bg-bg-hover"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/procurement/requests/${pr.id}`}
                        className="font-medium text-text-primary hover:text-accent"
                      >
                        {pr.request_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {new Date(pr.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-medium', URGENCY_COLORS[pr.urgency])}>
                        {URGENCY_LABELS[pr.urgency]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {pr.event?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-medium', PR_STATUS_COLORS[pr.status])}>
                        {PR_STATUS_LABELS[pr.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Purchase Orders Tab */}
      {tab === 'orders' && (
        <div className="rounded-lg border border-border bg-bg-card">
          {loadingPOs ? (
            <div className="space-y-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
                  <div className="h-4 w-28 animate-pulse rounded bg-bg-hover" />
                  <div className="h-4 w-20 animate-pulse rounded bg-bg-hover" />
                  <div className="h-4 w-16 animate-pulse rounded bg-bg-hover" />
                </div>
              ))}
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="mx-auto h-12 w-12 text-text-muted" />
              <p className="mt-3 text-text-secondary">No hay pedidos de compra</p>
              <p className="mt-1 text-xs text-text-muted">
                Los pedidos se generan desde solicitudes aprobadas
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3">N.o Pedido</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Entrega</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => (
                  <tr
                    key={po.id}
                    className="border-b border-border last:border-0 hover:bg-bg-hover"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/procurement/orders/${po.id}`}
                        className="font-medium text-text-primary hover:text-accent"
                      >
                        {po.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {po.supplier?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {po.expected_delivery_date
                        ? new Date(po.expected_delivery_date).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary font-medium">
                      {po.total_amount > 0
                        ? `${Number(po.total_amount).toFixed(2)} EUR`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-medium', PO_STATUS_COLORS[po.status])}>
                        {PO_STATUS_LABELS[po.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
