'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  useStockCount,
  useStockCountLines,
  useSubmitStockCountLine,
  useReviewStockCount,
} from '@/features/inventory/hooks/use-stock-counts'
import {
  COUNT_STATUS_LABELS,
  COUNT_STATUS_COLORS,
  COUNT_TYPE_LABELS,
} from '@/features/inventory/types'
import {
  ArrowLeft,
  ClipboardCheck,
  Check,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StockCountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: count, isLoading: loadingCount } = useStockCount(id)
  const { data: lines, isLoading: loadingLines } = useStockCountLines(id)
  const submitLine = useSubmitStockCountLine()
  const reviewCount = useReviewStockCount()

  const [editingLine, setEditingLine] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const isEditable = count?.status === 'open' || count?.status === 'in_progress'
  const pendingLines = lines?.filter((l) => l.counted_qty === null) ?? []
  const submittedLines = lines?.filter((l) => l.counted_qty !== null) ?? []
  const linesWithVariance = submittedLines.filter((l) => (l.variance_qty ?? 0) !== 0)

  const handleEditStart = (lineId: string, currentCounted: number | null) => {
    setEditingLine(lineId)
    setEditValue(currentCounted?.toString() ?? '')
  }

  const handleSubmitLine = async (lineId: string) => {
    const qty = parseFloat(editValue)
    if (isNaN(qty) || qty < 0) return
    await submitLine.mutateAsync({ line_id: lineId, counted_qty: qty })
    setEditingLine(null)
    setEditValue('')
  }

  const handleReview = async (applyAdjustments: boolean) => {
    await reviewCount.mutateAsync({ count_id: id, apply_adjustments: applyAdjustments })
    router.push('/inventory/counts')
  }

  if (loadingCount) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 skeleton rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 skeleton rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  if (!count) {
    return (
      <div className="p-6 text-center text-text-muted">
        Conteo no encontrado.{' '}
        <Link href="/inventory/counts" className="text-accent underline">
          Volver
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/inventory/counts"
          className="mt-1 text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-text-primary">
              {count.label ?? COUNT_TYPE_LABELS[count.count_type]}
            </h1>
            <span className={cn('text-sm font-medium', COUNT_STATUS_COLORS[count.status])}>
              {COUNT_STATUS_LABELS[count.status]}
            </span>
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            {COUNT_TYPE_LABELS[count.count_type]}
            {count.is_blind && ' · Modo ciego'}
            {' · '}
            {new Date(count.started_at).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="text-text-primary">{lines?.length ?? 0}</div>
          <div className="text-xs text-text-muted mt-1">Total líneas</div>
        </div>
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="text-2xl font-bold text-success">{submittedLines.length}</div>
          <div className="text-xs text-text-muted mt-1">Contadas</div>
        </div>
        <div className="rounded-md border border-border bg-surface p-4">
          <div className={cn('text-2xl font-bold', linesWithVariance.length > 0 ? 'text-warning' : 'text-text-primary')}>
            {linesWithVariance.length}
          </div>
          <div className="text-xs text-text-muted mt-1">Con varianza</div>
        </div>
      </div>

      {/* Acciones de revisión */}
      {isEditable && pendingLines.length === 0 && submittedLines.length > 0 && (
        <div className="rounded-md border border-success/30 bg-success/5 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <Check className="h-4 w-4 text-success" />
            Todas las líneas contadas. ¿Aplicar ajustes de inventario?
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleReview(false)}
              disabled={reviewCount.isPending}
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-60"
            >
              Solo revisar
            </button>
            <button
              onClick={() => handleReview(true)}
              disabled={reviewCount.isPending}
              className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
            >
              {reviewCount.isPending ? 'Aplicando...' : 'Aplicar ajustes'}
            </button>
          </div>
        </div>
      )}

      {/* Líneas pendientes */}
      {isEditable && pendingLines.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-warning" />
            Pendientes de contar ({pendingLines.length})
          </h2>
          <div className="space-y-1">
            {pendingLines.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                isBlind={count.is_blind}
                isEditing={editingLine === line.id}
                editValue={editValue}
                onEditStart={() => handleEditStart(line.id, line.counted_qty)}
                onEditChange={setEditValue}
                onSubmit={() => handleSubmitLine(line.id)}
                onCancel={() => setEditingLine(null)}
                isSubmitting={submitLine.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* Líneas contadas */}
      {submittedLines.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-success" />
            Contadas ({submittedLines.length})
          </h2>
          <div className="space-y-1">
            {submittedLines.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                isBlind={count.is_blind}
                isEditing={editingLine === line.id}
                editValue={editValue}
                onEditStart={() => handleEditStart(line.id, line.counted_qty)}
                onEditChange={setEditValue}
                onSubmit={() => handleSubmitLine(line.id)}
                onCancel={() => setEditingLine(null)}
                isSubmitting={submitLine.isPending}
                editable={isEditable}
              />
            ))}
          </div>
        </section>
      )}

      {loadingLines && (
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 skeleton rounded-md" />
          ))}
        </div>
      )}
    </div>
  )
}

