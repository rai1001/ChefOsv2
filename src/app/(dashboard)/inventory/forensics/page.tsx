'use client'

import { useState } from 'react'
import { useStockForensics } from '@/features/inventory/hooks/use-stock-counts'
import { useStockLevels } from '@/features/inventory/hooks/use-stock'
import {
  Search,
  AlertTriangle,
  TrendingDown,
  Package,
  Activity,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PERIOD_OPTIONS = [
  { value: 1, label: '1 mes' },
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
]

export default function ForensicsPage() {
  const { data: levels } = useStockLevels()
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [search, setSearch] = useState('')
  const [months, setMonths] = useState(3)

  const { data: forensics, isLoading } = useStockForensics(
    selectedProduct || undefined,
    months
  )

  const filteredProducts = levels?.filter((l) =>
    l.product_name.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const selectedName = levels?.find((l) => l.product_id === selectedProduct)?.product_name

  const alertColors = {
    ok: 'text-success',
    warning: 'text-warning',
    critical: 'text-danger',
  }

  const alertBg = {
    ok: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/10',
    critical: 'border-danger/30 bg-danger/10',
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-accent" />
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Forensics de inventario</h1>
          <p className="text-sm text-text-muted">
            Detecta pérdidas no explicadas y merma sistemática por producto
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Selector de producto */}
        <div className="md:col-span-2 rounded-xl border border-border bg-surface p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1">
            {filteredProducts.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">Sin resultados</p>
            ) : (
              filteredProducts.map((l) => (
                <button
                  key={l.product_id}
                  onClick={() => setSelectedProduct(l.product_id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedProduct === l.product_id
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-text-primary hover:bg-surface-alt'
                  )}
                >
                  <span className="font-medium">{l.product_name}</span>
                  <span className="text-text-muted text-xs ml-2">{l.current_stock.toFixed(3)} {l.unit}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Periodo */}
        <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Periodo</h2>
          <div className="space-y-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMonths(opt.value)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                  months === opt.value
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-text-primary hover:bg-surface-alt'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resultado forensics */}
      {!selectedProduct && (
        <div className="text-center py-12 text-text-muted">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecciona un producto para analizar su historial</p>
        </div>
      )}

      {selectedProduct && isLoading && (
        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-surface animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {forensics && (
        <div className="space-y-4">
          {/* Alerta principal */}
          <div
            className={cn(
              'rounded-xl border p-4 flex items-start gap-3',
              alertBg[forensics.alert]
            )}
          >
            <AlertTriangle className={cn('h-5 w-5 mt-0.5 flex-shrink-0', alertColors[forensics.alert])} />
            <div>
              <div className={cn('text-sm font-semibold', alertColors[forensics.alert])}>
                {forensics.alert === 'ok' && 'Sin alertas — producto bajo control'}
                {forensics.alert === 'warning' && 'Alerta — revisar merma o pérdidas'}
                {forensics.alert === 'critical' && 'Crítico — pérdida no explicada elevada'}
              </div>
              <div className="text-xs text-text-muted mt-1">
                {selectedName} · Últimos {forensics.period_months} meses ·
                Desde {new Date(forensics.since).toLocaleDateString('es-ES')}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Recibido"
              value={forensics.received.toFixed(3)}
              color="text-text-primary"
            />
            <MetricCard
              label="Consumido (eventos)"
              value={forensics.consumed_from_reservations.toFixed(3)}
              color="text-info"
            />
            <MetricCard
              label="Consumido (directo)"
              value={forensics.consumed_direct.toFixed(3)}
              color="text-text-secondary"
            />
            <MetricCard
              label="Merma registrada"
              value={forensics.waste_recorded.toFixed(3)}
              color={forensics.waste_rate_pct !== null && forensics.waste_rate_pct >= 20 ? 'text-warning' : 'text-text-secondary'}
              sub={forensics.waste_rate_pct !== null ? `${forensics.waste_rate_pct}% del recibido` : undefined}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Ajustes +"
              value={`+${forensics.adjustments_positive.toFixed(3)}`}
              color="text-success"
            />
            <MetricCard
              label="Ajustes −"
              value={`-${forensics.adjustments_negative.toFixed(3)}`}
              color="text-danger"
            />
            <MetricCard
              label="Pérdida no explicada"
              value={forensics.unexplained_loss.toFixed(3)}
              color={forensics.unexplained_loss_rate_pct >= 8 ? 'text-danger' : 'text-text-secondary'}
              sub={`${forensics.unexplained_loss_rate_pct}% del recibido`}
              highlight={forensics.unexplained_loss_rate_pct >= 8}
            />
            <MetricCard
              label="Excedente no explicado"
              value={`+${forensics.unexplained_surplus.toFixed(3)}`}
              color="text-text-secondary"
            />
          </div>

          {/* Interpretación */}
          {forensics.unexplained_loss_rate_pct >= 8 && (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
              <div className="text-sm font-semibold text-danger mb-1">
                Pérdida no explicada significativa
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Existe stock que se recibió pero no consta en ningún consumo, merma, ni ajuste.
                Posibles causas: robos, consumos sin registrar, errores de entrada de albarán,
                o productos dados de baja sin movimiento. Se recomienda realizar un conteo ciego
                y revisar los albaranes del periodo.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  color,
  sub,
  highlight,
}: {
  label: string
  value: string
  color: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-surface p-4',
        highlight ? 'border-danger/30' : 'border-border'
      )}
    >
      <div className={cn('text-xl font-bold', color)}>{value}</div>
      <div className="text-xs text-text-muted mt-0.5">{label}</div>
      {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
    </div>
  )
}
