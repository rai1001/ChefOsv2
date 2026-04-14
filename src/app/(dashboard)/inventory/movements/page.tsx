'use client'

import Link from 'next/link'
import { useStockMovements } from '@/features/inventory/hooks/use-movements'
import {
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_COLORS,
} from '@/features/inventory/types'
import { ArrowLeft, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MovementsPage() {
  const { data: movements, isLoading } = useStockMovements()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/inventory"
          className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Movimientos de stock</h1>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-bg-card">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
                <div className="h-4 w-24 animate-pulse rounded bg-bg-hover" />
                <div className="h-4 w-32 animate-pulse rounded bg-bg-hover" />
                <div className="h-4 w-16 animate-pulse rounded bg-bg-hover" />
              </div>
            ))}
          </div>
        ) : !movements || movements.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowRightLeft className="mx-auto h-12 w-12 text-text-muted" />
            <p className="mt-3 text-text-secondary">No hay movimientos registrados</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3">Notas</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mov) => (
                <tr key={mov.id} className="border-b border-border last:border-0 hover:bg-bg-hover">
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {new Date(mov.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-sm font-medium', MOVEMENT_TYPE_COLORS[mov.movement_type])}>
                      {MOVEMENT_TYPE_LABELS[mov.movement_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary">
                    {mov.product?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    <span className={Number(mov.quantity) >= 0 ? 'text-success' : 'text-danger'}>
                      {Number(mov.quantity) >= 0 ? '+' : ''}{Number(mov.quantity).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted truncate max-w-[200px]">
                    {mov.notes ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
