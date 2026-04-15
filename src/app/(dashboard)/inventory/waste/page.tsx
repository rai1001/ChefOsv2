'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWasteRecords, useRecordWaste } from '@/features/inventory/hooks/use-waste'
import { useProducts } from '@/features/catalog/hooks/use-products'
import {
  WASTE_TYPES,
  WASTE_TYPE_LABELS,
} from '@/features/inventory/types'
import type { WasteType } from '@/features/inventory/types'
import { ArrowLeft, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function WastePage() {
  const { data: records, isLoading } = useWasteRecords()
  const { data: products } = useProducts()
  const recordWaste = useRecordWaste()
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [wasteType, setWasteType] = useState<WasteType>('other')
  const [department, setDepartment] = useState('')
  const [reason, setReason] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || !quantity) return

    recordWaste.mutate(
      {
        product_id: productId,
        quantity: parseFloat(quantity),
        waste_type: wasteType,
        department: department || undefined,
        reason: reason || undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false)
          setProductId('')
          setQuantity('')
          setWasteType('other')
          setDepartment('')
          setReason('')
        },
      }
    )
  }

  // Aggregate stats
  const totalWaste = records?.reduce((sum, r) => sum + Number(r.quantity), 0) ?? 0
  const byType = records?.reduce((acc, r) => {
    acc[r.waste_type] = (acc[r.waste_type] || 0) + Number(r.quantity)
    return acc
  }, {} as Record<string, number>) ?? {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-text-primary">Mermas</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Registrar merma
        </button>
      </div>

      {/* Stats */}
      {records && records.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
            <p className="text-xs text-danger uppercase tracking-wider">Total mermas</p>
            <p className="mt-1 text-2xl font-bold text-danger">{totalWaste.toFixed(2)}</p>
          </div>
          {Object.entries(byType).slice(0, 3).map(([type, qty]) => (
            <div key={type} className="rounded-lg border border-border bg-bg-card p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">
                {WASTE_TYPE_LABELS[type as WasteType]}
              </p>
              <p className="mt-1 text-xl font-bold text-text-primary">{(qty as number).toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Registrar merma</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary">Producto *</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Seleccionar</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary">Cantidad *</label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary">Tipo de merma</label>
              <select
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value as WasteType)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {WASTE_TYPES.map((t) => (
                  <option key={t} value={t}>{WASTE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary">Departamento</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Cocina caliente, pasteleria..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary">Motivo</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Producto caducado, error de preparacion..."
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={recordWaste.isPending}
              className="rounded-md bg-danger px-6 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
            >
              {recordWaste.isPending ? 'Registrando...' : 'Registrar merma'}
            </button>
          </div>

          {recordWaste.error && (
            <p className="text-sm text-danger">{(recordWaste.error as Error).message}</p>
          )}
        </form>
      )}

      {/* Records table */}
      <div className="rounded-lg border border-border bg-bg-card">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
                <div className="h-4 w-24 animate-pulse rounded bg-bg-hover" />
                <div className="h-4 w-32 animate-pulse rounded bg-bg-hover" />
              </div>
            ))}
          </div>
        ) : !records || records.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="mx-auto h-12 w-12 text-text-muted" />
            <p className="mt-3 text-text-secondary">No hay mermas registradas</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-text-muted" style={{ borderColor: 'var(--border-strong)', fontFamily: 'var(--font-code)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Departamento</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} className="status-rail urgent border-b border-border last:border-0 hover:bg-bg-hover">
                  <td className="px-4 py-3 text-sm text-text-secondary font-data">
                    {new Date(rec.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary font-medium">
                    {rec.product?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-danger text-right font-data">
                    -{Number(rec.quantity).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-status urgent">
                      {WASTE_TYPE_LABELS[rec.waste_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {rec.department ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted truncate max-w-[200px]">
                    {rec.reason ?? '—'}
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
