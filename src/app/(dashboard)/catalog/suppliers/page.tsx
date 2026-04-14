'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSuppliers, useCreateSupplier } from '@/features/catalog/hooks/use-suppliers'
import { Truck, Plus, Star } from 'lucide-react'

export default function SuppliersPage() {
  const { data: suppliers, isLoading } = useSuppliers()
  const createSupplier = useCreateSupplier()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createSupplier.mutate(
      {
        name,
        contact_name: contact || undefined,
        phone: phone || undefined,
        email: email || undefined,
        payment_terms: paymentTerms || undefined,
      },
      {
        onSuccess: () => {
          setName('')
          setContact('')
          setPhone('')
          setEmail('')
          setPaymentTerms('')
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Proveedores</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Nuevo proveedor
        </button>
      </div>

      {/* Quick create */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary">Nombre *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                placeholder="Distribuciones García"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary">Contacto</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                placeholder="Juan García"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-text-secondary">Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                placeholder="981 123 456"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                placeholder="pedidos@garcia.es"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary">Condiciones de pago</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                placeholder="30 días"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
              Cancelar
            </button>
            <button type="submit" disabled={createSupplier.isPending} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
              {createSupplier.isPending ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      {/* Supplier list */}
      <div className="rounded-lg border border-border bg-bg-card">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
                <div className="h-4 w-40 animate-pulse rounded bg-bg-hover" />
              </div>
            ))}
          </div>
        ) : !suppliers || suppliers.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="mx-auto h-12 w-12 text-text-muted" />
            <p className="mt-3 text-text-secondary">No hay proveedores todavía</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" />
              Crear primer proveedor
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Condiciones</th>
                <th className="px-4 py-3">Rating</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-bg-hover">
                  <td className="px-4 py-3">
                    <Link
                      href={`/catalog/suppliers/${s.id}`}
                      className="font-medium text-text-primary hover:text-accent"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {s.contact_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {s.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {s.payment_terms ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {s.rating > 0 ? (
                      <span className="flex items-center gap-1 text-sm text-warning">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {s.rating}
                      </span>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
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
