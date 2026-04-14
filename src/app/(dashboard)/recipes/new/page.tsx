'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCreateRecipe } from '@/features/recipes/hooks/use-recipes'
import {
  RECIPE_CATEGORIES,
  RECIPE_CATEGORY_LABELS,
  RECIPE_DIFFICULTIES,
  RECIPE_DIFFICULTY_LABELS,
  ALLERGENS,
  ALLERGEN_LABELS,
  DIETARY_TAGS,
  DIETARY_TAG_LABELS,
  type RecipeCategory,
  type RecipeDifficulty,
  type Allergen,
  type DietaryTag,
} from '@/features/recipes/types'
import { ArrowLeft } from 'lucide-react'

export default function NewRecipePage() {
  const router = useRouter()
  const createRecipe = useCreateRecipe()

  const [name, setName] = useState('')
  const [category, setCategory] = useState<RecipeCategory>('meat')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState('1')
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>('medium')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [restTime, setRestTime] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [selectedAllergens, setSelectedAllergens] = useState<Allergen[]>([])
  const [selectedTags, setSelectedTags] = useState<DietaryTag[]>([])
  const [notes, setNotes] = useState('')

  function toggleAllergen(a: Allergen) {
    setSelectedAllergens((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    )
  }

  function toggleTag(t: DietaryTag) {
    setSelectedTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createRecipe.mutate(
      {
        name,
        category,
        description: description || undefined,
        servings: parseInt(servings) || 1,
        difficulty,
        prep_time_min: prepTime ? parseInt(prepTime) : undefined,
        cook_time_min: cookTime ? parseInt(cookTime) : undefined,
        rest_time_min: restTime ? parseInt(restTime) : undefined,
        target_price: targetPrice ? parseFloat(targetPrice) : undefined,
        allergens: selectedAllergens,
        dietary_tags: selectedTags,
        notes: notes || undefined,
      },
      {
        onSuccess: (recipeId) => {
          router.push(`/recipes/${recipeId}`)
        },
      }
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/recipes"
          className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Nueva receta</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info basica */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Datos principales</h2>

          <div>
            <label htmlFor="name" className="block text-sm text-text-secondary">
              Nombre de la receta *
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Solomillo Wellington"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm text-text-secondary">
                Categoría *
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as RecipeCategory)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {RECIPE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{RECIPE_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="difficulty" className="block text-sm text-text-secondary">
                Dificultad
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as RecipeDifficulty)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {RECIPE_DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{RECIPE_DIFFICULTY_LABELS[d]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm text-text-secondary">
              Descripción
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Breve descripción de la receta..."
            />
          </div>
        </div>

        {/* Tiempos y raciones */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Tiempos y raciones</h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label htmlFor="servings" className="block text-sm text-text-secondary">
                Raciones *
              </label>
              <input
                id="servings"
                type="number"
                min={1}
                required
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="prepTime" className="block text-sm text-text-secondary">
                Prep (min)
              </label>
              <input
                id="prepTime"
                type="number"
                min={0}
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="cookTime" className="block text-sm text-text-secondary">
                Cocción (min)
              </label>
              <input
                id="cookTime"
                type="number"
                min={0}
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="restTime" className="block text-sm text-text-secondary">
                Reposo (min)
              </label>
              <input
                id="restTime"
                type="number"
                min={0}
                value={restTime}
                onChange={(e) => setRestTime(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="max-w-[200px]">
            <label htmlFor="targetPrice" className="block text-sm text-text-secondary">
              Precio objetivo (EUR)
            </label>
            <input
              id="targetPrice"
              type="number"
              step="0.01"
              min={0}
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="12.50"
            />
          </div>
        </div>

        {/* Alergenos */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Alérgenos (14 obligatorios EU)</h2>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAllergen(a)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  selectedAllergens.includes(a)
                    ? 'border-warning bg-warning/10 text-warning'
                    : 'border-border text-text-muted hover:border-border-focus'
                }`}
              >
                {ALLERGEN_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        {/* Tags dieteticos */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Tags dietéticos</h2>
          <div className="flex flex-wrap gap-2">
            {DIETARY_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  selectedTags.includes(t)
                    ? 'border-success bg-success/10 text-success'
                    : 'border-border text-text-muted hover:border-border-focus'
                }`}
              >
                {DIETARY_TAG_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Notas</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Notas internas, variaciones, tips..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/recipes"
            className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={createRecipe.isPending}
            className="rounded-md bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {createRecipe.isPending ? 'Creando...' : 'Crear receta'}
          </button>
        </div>

        {createRecipe.error && (
          <p className="text-sm text-danger" role="alert">
            {(createRecipe.error as Error).message}
          </p>
        )}
      </form>
    </div>
  )
}
