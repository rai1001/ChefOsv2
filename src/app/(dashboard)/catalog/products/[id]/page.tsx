'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useProduct } from '@/features/catalog/hooks/use-products'
import { useProductOffers, useSetPreferredOffer } from '@/features/catalog/hooks/use-suppliers'
import {
  STORAGE_TYPE_LABELS,
  STORAGE_TYPE_COLORS,
} from '@/features/catalog/types'
import { ALLERGEN_LABELS, type Allergen } from '@/features/recipes/types'
import { ArrowLeft, Star, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string

  const { data: product, isLoading } = useProduct(productId)
  const { data: offers } = useProductOffers(productId)
  const setPreferred = useSetPreferredOffer()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-bg-hover" />
        <div className="h-64 animate-pulse rounded-lg bg-bg-hover" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-12 text-center">
        <p className="text-text-secondary">Producto no encontrado</p>
        <Link href="/catalog" className="mt-4 text-accent hover:underline">Volver</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/catalog"
          className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{product.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-text-muted">{product.category?.name ?? 'Sin categoría'}</span>
            <span className="text-text-muted">·</span>
            <span className={cn('text-sm', STORAGE_TYPE_COLORS[product.storage_type])}>
              {STORAGE_TYPE_LABELS[product.storage_type]}
            </span>
            {product.sku && (
              <>
                <span className="text-text-muted">·</span>
                <span className="text-sm text-text-muted">SKU: {product.sku}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Detalles</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Unidad</p>
              <p className="mt-1 text-text-primary">{product.default_unit?.abbreviation ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Vida útil</p>
              <p className="mt-1 text-text-primary">{product.shelf_life_days ? `${product.shelf_life_days} días` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Stock mínimo</p>
              <p className="mt-1 text-text-primary">{product.min_stock ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Punto reposición</p>
              <p className="mt-1 text-text-primary">{product.reorder_point ?? '—'}</p>
            </div>
          </div>
          {product.description && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Descripción</p>
              <p className="mt-1 text-sm text-text-secondary">{product.description}</p>
            </div>
          )}
          {product.allergens.length > 0 && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Alérgenos</p>
              <div className="flex flex-wrap gap-1">
                {product.allergens.map((a) => (
                  <span key={a} className="rounded-full border border-warning bg-warning/10 px-2 py-0.5 text-xs text-warning">
                    {ALLERGEN_LABELS[a as Allergen] ?? a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Offers */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Ofertas de proveedores</h2>
          {!offers || offers.length === 0 ? (
            <p className="text-sm text-text-muted">Sin ofertas todavía.</p>
          ) : (
            <div className="space-y-2">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className={cn(
                    'flex items-center justify-between rounded-md border p-3',
                    offer.is_preferred
                      ? 'border-success bg-success/5'
                      : 'border-border'
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {offer.supplier?.name ?? 'Proveedor'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {offer.unit_price.toFixed(2)} EUR/{offer.unit?.abbreviation ?? 'ud'}
                      {offer.min_quantity && ` (mín. ${offer.min_quantity})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {offer.is_preferred ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-success">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Preferido
                      </span>
                    ) : (
                      <button
                        onClick={() => setPreferred.mutate(offer.id)}
                        disabled={setPreferred.isPending}
                        className="text-xs text-text-muted hover:text-accent"
                      >
                        Marcar preferido
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
