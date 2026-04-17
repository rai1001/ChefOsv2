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

      {/* Recipe grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-card overflow-hidden">
              <div className="h-40 skeleton" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-3/4 skeleton" />
                <div className="h-3 w-1/2 skeleton" />
                <div className="h-7 w-1/3 skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : !recipes || recipes.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-card p-12 text-center">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => {
            const variant = RECIPE_STATUS_VARIANT[recipe.status]
            const fcColor =
              recipe.food_cost_pct > 35 ? 'text-danger'
              : recipe.food_cost_pct > 30 ? 'text-warning'
              : recipe.food_cost_pct > 0 ? 'text-success'
              : 'text-text-muted'
            // Glow tinte según estado para el placeholder
            const glow =
              variant === 'success' ? 'rgba(90,122,90,0.18)'
              : variant === 'warning' ? 'rgba(184,115,51,0.18)'
              : variant === 'urgent' ? 'rgba(192,57,43,0.18)'
              : 'rgba(74,96,112,0.15)'
            const totalTime = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0)
            return (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="group rounded-lg border border-border bg-bg-card overflow-hidden transition-colors hover:border-accent/40"
              >
                {/* Foto / placeholder */}
                {recipe.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={recipe.image_url}
                    alt={recipe.name}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-40 flex items-center justify-center"
                    style={{
                      background: `radial-gradient(ellipse at center, ${glow} 0%, transparent 70%)`,
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <span
                      className="text-text-muted"
                      style={{ fontFamily: 'var(--font-code)', fontSize: '13px', letterSpacing: '0.04em' }}
                    >
                      [ foto del plato ]
                    </span>
                  </div>
                )}

                {/* Body */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors" style={{ fontFamily: 'var(--font-sans)', letterSpacing: 0 }}>
                      {recipe.name}
                    </h3>
                    <p className="mt-1 text-xs text-text-muted">
                      {recipe.servings} raciones · {totalTime > 0 ? `${totalTime} min` : '—'} · {RECIPE_DIFFICULTY_LABELS[recipe.difficulty]} ·{' '}
                      <span className={cn(
                        variant === 'success' ? 'text-success'
                        : variant === 'warning' ? 'text-warning'
                        : variant === 'urgent' ? 'text-danger'
                        : 'text-text-muted'
                      )}>
                        {RECIPE_STATUS_LABELS[recipe.status]}
                      </span>
                    </p>
                    {recipe.allergens.length > 0 && (
                      <p className="mt-1 text-xs text-warning">
                        {recipe.allergens.map((a) => ALLERGEN_LABELS[a]).join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Coste + food cost */}
                  <div className="flex items-end justify-between border-t border-border pt-3">
                    <div>
                      <p className="font-data text-lg text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {recipe.cost_per_serving > 0
                          ? `€ ${recipe.cost_per_serving.toFixed(2)}`
                          : '—'}
                      </p>
                      <p className="kpi-label mt-0.5">Coste / ración</p>
                    </div>
                    <p className={cn('font-data text-base', fcColor)} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {recipe.food_cost_pct > 0 ? `${recipe.food_cost_pct.toFixed(1)}%` : '—'}
                    </p>
                  </div>

                  {/* Categoría chip */}
                  <p className="text-xs text-text-muted" style={{ fontFamily: 'var(--font-code)' }}>
                    {RECIPE_CATEGORY_LABELS[recipe.category]}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
