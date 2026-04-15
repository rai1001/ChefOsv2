'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRecipes } from '@/features/recipes/hooks/use-recipes'
import {
  RECIPE_CATEGORIES,
  RECIPE_CATEGORY_LABELS,
  RECIPE_STATUS_LABELS,
  RECIPE_STATUS_VARIANT,
  RECIPE_DIFFICULTY_LABELS,
  ALLERGEN_LABELS,
  type RecipeCategory,
  type RecipeStatus,
} from '@/features/recipes/types'
import { Plus, ChefHat, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RecipesPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<RecipeCategory | ''>('')
  const [statusFilter, setStatusFilter] = useState<RecipeStatus | ''>('')

  const { data: recipes, isLoading } = useRecipes({
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-text-primary" style={{ fontSize: '28px' }}>Recetas</h1>
        <Link
          href="/recipes/new"
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Nueva receta
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar receta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-bg-input pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as RecipeCategory | '')}
            className="rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">Todas las categorías</option>
            {RECIPE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{RECIPE_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RecipeStatus | '')}
            className="rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="review_pending">Pendiente revisión</option>
            <option value="approved">Aprobada</option>
            <option value="deprecated">Obsoleta</option>
          </select>
        </div>
      </div>

      {/* Recipe list */}
      <div className="rounded-lg border border-border bg-bg-card">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
                <div className="h-4 w-40 skeleton" />
                <div className="h-4 w-24 skeleton" />
                <div className="h-4 w-16 skeleton" />
                <div className="h-4 w-20 skeleton" />
              </div>
            ))}
          </div>
        ) : !recipes || recipes.length === 0 ? (
          <div className="p-12 text-center">
            <ChefHat className="mx-auto h-12 w-12 text-text-muted" />
            <p className="mt-3 text-text-secondary">No hay recetas todavía</p>
            <Link
              href="/recipes/new"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" />
              Crear primera receta
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-text-muted" style={{ borderColor: 'var(--border-strong)', fontFamily: 'var(--font-code)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <th className="px-4 py-3 font-medium">Receta</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Dificultad</th>
                <th className="px-4 py-3 text-right font-medium">Raciones</th>
                <th className="px-4 py-3 text-right font-medium">Coste/ración</th>
                <th className="px-4 py-3 text-right font-medium">% Food Cost</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((recipe) => {
                const variant = RECIPE_STATUS_VARIANT[recipe.status]
                return (
                  <tr
                    key={recipe.id}
                    className={cn('status-rail border-b border-border last:border-0 hover:bg-bg-hover', variant)}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="font-medium text-text-primary hover:text-accent"
                      >
                        {recipe.name}
                      </Link>
                      {recipe.allergens.length > 0 && (
                        <p className="mt-0.5 text-xs text-warning">
                          {recipe.allergens.map((a) => ALLERGEN_LABELS[a]).join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {RECIPE_CATEGORY_LABELS[recipe.category]}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {RECIPE_DIFFICULTY_LABELS[recipe.difficulty]}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary font-data text-right">
                      {recipe.servings}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary font-data text-right">
                      {recipe.cost_per_serving > 0
                        ? `${recipe.cost_per_serving.toFixed(2)} EUR`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-data text-right">
                      <span
                        className={cn(
                          recipe.food_cost_pct > 35
                            ? 'text-danger'
                            : recipe.food_cost_pct > 30
                              ? 'text-warning'
                              : 'text-text-secondary'
                        )}
                      >
                        {recipe.food_cost_pct > 0
                          ? `${recipe.food_cost_pct.toFixed(1)}%`
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge-status', variant)}>
                        {RECIPE_STATUS_LABELS[recipe.status]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
