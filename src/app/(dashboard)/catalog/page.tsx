'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useProducts, useCategories, useCreateProduct } from '@/features/catalog/hooks/use-products'
import {
  STORAGE_TYPE_LABELS,
  STORAGE_TYPE_COLORS,
  type StorageType,
} from '@/features/catalog/types'
import { Plus, Package, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUnits } from '@/features/recipes/hooks/use-units'

export default function CatalogPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const { data: products, isLoading } = useProducts({
    category_id: categoryFilter || undefined,
    search: search || undefined,
  })
  const { data: categories } = useCategories()
  const { data: units } = useUnits()
  const createProduct = useCreateProduct()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [catId, setCatId] = useState('')
  const [storage, setStorage] = useState<StorageType>('ambient')
  const [unitId, setUnitId] = useState('')
  const [sku, setSku] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createProduct.mutate(
      {
        name,
        category_id: catId || undefined,
        storage_type: storage,
        default_unit_id: unitId || undefined,
        sku: sku || undefined,
      },
      {
        onSuccess: () => {
          setName('')
          setCatId('')
          setSku('')
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-text-primary">Productos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
        </button>
      </div>

      {/* Quick create form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-text-secondary">Nombre *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                placeholder="Solomillo de ternera"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary">Categoría</label>
              <select
                value={catId}
                onChange={(e) => setCatId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
              >
                <option value="">Sin categoría</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary">Almacenamiento</label>
              <select
                value={storage}
                onChange={(e) => setStorage(e.target.value as StorageType)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
              >
                <option value="ambient">Ambiente</option>
                <option value="refrigerated">Refrigerado</option>
                <option value="frozen">Congelado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-text-secondary">Unidad por defecto</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
              >
                <option value="">—</option>
                {units?.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                placeholder="CARN-SOL-001"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createProduct.isPending}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {createProduct.isPending ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-bg-input pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
          >
            <option value="">Todas las categorías</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product list */}
      <div className="rounded-lg border border-border bg-bg-card">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
                <div className="h-4 w-40 skeleton" />
                <div className="h-4 w-24 skeleton" />
              </div>
            ))}
          </div>
        ) : !products || products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-text-muted" />
            <p className="mt-3 text-text-secondary">No hay productos todavía</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" />
              Crear primer producto
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Almacenamiento</th>
                <th className="px-4 py-3">Unidad</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-border last:border-0 hover:bg-bg-hover"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/catalog/products/${product.id}`}
                      className="font-medium text-text-primary hover:text-accent"
                    >
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {product.category?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {product.sku ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-sm', STORAGE_TYPE_COLORS[product.storage_type])}>
                      {STORAGE_TYPE_LABELS[product.storage_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {product.default_unit?.abbreviation ?? '—'}
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
