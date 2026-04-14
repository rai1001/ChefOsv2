'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useShoppingList } from '@/features/production/hooks/use-shopping-list'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import { ShoppingCart, RefreshCw, Package, Warehouse } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ShoppingListDocData } from '@/features/documents/types'

const ShoppingListBtnInline = dynamic(
  () => import('@/features/documents/components/pdf-buttons').then((m) => m.ShoppingListBtnInline),
  { ssr: false, loading: () => null }
)

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function ShoppingListPage() {
  const [date, setDate] = useState(todayStr())
  const [queryDate, setQueryDate] = useState<string | undefined>(undefined)
  const { data: groups, isLoading, refetch } = useShoppingList(queryDate)
  const { data: hotel } = useActiveHotel()

  const handleGenerate = () => {
    setQueryDate(date)
  }

  const totalItems = groups?.reduce((s, g) => s + g.items.length, 0) ?? 0
  const totalSuppliers = groups?.length ?? 0

  const docData: ShoppingListDocData | null = groups && queryDate
    ? { hotel_name: hotel?.hotel_id ?? 'ChefOS v2', date: queryDate, groups }
    : null

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShoppingCart className="h-6 w-6 text-accent" />
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Lista de compras</h1>
          <p className="text-sm text-text-muted">
            Ingredientes necesarios − stock disponible, por proveedor preferido
          </p>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
            Fecha del evento
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-60 transition-colors"
        >
          {isLoading
            ? <RefreshCw className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />
          }
          Generar lista
        </button>
        {docData && <ShoppingListBtnInline data={docData} />}
      </div>

      {/* Resultados */}
      {queryDate && !isLoading && groups !== undefined && (
        <>
          {groups.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se necesita comprar nada para este día</p>
              <p className="text-xs mt-1">
                El stock disponible cubre todos los eventos confirmados
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="text-2xl font-bold text-text-primary">{totalItems}</div>
                  <div className="text-xs text-text-muted mt-1">Productos a pedir</div>
                </div>
                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="text-2xl font-bold text-text-primary">{totalSuppliers}</div>
                  <div className="text-xs text-text-muted mt-1">Proveedores</div>
                </div>
              </div>

              {/* Por proveedor */}
              <div className="space-y-4">
                {groups.map((group, idx) => (
                  <div key={group.supplier_id ?? idx} className="rounded-xl border border-border bg-surface overflow-hidden">
                    {/* Supplier header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-surface-alt border-b border-border">
                      <Warehouse className="h-4 w-4 text-text-muted flex-shrink-0" />
                      <span className="text-sm font-semibold text-text-primary">
                        {group.supplier_name ?? 'Sin proveedor asignado'}
                      </span>
                      <span className="text-xs text-text-muted ml-auto">
                        {group.items.length} producto{group.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-border">
                      {group.items.map((item) => (
                        <div
                          key={item.product_id}
                          className="flex items-center gap-4 px-4 py-3"
                        >
                          <Package className="h-4 w-4 text-text-muted flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-text-primary truncate">
                              {item.product_name}
                            </div>
                            <div className="text-xs text-text-muted mt-0.5">
                              Necesario: {item.qty_needed.toFixed(3)} {item.unit ?? ''}
                              {' · '}
                              Disponible: {item.qty_available.toFixed(3)} {item.unit ?? ''}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold text-danger">
                              {item.qty_to_order.toFixed(3)} {item.unit ?? ''}
                            </div>
                            {item.unit_price !== null && (
                              <div className="text-xs text-text-muted">
                                ~{(item.qty_to_order * item.unit_price).toFixed(2)} €
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {!queryDate && (
        <div className="text-center py-16 text-text-muted">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecciona una fecha y genera la lista</p>
        </div>
      )}
    </div>
  )
}
