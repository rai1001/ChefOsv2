'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  useOcrPendingLines,
  useMatchSuggestions,
  useResolveOcrLine,
} from '@/features/procurement/hooks/use-ocr-receipt'
import { ArrowLeft, AlertCircle, Check, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function OcrReviewPage() {
  const { data: lines, isLoading } = useOcrPendingLines()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/procurement"
          className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-text-primary" style={{ fontSize: '28px' }}>Revisar líneas OCR</h1>
          <p className="text-sm text-text-muted">
            Líneas que el OCR no pudo asignar automáticamente. Asigna producto y confirma cantidad.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Sparkles className="h-4 w-4 text-info" />
          <span>{lines?.length ?? 0} pendientes</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 skeleton rounded-lg" />)}
        </div>
      ) : !lines || lines.length === 0 ? (
        <div className="alert-box success p-8 text-center">
          <Check className="mx-auto h-10 w-10 text-success" />
          <p className="alert-title mt-3 text-base">Todo revisado</p>
          <p className="text-sm text-text-secondary mt-1">
            No hay líneas OCR pendientes de revisión.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lines.map((line) => <OcrLineRow key={line.id} line={line} />)}
        </div>
      )}
    </div>
  )
}

function OcrLineRow({ line }: { line: ReturnType<typeof useOcrPendingLines>['data'] extends (infer T)[] | undefined ? T : never }) {
  const [query, setQuery] = useState(line.ocr_product_name_extracted ?? line.ocr_raw_text ?? '')
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const { data: suggestions } = useMatchSuggestions(query, true)
  const resolve = useResolveOcrLine()

  const isUnknown = line.ocr_review_status === 'product_unknown'
  const variant = isUnknown ? 'urgent' : 'warning'

  function handleConfirm(productId: string) {
    resolve.mutate({
      line_id: line.id,
      product_id: productId,
      mark_status: productId === suggestions?.[0]?.product_id ? 'reviewed_ok' : 'reviewed_fixed',
    })
  }

  return (
    <div className={cn('alert-box p-4 space-y-3', variant)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className={cn('h-4 w-4 shrink-0', isUnknown ? 'text-danger' : 'text-warning')} />
            <p className="alert-title text-sm font-medium">
              {line.ocr_product_name_extracted ?? line.ocr_raw_text ?? 'Texto OCR vacío'}
            </p>
          </div>
          <p className="text-xs text-text-muted ml-6">
            Albarán <span className="font-mono">{line.receipt_number}</span> · {line.quantity_received} ud
            {line.unit_cost ? ` · ${Number(line.unit_cost).toFixed(2)} €/ud` : ''}
            {line.lot_number ? ` · Lote ${line.lot_number}` : ''}
          </p>
          {line.ocr_match_confidence != null && (
            <p className="text-xs text-text-muted ml-6">
              Mejor match con confianza <span className="font-data">{(Number(line.ocr_match_confidence) * 100).toFixed(0)}%</span>
            </p>
          )}
        </div>
      </div>

      <div className="ml-6 space-y-2">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-text-muted shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedProductId('') }}
            placeholder="Buscar producto…"
            className="flex-1 rounded-md border border-border bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
          />
        </div>

        {suggestions && suggestions.length > 0 && (
          <div className="space-y-1">
            {suggestions.map((s) => (
              <button
                key={s.product_id}
                onClick={() => setSelectedProductId(s.product_id)}
                className={cn(
                  'w-full text-left flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors',
                  selectedProductId === s.product_id
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-bg-card hover:border-accent/40'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-text-primary truncate">{s.product_name}</span>
                  {s.category && <span className="text-xs text-text-muted">· {s.category}</span>}
                </div>
                <span className={cn(
                  'font-data text-xs ml-2 shrink-0',
                  s.confidence >= 0.85 ? 'text-success'
                  : s.confidence >= 0.5 ? 'text-warning'
                  : 'text-text-muted'
                )}>
                  {(s.confidence * 100).toFixed(0)}%
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          {resolve.error && (
            <p className="text-xs text-danger flex-1">{(resolve.error as Error).message}</p>
          )}
          <button
            onClick={() => selectedProductId && handleConfirm(selectedProductId)}
            disabled={!selectedProductId || resolve.isPending}
            className="rounded-md bg-success px-4 py-1.5 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-40"
          >
            {resolve.isPending ? 'Asignando…' : 'Asignar producto + crear stock'}
          </button>
        </div>
      </div>
    </div>
  )
}