function LineRow({
  line,
  isBlind,
  isEditing,
  editValue,
  onEditStart,
  onEditChange,
  onSubmit,
  onCancel,
  isSubmitting,
  editable = true,
}: {
  line: import('@/features/inventory/types').StockCountLine
  isBlind: boolean
  isEditing: boolean
  editValue: string
  onEditStart: () => void
  onEditChange: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
  isSubmitting: boolean
  editable?: boolean
}) {
  const variance = line.variance_qty
  const hasVariance = variance !== null && variance !== 0

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border px-4 py-3 transition-colors',
        hasVariance
          ? 'border-warning/30 bg-warning/5'
          : line.counted_qty !== null
          ? 'border-success/20 bg-success/5'
          : 'border-border bg-surface'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">
          {line.product?.name ?? line.product_id}
        </div>
        {line.lot?.lot_number && (
          <div className="text-xs text-text-muted">
            Lote {line.lot.lot_number}
            {line.lot.expiry_date && (
              <span> · Cad. {new Date(line.lot.expiry_date).toLocaleDateString('es-ES')}</span>
            )}
          </div>
        )}
      </div>

      {/* Esperado (oculto si ciego y no contado aún) */}
      <div className="text-right w-24">
        <div className="text-xs text-text-muted">Esperado</div>
        <div className="text-sm text-text-secondary">
          {!isBlind || line.counted_qty !== null
            ? (line.expected_qty?.toFixed(3) ?? '—')
            : '—'}
        </div>
      </div>

      {/* Contado */}
      <div className="text-right w-28">
        <div className="text-xs text-text-muted">Contado</div>
        {isEditing ? (
          <div className="flex items-center gap-1 mt-0.5">
            <input
              autoFocus
              type="number"
              min="0"
              step="0.001"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit()
                if (e.key === 'Escape') onCancel()
              }}
              className="w-20 rounded-lg border border-accent bg-bg-input px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="p-1 rounded text-success hover:bg-success/10 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onEditStart}
            disabled={!editable}
            className={cn(
              'text-sm font-medium transition-colors',
              line.counted_qty !== null ? 'text-text-primary' : 'text-text-muted',
              editable && 'hover:text-accent cursor-pointer'
            )}
          >
            {line.counted_qty?.toFixed(3) ?? 'Introducir'}
          </button>
        )}
      </div>

      {/* Varianza */}
      <div className="text-right w-20">
        <div className="text-xs text-text-muted">Varianza</div>
        <div
          className={cn(
            'text-sm font-medium flex items-center justify-end gap-1',
            variance === null ? 'text-text-muted' : variance > 0 ? 'text-success' : variance < 0 ? 'text-danger' : 'text-text-secondary'
          )}
        >
          {variance === null ? (
            <Minus className="h-3 w-3" />
          ) : variance > 0 ? (
            <>
              <TrendingUp className="h-3 w-3" />
              +{variance.toFixed(3)}
            </>
          ) : variance < 0 ? (
            <>
              <TrendingDown className="h-3 w-3" />
              {variance.toFixed(3)}
            </>
          ) : (
            '0'
          )}
        </div>
      </div>
    </div>
  )
}
