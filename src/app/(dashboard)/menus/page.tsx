'use client'

import { useState } from 'react'
import { useMenus, useCreateMenu } from '@/features/recipes/hooks/use-menus'
import {
  MENU_TYPES,
  MENU_TYPE_LABELS,
  type MenuType,
} from '@/features/recipes/types'
import { Plus, UtensilsCrossed } from 'lucide-react'

export default function MenusPage() {
  const { data: menus, isLoading } = useMenus()
  const createMenu = useCreateMenu()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [menuType, setMenuType] = useState<MenuType>('seated')
  const [description, setDescription] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createMenu.mutate(
      {
        name,
        menu_type: menuType,
        description: description || undefined,
      },
      {
        onSuccess: () => {
          setName('')
          setDescription('')
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Menús</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Nuevo menú
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-bg-card p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="menuName" className="block text-sm text-text-secondary">
                Nombre *
              </label>
              <input
                id="menuName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Menú Banquete Premium"
              />
            </div>
            <div>
              <label htmlFor="menuType" className="block text-sm text-text-secondary">
                Tipo *
              </label>
              <select
                id="menuType"
                value={menuType}
                onChange={(e) => setMenuType(e.target.value as MenuType)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {MENU_TYPES.map((t) => (
                  <option key={t} value={t}>{MENU_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="menuDesc" className="block text-sm text-text-secondary">
              Descripción
            </label>
            <textarea
              id="menuDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMenu.isPending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {createMenu.isPending ? 'Creando...' : 'Crear menú'}
            </button>
          </div>
        </form>
      )}

      {/* Menu list */}
      <div className="rounded-lg border border-border bg-bg-card">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
                <div className="h-4 w-40 animate-pulse rounded bg-bg-hover" />
                <div className="h-4 w-20 animate-pulse rounded bg-bg-hover" />
              </div>
            ))}
          </div>
        ) : !menus || menus.length === 0 ? (
          <div className="p-12 text-center">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-text-muted" />
            <p className="mt-3 text-text-secondary">No hay menús todavía</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" />
              Crear primer menú
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3">Menú</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Plantilla</th>
                <th className="px-4 py-3">Coste total</th>
              </tr>
            </thead>
            <tbody>
              {menus.map((menu) => (
                <tr
                  key={menu.id}
                  className="border-b border-border last:border-0 hover:bg-bg-hover"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{menu.name}</p>
                    {menu.description && (
                      <p className="text-xs text-text-muted">{menu.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {MENU_TYPE_LABELS[menu.menu_type]}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {menu.is_template ? 'Sí' : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {menu.total_cost > 0 ? `${menu.total_cost.toFixed(2)} EUR` : '—'}
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
