'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  useStockCounts,
  useStartStockCount,
} from '@/features/inventory/hooks/use-stock-counts'
import {
  COUNT_STATUS_LABELS,
  COUNT_STATUS_COLORS,
  COUNT_TYPE_LABELS,
  type CountType,
} from '@/features/inventory/types'
import {
  ClipboardCheck,
  Plus,
  Eye,
  EyeOff,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StockCountsPage() {
  const router = useRouter()
  const { data: counts, isLoading } = useStockCounts()
  const startCount = useStartStockCount()

  const [showNewForm, setShowNewForm] = useState(false)
  const [newType, setNewType] = useState<CountType>('full')
  const [isBlind, setIsBlind] = useState(false)
  const [newLabel, setNewLabel] = useState('')

  const handleStart = async () => {
    const countId = await startCount.mutateAsync({
      count_type: newType,
      is_blind: isBlind,
      label: newLabel || undefined,
    })
    setShowNewForm(false)
    setNewLabel('')
    router.push(`/inventory/counts/${countId}`)
  }

  const active = counts?.filter((c) => c.status !== 'closed') ?? []
  const closed = counts?.filter((c) => c.status === 'closed') ?? []

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-accent" />
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Conteos de inventario</h1>
            <p className="text-sm text-text-muted">Auditoría y reconciliación de stock</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo conteo
        </button>
      </div>

      {/* Formulario nuevo conteo */}
      {showNewForm && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Configurar conteo</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipo */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Tipo
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as CountType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {(['full', 'partial', 'blind'] as CountType[]).map((t) => (
                  <option key={t} value={t}>
                    {COUNT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            {/* Etiqueta */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Etiqueta (opcional)
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="ej. Cierre semana 15"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            {/* Modo ciego */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Modo
              </label>
              <button
                onClick={() => setIsBlind((v) => !v)}
                className={cn(
                  'flex items-center gap-2 w-full rounded-lg border px-3 py-2 text-sm transition-colors',
                  isBlind
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-background text-text-secondary hover:border-accent/50'
                )}
              >
                {isBlind ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {isBlind ? 'Ciego (sin ver cantidades)' : 'Normal (con cantidades)'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleStart}
              disabled={startCount.isPending}
              className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-60 transition-colors"
            >
              {startCount.isPending ? 'Iniciando...' : 'Iniciar conteo'}
            </button>
            <button
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Conteos activos */}
          {active.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Activos ({active.length})
              </h2>
              <div className="space-y-2">
                {active.map((count) => (
                  <CountRow key={count.id} count={count} />
                ))}
              </div>
            </section>
          )}

          {/* Conteos cerrados */}
          {closed.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Cerrados ({closed.length})
              </h2>
              <div className="space-y-2">
                {closed.slice(0, 10).map((count) => (
                  <CountRow key={count.id} count={count} />
                ))}
              </div>
            </section>
          )}

          {counts?.length === 0 && (
            <div className="text-center py-16 text-text-muted">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay conteos registrados</p>
              <p className="text-xs mt-1">Inicia un conteo para auditar el inventario</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CountRow({ count }: { count: import('@/features/inventory/types').StockCount }) {
  const statusIcon = {
    open: <Clock className="h-4 w-4 text-warning" />,
    in_progress: <AlertCircle className="h-4 w-4 text-info" />,
    review: <Eye className="h-4 w-4 text-accent" />,
    closed: <CheckCircle className="h-4 w-4 text-success" />,
  }[count.status]

  return (
    <Link
      href={`/inventory/counts/${count.id}`}
      className="flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3 hover:border-accent/40 transition-colors"
    >
      <div className="flex-shrink-0">{statusIcon}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {count.label ?? COUNT_TYPE_LABELS[count.count_type]}
          </span>
          {count.is_blind && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-surface-alt text-text-muted border border-border">
              Ciego
            </span>
          )}
          <span className={cn('text-xs font-medium', COUNT_STATUS_COLORS[count.status])}>
            {COUNT_STATUS_LABELS[count.status]}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(count.started_at).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span className="text-xs text-text-muted">
            {COUNT_TYPE_LABELS[count.count_type]}
          </span>
        </div>
      </div>
    </Link>
  )
}
