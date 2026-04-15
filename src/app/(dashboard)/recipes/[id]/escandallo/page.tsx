'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  useEscandalloLive,
  useSyncEscandalloPrices,
} from '@/features/recipes/hooks/use-escandallo'
import {
  RECIPE_STATUS_COLORS,
  RECIPE_CATEGORY_LABELS,
  type RecipeCategory,
  type RecipeStatus,
} from '@/features/recipes/types'
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  Unlink,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TARGET_FC_PCT = 28

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const abs = Math.abs(pct)
  const up = pct > 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-medium',
      up ? 'text-danger' : 'text-success'
    )}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : '-'}{abs.toFixed(1)}%
    </span>
  )
}

export default function EscandalloPage() {
  const params = useParams()
  const recipeId = params.id as string

  const { data: escandallo, isLoading, dataUpdatedAt, refetch, isRefetching } = useEscandalloLive(recipeId)
  const sync = useSyncEscandalloPrices()
  const [syncResult, setSyncResult] = useState<{ changes_count: number } | null>(null)
  const [updatedAgo, setUpdatedAgo] = useState<number | null>(null)

  useEffect(() => {
    if (!dataUpdatedAt) return
    const id = setInterval(() => {
      setUpdatedAgo(Math.round((Date.now() - dataUpdatedAt) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [dataUpdatedAt])

  function handleSync() {
    sync.mutate(recipeId, {
      onSuccess: (result) => {
        setSyncResult(result)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-bg-hover" />
        <div className="h-48 animate-pulse rounded-lg bg-bg-hover" />
        <div className="h-64 animate-pulse rounded-lg bg-bg-hover" />
      </div>
    )
  }

  if (!escandallo) {
    return (
      <div className="p-12 text-center">
        <p className="text-text-secondary">Receta no encontrada</p>
        <Link href="/recipes" className="mt-4 inline-block text-accent hover:underline">
          Volver a recetas
        </Link>
      </div>
    )
  }

  const ings = escandallo.ingredients ?? []
  const changedCount = ings.filter((i) => i.price_changed).length

  // Compute projected totals with new prices
  const projectedTotal = ings.reduce((acc, i) => acc + i.line_cost_new, 0)
  const projectedCostPerServing = escandallo.servings > 0 ? projectedTotal / escandallo.servings : 0
  const projectedFCPct = escandallo.target_price && escandallo.target_price > 0
    ? (projectedCostPerServing / escandallo.target_price) * 100
    : null
  const currentFCPct = escandallo.stored_food_cost_pct
  const currentTotal = escandallo.stored_total_cost
  const costDelta = projectedTotal - currentTotal
  const pvpSugerido = projectedCostPerServing > 0
    ? projectedCostPerServing / (TARGET_FC_PCT / 100)
    : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link
            href={`/recipes/${recipeId}`}
            className="mt-0.5 rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text-primary">{escandallo.recipe_name}</h1>
              <span className={cn('text-sm font-medium', RECIPE_STATUS_COLORS[escandallo.status as RecipeStatus])}>
                {escandallo.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm text-text-muted">
                {RECIPE_CATEGORY_LABELS[escandallo.category as RecipeCategory]}
              </span>
              <span className="text-text-muted">·</span>
              <span className="text-sm text-text-muted">{escandallo.servings} raciones</span>
              {updatedAgo !== null && (
                <>
                  <span className="text-text-muted">·</span>
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    Actualizado hace {updatedAgo < 60 ? `${updatedAgo}s` : `${Math.round(updatedAgo / 60)} min`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefetching && 'animate-spin')} />
            Actualizar
          </button>

          {escandallo.has_price_changes && (
            <button
              onClick={handleSync}
              disabled={sync.isPending}
              className="flex items-center gap-1.5 rounded-md bg-warning px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', sync.isPending && 'animate-spin')} />
              {sync.isPending ? 'Sincronizando...' : `Aplicar precios (${changedCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Price change alert */}
      {escandallo.has_price_changes && !syncResult && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">
              {changedCount} ingrediente{changedCount !== 1 ? 's' : ''} con precio actualizado en albaranes
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              El escandallo muestra los nuevos precios en la columna "Albarán". Aplica los cambios para recalcular márgenes.
            </p>
          </div>
        </div>
      )}

      {syncResult && (
        <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
          <CheckCircle className="h-5 w-5 shrink-0 text-success" />
          <p className="text-sm text-success font-medium">
            {syncResult.changes_count > 0
              ? `${syncResult.changes_count} precios actualizados desde el último albarán`
              : 'Sin cambios de precio pendientes'}
          </p>
        </div>
      )}

      {sync.error && (
        <p className="text-sm text-danger">{(sync.error as Error).message}</p>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Coste actual</p>
          <p className="mt-2 text-xl font-bold text-text-primary">
            {currentTotal.toFixed(2)}
            <span className="ml-1 text-xs font-normal text-text-muted">EUR</span>
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {escandallo.stored_cost_per_serving.toFixed(2)} EUR/ración
          </p>
        </div>

        <div className={cn(
          'rounded-lg border p-4',
          escandallo.has_price_changes
            ? 'border-warning/40 bg-warning/5'
            : 'border-border bg-bg-card'
        )}>
          <p className="text-xs text-text-muted uppercase tracking-wider">Coste proyectado</p>
          <p className="mt-2 text-xl font-bold text-text-primary">
            {projectedTotal.toFixed(2)}
            <span className="ml-1 text-xs font-normal text-text-muted">EUR</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
            {projectedCostPerServing.toFixed(2)} EUR/ración
            {costDelta !== 0 && (
              <DeltaBadge pct={currentTotal > 0 ? (costDelta / currentTotal) * 100 : null} />
            )}
          </p>
        </div>

        <div className={cn(
          'rounded-lg border p-4',
          currentFCPct > 35 ? 'border-danger/30 bg-danger/5' :
          currentFCPct > 30 ? 'border-warning/30 bg-warning/5' :
          'border-border bg-bg-card'
        )}>
          <p className="text-xs text-text-muted uppercase tracking-wider">Food cost actual</p>
          <p className={cn(
            'mt-2 text-xl font-bold',
            currentFCPct > 35 ? 'text-danger' :
            currentFCPct > 30 ? 'text-warning' : 'text-success'
          )}>
            {currentFCPct.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-xs text-text-muted">objetivo ≤ {TARGET_FC_PCT}%</p>
        </div>

        <div className="rounded-lg border border-border bg-bg-card p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">PVP sugerido</p>
          <p className="mt-2 text-xl font-bold text-accent">
            {pvpSugerido ? `${pvpSugerido.toFixed(2)}` : '—'}
            {pvpSugerido && <span className="ml-1 text-xs font-normal text-text-muted">EUR</span>}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {projectedFCPct !== null
              ? `FC proyectado: ${projectedFCPct.toFixed(1)}%`
              : 'Sin PVP objetivo'}
          </p>
        </div>
      </div>

      {/* Ingredient table */}
      <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Desglose de ingredientes
          </h3>
          <span className="text-xs text-text-muted">
            {ings.length} ingrediente{ings.length !== 1 ? 's' : ''}
            {changedCount > 0 && (
              <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-warning">
                {changedCount} con cambio
              </span>
            )}
          </span>
        </div>

        {ings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2.5">Ingrediente</th>
                  <th className="px-4 py-2.5 text-right">Neto</th>
                  <th className="px-4 py-2.5 text-right">€/ud actual</th>
                  <th className="px-4 py-2.5 text-right">€/ud albarán</th>
                  <th className="px-4 py-2.5">Proveedor · Albarán</th>
                  <th className="px-4 py-2.5 text-right">Coste actual</th>
                  <th className="px-4 py-2.5 text-right">Coste proyectado</th>
                  <th className="px-4 py-2.5 text-right">Δ</th>
                </tr>
              </thead>
              <tbody>
                {ings.map((ing) => {
                  const totalIng = ings.reduce((a, i) => a + i.line_cost, 0)
                  const pctTotal = totalIng > 0 ? (ing.line_cost / totalIng) * 100 : 0
                  return (
                    <tr
                      key={ing.id}
                      className={cn(
                        'border-b border-border/50 last:border-0',
                        ing.price_changed && 'bg-warning/3'
                      )}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">{ing.ingredient_name}</span>
                          {!ing.product_id && (
                            <span className="flex items-center gap-0.5 text-xs text-text-muted">
                              <Unlink className="h-3 w-3" />
                              sin vincular
                            </span>
                          )}
                          {ing.price_changed && (
                            <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <div className="h-1 rounded-full bg-bg-hover overflow-hidden w-20">
                            <div
                              className="h-full rounded-full bg-accent/50"
                              style={{ width: `${Math.min(pctTotal, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-muted">{pctTotal.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">
                        {ing.quantity_net.toFixed(3)}
                        {ing.unit_abbreviation && (
                          <span className="ml-0.5 text-text-muted">{ing.unit_abbreviation}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">
                        {ing.unit_cost > 0 ? ing.unit_cost.toFixed(4) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {ing.latest_gr_cost !== null ? (
                          <span className={cn(
                            'font-medium',
                            ing.price_changed
                              ? ing.price_delta! > 0 ? 'text-danger' : 'text-success'
                              : 'text-text-secondary'
                          )}>
                            {ing.latest_gr_cost.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-text-muted text-xs">sin albarán</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {ing.latest_gr_supplier ? (
                          <div>
                            <p className="text-xs text-text-secondary">{ing.latest_gr_supplier}</p>
                            <p className="text-xs text-text-muted">
                              {ing.latest_gr_delivery_note ?? ing.latest_gr_receipt ?? ''}
                              {ing.latest_gr_date && (
                                <span className="ml-1">
                                  · {new Date(ing.latest_gr_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-text-primary">
                        {ing.line_cost.toFixed(2)}
                      </td>
                      <td className={cn(
                        'px-4 py-2.5 text-right font-medium',
                        ing.price_changed
                          ? ing.line_cost_new > ing.line_cost ? 'text-danger' : 'text-success'
                          : 'text-text-muted'
                      )}>
                        {ing.line_cost_new.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {ing.price_changed ? (
                          <DeltaBadge pct={ing.price_delta_pct} />
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-text-muted mx-auto" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-bg-hover/30">
                  <td colSpan={5} className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                    Total
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-text-primary">
                    {currentTotal.toFixed(2)}
                  </td>
                  <td className={cn(
                    'px-4 py-2.5 text-right font-bold',
                    costDelta > 0 ? 'text-danger' : costDelta < 0 ? 'text-success' : 'text-text-primary'
                  )}>
                    {projectedTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DeltaBadge pct={currentTotal > 0 ? (costDelta / currentTotal) * 100 : null} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-text-muted">
              Esta receta no tiene ingredientes todavía.
            </p>
            <Link href={`/recipes/${recipeId}`} className="mt-2 inline-block text-accent hover:underline text-sm">
              Añadir ingredientes
            </Link>
          </div>
        )}
      </div>

      {/* Unlinked notice */}
      {ings.some((i) => !i.product_id) && (
        <p className="flex items-center gap-2 text-xs text-text-muted">
          <Unlink className="h-3.5 w-3.5 shrink-0" />
          Los ingredientes "sin vincular" no tienen producto del catálogo asignado — sus precios no se sincronizan automáticamente.
        </p>
      )}
    </div>
  )
}
