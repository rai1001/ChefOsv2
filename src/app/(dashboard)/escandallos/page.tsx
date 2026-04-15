'use client'

import { useState, useMemo, useId, useRef } from 'react'
import Link from 'next/link'
import { useCatalogPrices } from '@/features/recipes/hooks/use-escandallo'
import { useCreateRecipe } from '@/features/recipes/hooks/use-recipes'
import { RECIPE_CATEGORIES, RECIPE_CATEGORY_LABELS, type RecipeCategory } from '@/features/recipes/types'
import {
  Plus,
  Trash2,
  Calculator,
  TrendingUp,
  TrendingDown,
  ChefHat,
  Search,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const TARGET_FC_PCT = 28

interface SimLine {
  id: string
  product_id: string | null
  ingredient_name: string
  unit_abbreviation: string
  quantity_gross: number
  waste_pct: number
  unit_cost: number
  source: 'catalog_gr' | 'catalog_offer' | 'manual'
  supplier: string | null
  gr_date: string | null
}

function calcNet(qty: number, waste: number) {
  return qty * (1 - waste / 100)
}

export default function EscandallosPage() {
  const uid = useId()
  const lineCounter = useRef(0)
  const router = useRouter()
  const { data: catalog, isLoading: loadingCatalog } = useCatalogPrices()
  const createRecipe = useCreateRecipe()

  // Simulator state
  const [dishName, setDishName] = useState('')
  const [servings, setServings] = useState(10)
  const [targetPrice, setTargetPrice] = useState('')
  const [lines, setLines] = useState<SimLine[]>([])

  // Product search state
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Manual line form
  const [manualName, setManualName] = useState('')
  const [manualUnit, setManualUnit] = useState('')
  const [manualQty, setManualQty] = useState('')
  const [manualWaste, setManualWaste] = useState('0')
  const [manualCost, setManualCost] = useState('')

  const filteredCatalog = useMemo(() => {
    if (!catalog || !search.trim()) return []
    const q = search.toLowerCase()
    return catalog.filter(
      (p) =>
        p.product_name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q)
    ).slice(0, 10)
  }, [catalog, search])

  function addFromCatalog(productId: string) {
    const p = catalog?.find((c) => c.product_id === productId)
    if (!p) return
    const newLine: SimLine = {
      id: `${uid}-${lineCounter.current++}`,
      product_id: p.product_id,
      ingredient_name: p.product_name,
      unit_abbreviation: p.unit_abbreviation ?? '',
      quantity_gross: 1,
      waste_pct: 0,
      unit_cost: p.best_price ?? 0,
      source: p.latest_gr_cost != null ? 'catalog_gr' : p.offer_price != null ? 'catalog_offer' : 'manual',
      supplier: p.latest_gr_supplier,
      gr_date: p.latest_gr_date,
    }
    setLines((prev) => [...prev, newLine])
    setSearch('')
    setShowDropdown(false)
  }

  function addManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manualName || !manualQty) return
    const newLine: SimLine = {
      id: `${uid}-${lineCounter.current++}`,
      product_id: null,
      ingredient_name: manualName,
      unit_abbreviation: manualUnit,
      quantity_gross: parseFloat(manualQty),
      waste_pct: parseFloat(manualWaste) || 0,
      unit_cost: parseFloat(manualCost) || 0,
      source: 'manual',
      supplier: null,
      gr_date: null,
    }
    setLines((prev) => [...prev, newLine])
    setManualName('')
    setManualUnit('')
    setManualQty('')
    setManualWaste('0')
    setManualCost('')
  }

  function updateLine(id: string, field: keyof SimLine, value: string | number) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    )
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  // Computed totals
  const totals = useMemo(() => {
    const lineData = lines.map((l) => {
      const net = calcNet(l.quantity_gross, l.waste_pct)
      const cost = net * l.unit_cost
      return { net, cost }
    })
    const totalCost = lineData.reduce((a, l) => a + l.cost, 0)
    const costPerServing = servings > 0 ? totalCost / servings : 0
    const pvp = parseFloat(targetPrice) || 0
    const fcPct = pvp > 0 && costPerServing > 0 ? (costPerServing / pvp) * 100 : null
    const pvpSugerido = costPerServing > 0 ? costPerServing / (TARGET_FC_PCT / 100) : null
    return { totalCost, costPerServing, fcPct, pvpSugerido, lineData }
  }, [lines, servings, targetPrice])

  async function saveAsRecipeDraft() {
    if (!dishName) return
    const id = await createRecipe.mutateAsync({
      name: dishName,
      category: 'meat' as RecipeCategory, // default — user can change in recipe editor
      servings,
      target_price: parseFloat(targetPrice) || undefined,
    })
    router.push(`/recipes/${id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Simulador de escandallo</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Calcula el coste de un plato con precios reales del último albarán, sin crear una receta todavía
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* LEFT: builder */}
        <div className="space-y-4">
          {/* Dish config */}
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider">Nombre del plato</label>
                <input
                  type="text"
                  placeholder="p.ej. Merluza a la romana"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider">Raciones</label>
                <input
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider">PVP objetivo (EUR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Ingredient table */}
          {lines.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                    <th className="px-4 py-2.5">Ingrediente</th>
                    <th className="px-4 py-2.5 text-right w-24">Bruto</th>
                    <th className="px-4 py-2.5 text-right w-20">Merma %</th>
                    <th className="px-4 py-2.5 text-right w-24">€/ud</th>
                    <th className="px-4 py-2.5 text-right w-24">Coste línea</th>
                    <th className="px-4 py-2.5 text-right w-16">% total</th>
                    <th className="px-4 py-2.5 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const net = calcNet(line.quantity_gross, line.waste_pct)
                    const lineCost = net * line.unit_cost
                    const pct = totals.totalCost > 0 ? (lineCost / totals.totalCost) * 100 : 0
                    return (
                      <tr key={line.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-text-primary font-medium">{line.ingredient_name}</span>
                            {line.source === 'catalog_gr' && (
                              <span className="rounded px-1.5 py-0.5 text-xs bg-success/10 text-success">
                                albarán
                              </span>
                            )}
                            {line.source === 'catalog_offer' && (
                              <span className="rounded px-1.5 py-0.5 text-xs bg-info/10 text-info">
                                oferta
                              </span>
                            )}
                            {line.source === 'manual' && (
                              <span className="rounded px-1.5 py-0.5 text-xs bg-bg-hover text-text-muted">
                                manual
                              </span>
                            )}
                          </div>
                          {line.supplier && line.gr_date && (
                            <p className="text-xs text-text-muted mt-0.5">
                              {line.supplier} · {new Date(line.gr_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={line.quantity_gross}
                            onChange={(e) => updateLine(line.id, 'quantity_gross', parseFloat(e.target.value) || 0)}
                            className="w-20 rounded border border-border bg-bg-input px-2 py-1 text-right text-sm text-text-primary focus:border-border-focus focus:outline-none"
                          />
                          {line.unit_abbreviation && (
                            <span className="ml-1 text-xs text-text-muted">{line.unit_abbreviation}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={line.waste_pct}
                            onChange={(e) => updateLine(line.id, 'waste_pct', parseFloat(e.target.value) || 0)}
                            className="w-16 rounded border border-border bg-bg-input px-2 py-1 text-right text-sm text-text-primary focus:border-border-focus focus:outline-none"
                          />
                          <span className="ml-0.5 text-xs text-text-muted">%</span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            value={line.unit_cost}
                            onChange={(e) => updateLine(line.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                            className="w-20 rounded border border-border bg-bg-input px-2 py-1 text-right text-sm text-text-primary focus:border-border-focus focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-text-primary">
                          {lineCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="h-1.5 w-12 rounded-full bg-bg-hover overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', pct > 40 ? 'bg-warning' : 'bg-accent')}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-text-muted w-8 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => removeLine(line.id)}
                            className="text-text-muted hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-bg-hover/30">
                    <td colSpan={4} className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                      Total ({lines.length} ingredientes)
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-text-primary">
                      {totals.totalCost.toFixed(2)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Add from catalog */}
          <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Añadir desde catálogo
            </p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder={loadingCatalog ? 'Cargando catálogo...' : 'Buscar producto...'}
                value={search}
                disabled={loadingCatalog}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full rounded-md border border-border bg-bg-input py-1.5 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
              />
              {showDropdown && filteredCatalog.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-md border border-border bg-bg-card shadow-lg">
                  {filteredCatalog.map((p) => (
                    <button
                      key={p.product_id}
                      onClick={() => addFromCatalog(p.product_id)}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-bg-hover"
                    >
                      <div className="flex items-center gap-2 text-left">
                        <span className="text-text-primary">{p.product_name}</span>
                        {p.category && (
                          <span className="text-xs text-text-muted">{p.category}</span>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        {p.best_price != null ? (
                          <span className={cn(
                            'text-xs font-medium',
                            p.latest_gr_cost != null ? 'text-success' : 'text-text-muted'
                          )}>
                            {p.best_price.toFixed(4)} EUR
                            {p.latest_gr_cost != null && (
                              <span className="ml-1 text-success">· albarán</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">sin precio</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual line */}
            <form onSubmit={addManual} className="flex items-end gap-2 pt-1 border-t border-border">
              <div className="flex-1">
                <label className="text-xs text-text-muted">Nombre manual</label>
                <input
                  type="text"
                  placeholder="Ingrediente libre..."
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                />
              </div>
              <div className="w-20">
                <label className="text-xs text-text-muted">Cantidad</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                />
              </div>
              <div className="w-16">
                <label className="text-xs text-text-muted">Unidad</label>
                <input
                  type="text"
                  placeholder="kg"
                  value={manualUnit}
                  onChange={(e) => setManualUnit(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                />
              </div>
              <div className="w-16">
                <label className="text-xs text-text-muted">Merma %</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={manualWaste}
                  onChange={(e) => setManualWaste(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-text-muted">€/ud</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={manualCost}
                  onChange={(e) => setManualCost(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!manualName || !manualQty}
                className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Añadir
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: live summary */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-bg-card p-5 sticky top-4 space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Resumen en tiempo real
            </h3>

            {lines.length === 0 ? (
              <div className="py-8 text-center">
                <Calculator className="mx-auto h-8 w-8 text-text-muted" />
                <p className="mt-2 text-sm text-text-muted">
                  Añade ingredientes para ver el coste
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Coste total</span>
                    <span className="text-lg font-bold text-text-primary">
                      {totals.totalCost.toFixed(2)} EUR
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Coste / ración</span>
                    <span className="text-base font-semibold text-text-primary">
                      {totals.costPerServing.toFixed(2)} EUR
                    </span>
                  </div>

                  {totals.pvpSugerido && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">
                        PVP sugerido ({TARGET_FC_PCT}% FC)
                      </span>
                      <span className="text-base font-semibold text-accent">
                        {totals.pvpSugerido.toFixed(2)} EUR
                      </span>
                    </div>
                  )}

                  {totals.fcPct !== null && (
                    <div className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-secondary">Food cost %</span>
                        <span className={cn(
                          'text-xl font-bold',
                          totals.fcPct > 35 ? 'text-danger' :
                          totals.fcPct > 30 ? 'text-warning' : 'text-success'
                        )}>
                          {totals.fcPct.toFixed(1)}%
                        </span>
                      </div>
                      {/* FC meter */}
                      <div className="mt-2 h-2 rounded-full bg-bg-hover overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            totals.fcPct > 35 ? 'bg-danger' :
                            totals.fcPct > 30 ? 'bg-warning' : 'bg-success'
                          )}
                          style={{ width: `${Math.min(totals.fcPct, 100)}%` }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-text-muted">
                        <span>0%</span>
                        <span className="text-success">{TARGET_FC_PCT}% objetivo</span>
                        <span>50%</span>
                      </div>
                    </div>
                  )}

                  {totals.fcPct === null && parseFloat(targetPrice) === 0 && (
                    <div className="flex items-center gap-2 rounded-md bg-bg-hover p-3 text-xs text-text-muted">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Introduce un PVP objetivo para ver el food cost %
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-xs text-text-muted uppercase tracking-wider">
                    Guardar como receta
                  </p>
                  {!dishName && (
                    <p className="text-xs text-text-muted">
                      Introduce el nombre del plato arriba para guardar como borrador.
                    </p>
                  )}
                  <button
                    onClick={saveAsRecipeDraft}
                    disabled={!dishName || createRecipe.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/5 disabled:opacity-40"
                  >
                    <ChefHat className="h-4 w-4" />
                    {createRecipe.isPending ? 'Guardando...' : 'Guardar como receta borrador'}
                  </button>
                  {dishName && (
                    <p className="text-xs text-text-muted">
                      Se creará como borrador en categoría "Carnes" — puedes cambiarla en el editor.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Price source legend */}
          <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Fuentes de precio</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="rounded px-1.5 py-0.5 bg-success/10 text-success">albarán</span>
                <span className="text-text-muted">Último precio real pagado (goods receipt)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded px-1.5 py-0.5 bg-info/10 text-info">oferta</span>
                <span className="text-text-muted">Precio del proveedor preferido</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded px-1.5 py-0.5 bg-bg-hover text-text-muted">manual</span>
                <span className="text-text-muted">Precio introducido a mano</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
