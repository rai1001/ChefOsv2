'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSupplier, useSupplierOffers, useAddOffer } from '@/features/catalog/hooks/use-suppliers'
import { useProducts } from '@/features/catalog/hooks/use-products'
import { useUnits } from '@/features/recipes/hooks/use-units'
import { ArrowLeft, Plus, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SupplierDetailPage() {
  const params = useParams()
  const supplierId = params.id as string

  const { data: supplier, isLoading } = useSupplier(supplierId)
  const { data: offers } = useSupplierOffers(supplierId)
  const { data: products } = useProducts()
  const { data: units } = useUnits()
  const addOffer = useAddOffer()

  const [showOfferForm, setShowOfferForm] = useState(false)
  const [productId, setProductId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [price, setPrice] = useState('')
  const [minQty, setMinQty] = useState('')

  function handleAddOffer(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || !price) return
    addOffer.mutate(
      {
        supplier_id: supplierId,
        product_id: productId,
        unit_id: unitId || undefined,
        unit_price: parseFloat(price),
        min_quantity: minQty ? parseFloat(minQty) : undefined,
      },
      {
        onSuccess: () => {
          setProductId('')
          setUnitId('')
          setPrice('')
          setMinQty('')
          setShowOfferForm(false)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-bg-hover" />
        <div className="h-64 animate-pulse rounded-lg bg-bg-hover" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="p-12 text-center">
        <p className="text-text-secondary">Proveedor no encontrado</p>
        <Link href="/catalog/suppliers" className="mt-4 text-accent hover:underline">Volver</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/catalog/suppliers"
          className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{supplier.name}</h1>
          {supplier.contact_name && (
            <p className="text-sm text-text-muted">{supplier.contact_name}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Info */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Datos del proveedor</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Teléfono</p>
              <p className="mt-1 text-text-primary">{supplier.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Email</p>
              <p className="mt-1 text-text-primary">{supplier.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">CIF/NIF</p>
              <p className="mt-1 text-text-primary">{supplier.tax_id ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Condiciones</p>
              <p className="mt-1 text-text-primary">{supplier.payment_terms ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Pedido mínimo</p>
              <p className="mt-1 text-text-primary">
                {supplier.min_order_amount ? `${supplier.min_order_amount.toFixed(2)} EUR` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Rating</p>
              <p className="mt-1 text-text-primary flex items-center gap-1">
                {supplier.rating > 0 ? (
                  <>
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    {supplier.rating}
                  </>
                ) : '—'}
              </p>
            </div>
          </div>
          {supplier.address && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Dirección</p>
              <p className="mt-1 text-sm text-text-secondary">{supplier.address}</p>
            </div>
          )}
          {supplier.notes && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Notas</p>
              <p className="mt-1 text-sm text-text-secondary">{supplier.notes}</p>
            </div>
          )}
        </div>

        {/* Offers */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Ofertas</h2>
            <button
              onClick={() => setShowOfferForm(!showOfferForm)}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
            >
              <Plus className="h-3 w-3" />
              Añadir
            </button>
          </div>

          {showOfferForm && (
            <form onSubmit={handleAddOffer} className="space-y-2 border-b border-border pb-4">
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
              >
                <option value="">Seleccionar producto *</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Precio *"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                />
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                >
                  <option value="">Unidad</option>
                  {units?.map((u) => (
                    <option key={u.id} value={u.id}>{u.abbreviation}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Mín. cant."
                  value={minQty}
                  onChange={(e) => setMinQty(e.target.value)}
                  className="rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={addOffer.isPending}
                className="w-full rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {addOffer.isPending ? 'Añadiendo...' : 'Añadir oferta'}
              </button>
            </form>
          )}

          {!offers || offers.length === 0 ? (
            <p className="text-sm text-text-muted">Sin ofertas todavía.</p>
          ) : (
            <div className="space-y-2">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className={cn(
                    'flex items-center justify-between rounded-md border p-3',
                    offer.is_preferred ? 'border-success bg-success/5' : 'border-border/50'
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {offer.product?.name ?? 'Producto'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {offer.unit_price.toFixed(2)} EUR/{offer.unit?.abbreviation ?? 'ud'}
                    </p>
                  </div>
                  {offer.is_preferred && (
                    <span className="flex items-center gap-1 text-xs font-medium text-success">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      Preferido
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
