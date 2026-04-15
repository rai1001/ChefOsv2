'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  useRecipe,
  useRecipeIngredients,
  useRecipeSteps,
  useUpdateRecipe,
  useAddIngredient,
  useRemoveIngredient,
  useAddStep,
  useRemoveStep,
  useSubmitForReview,
  useApproveRecipe,
  useDeprecateRecipe,
  useCalculateRecipeCost,
  useDuplicateRecipe,
} from '@/features/recipes/hooks/use-recipes'
import { useUnits } from '@/features/recipes/hooks/use-units'
import {
  RECIPE_STATUS_LABELS,
  RECIPE_STATUS_COLORS,
  RECIPE_CATEGORY_LABELS,
  RECIPE_DIFFICULTY_LABELS,
  ALLERGENS,
  ALLERGEN_LABELS,
  DIETARY_TAGS,
  DIETARY_TAG_LABELS,
  type Allergen,
  type DietaryTag,
} from '@/features/recipes/types'
import {
  ArrowLeft,
  Save,
  ChefHat,
  ListOrdered,
  Calculator,
  AlertTriangle,
  Copy,
  Send,
  CheckCircle,
  Ban,
  Plus,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'info' | 'ingredients' | 'steps' | 'cost' | 'allergens'

export default function RecipeEditorPage() {
  const params = useParams()
  const router = useRouter()
  const recipeId = params.id as string

  const { data: recipe, isLoading } = useRecipe(recipeId)
  const { data: ingredients } = useRecipeIngredients(recipeId)
  const { data: steps } = useRecipeSteps(recipeId)
  const { data: units } = useUnits()

  const updateRecipe = useUpdateRecipe()
  const addIngredient = useAddIngredient()
  const removeIngredient = useRemoveIngredient()
  const addStep = useAddStep()
  const removeStep = useRemoveStep()
  const submitForReview = useSubmitForReview()
  const approveRecipe = useApproveRecipe()
  const deprecateRecipe = useDeprecateRecipe()
  const calculateCost = useCalculateRecipeCost()
  const duplicateRecipe = useDuplicateRecipe()

  const [activeTab, setActiveTab] = useState<Tab>('info')

  // Ingredient form state
  const [ingName, setIngName] = useState('')
  const [ingQty, setIngQty] = useState('')
  const [ingUnit, setIngUnit] = useState('')
  const [ingWaste, setIngWaste] = useState('0')
  const [ingCost, setIngCost] = useState('0')
  const [ingNotes, setIngNotes] = useState('')

  // Step form state
  const [stepInstruction, setStepInstruction] = useState('')
  const [stepDuration, setStepDuration] = useState('')
  const [stepTemp, setStepTemp] = useState('')
  const [stepEquipment, setStepEquipment] = useState('')

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-bg-hover" />
        <div className="h-64 animate-pulse rounded-lg bg-bg-hover" />
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="p-12 text-center">
        <p className="text-text-secondary">Receta no encontrada</p>
        <Link href="/recipes" className="mt-4 text-accent hover:underline">
          Volver a recetas
        </Link>
      </div>
    )
  }

  const isDraft = recipe.status === 'draft'
  const isReviewPending = recipe.status === 'review_pending'
  const isApproved = recipe.status === 'approved'

  function handleAddIngredient(e: React.FormEvent) {
    e.preventDefault()
    if (!ingName || !ingQty) return
    addIngredient.mutate(
      {
        recipe_id: recipeId,
        ingredient_name: ingName,
        quantity_gross: parseFloat(ingQty),
        unit_id: ingUnit || undefined,
        waste_pct: parseFloat(ingWaste) || 0,
        unit_cost: parseFloat(ingCost) || 0,
        sort_order: (ingredients?.length ?? 0) + 1,
        preparation_notes: ingNotes || undefined,
      },
      {
        onSuccess: () => {
          setIngName('')
          setIngQty('')
          setIngUnit('')
          setIngWaste('0')
          setIngCost('0')
          setIngNotes('')
        },
      }
    )
  }

  function handleAddStep(e: React.FormEvent) {
    e.preventDefault()
    if (!stepInstruction) return
    addStep.mutate(
      {
        recipe_id: recipeId,
        step_number: (steps?.length ?? 0) + 1,
        instruction: stepInstruction,
        duration_min: stepDuration ? parseInt(stepDuration) : undefined,
        temperature: stepTemp || undefined,
        equipment: stepEquipment || undefined,
      },
      {
        onSuccess: () => {
          setStepInstruction('')
          setStepDuration('')
          setStepTemp('')
          setStepEquipment('')
        },
      }
    )
  }

  function handleToggleAllergen(a: Allergen) {
    if (!recipe) return
    const current = recipe.allergens as Allergen[]
    const updated = current.includes(a)
      ? current.filter((x) => x !== a)
      : [...current, a]
    updateRecipe.mutate({ id: recipeId, allergens: updated })
  }

  function handleToggleTag(t: DietaryTag) {
    if (!recipe) return
    const current = recipe.dietary_tags as DietaryTag[]
    const updated = current.includes(t)
      ? current.filter((x) => x !== t)
      : [...current, t]
    updateRecipe.mutate({ id: recipeId, dietary_tags: updated })
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Info', icon: <ChefHat className="h-4 w-4" /> },
    { key: 'ingredients', label: 'Ingredientes', icon: <ListOrdered className="h-4 w-4" /> },
    { key: 'steps', label: 'Pasos', icon: <ListOrdered className="h-4 w-4" /> },
    { key: 'cost', label: 'Coste', icon: <Calculator className="h-4 w-4" /> },
    { key: 'allergens', label: 'Alérgenos', icon: <AlertTriangle className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/recipes"
            className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-text-primary">{recipe.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-text-muted">
                {RECIPE_CATEGORY_LABELS[recipe.category]}
              </span>
              <span className="text-text-muted">·</span>
              <span
                className={cn('text-sm font-medium', RECIPE_STATUS_COLORS[recipe.status])}
              >
                {RECIPE_STATUS_LABELS[recipe.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              duplicateRecipe.mutate(recipeId, {
                onSuccess: (newId) => router.push(`/recipes/${newId}`),
              })
            }
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicar
          </button>

          {isDraft && (
            <button
              onClick={() => submitForReview.mutate(recipeId)}
              disabled={submitForReview.isPending}
              className="flex items-center gap-1.5 rounded-md bg-info px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Enviar a revisión
            </button>
          )}

          {isReviewPending && (
            <button
              onClick={() => approveRecipe.mutate(recipeId)}
              disabled={approveRecipe.isPending}
              className="flex items-center gap-1.5 rounded-md bg-success px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Aprobar
            </button>
          )}

          {isApproved && (
            <button
              onClick={() => deprecateRecipe.mutate(recipeId)}
              disabled={deprecateRecipe.isPending}
              className="flex items-center gap-1.5 rounded-md border border-danger px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" />
              Deprecar
            </button>
          )}
        </div>
      </div>

      {/* Error feedback */}
      {(submitForReview.error || approveRecipe.error || deprecateRecipe.error) && (
        <p className="text-sm text-danger" role="alert">
          {((submitForReview.error || approveRecipe.error || deprecateRecipe.error) as Error).message}
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-lg border border-border bg-bg-card p-6">
        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">Dificultad</p>
                <p className="mt-1 text-text-primary">{RECIPE_DIFFICULTY_LABELS[recipe.difficulty]}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">Raciones</p>
                <p className="mt-1 text-text-primary">{recipe.servings}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">Tiempo prep.</p>
                <p className="mt-1 text-text-primary">
                  {recipe.prep_time_min ? `${recipe.prep_time_min} min` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">Tiempo cocción</p>
                <p className="mt-1 text-text-primary">
                  {recipe.cook_time_min ? `${recipe.cook_time_min} min` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">Tiempo reposo</p>
                <p className="mt-1 text-text-primary">
                  {recipe.rest_time_min ? `${recipe.rest_time_min} min` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">Tiempo total</p>
                <p className="mt-1 text-text-primary">
                  {(recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0) + (recipe.rest_time_min ?? 0)} min
                </p>
              </div>
            </div>
            {recipe.description && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">Descripción</p>
                <p className="mt-1 text-text-secondary">{recipe.description}</p>
              </div>
            )}
            {recipe.notes && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">Notas</p>
                <p className="mt-1 text-text-secondary">{recipe.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* INGREDIENTS TAB */}
        {activeTab === 'ingredients' && (
          <div className="space-y-6">
            {/* Ingredient list */}
            {ingredients && ingredients.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Ingrediente</th>
                    <th className="pb-2">Bruto</th>
                    <th className="pb-2">Merma</th>
                    <th className="pb-2">Neto</th>
                    <th className="pb-2">Coste/ud</th>
                    <th className="pb-2">Línea</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing, idx) => (
                    <tr key={ing.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 text-text-muted">{idx + 1}</td>
                      <td className="py-2 text-text-primary">
                        {ing.ingredient_name}
                        {ing.preparation_notes && (
                          <span className="ml-1 text-xs text-text-muted">
                            ({ing.preparation_notes})
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-text-secondary">
                        {ing.quantity_gross} {ing.unit?.abbreviation ?? ''}
                      </td>
                      <td className="py-2 text-text-muted">{ing.waste_pct}%</td>
                      <td className="py-2 text-text-secondary">
                        {ing.quantity_net.toFixed(3)} {ing.unit?.abbreviation ?? ''}
                      </td>
                      <td className="py-2 text-text-secondary">
                        {ing.unit_cost > 0 ? `${ing.unit_cost.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 text-text-secondary">
                        {ing.unit_cost > 0
                          ? `${(ing.quantity_net * ing.unit_cost).toFixed(2)} EUR`
                          : '—'}
                      </td>
                      <td className="py-2">
                        {isDraft && (
                          <button
                            onClick={() =>
                              removeIngredient.mutate({ id: ing.id, recipe_id: recipeId })
                            }
                            className="text-text-muted hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-text-muted">Sin ingredientes todavía.</p>
            )}

            {/* Add ingredient form */}
            {isDraft && (
              <form onSubmit={handleAddIngredient} className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-medium text-text-primary">Añadir ingrediente</p>
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Nombre *"
                      value={ingName}
                      onChange={(e) => setIngName(e.target.value)}
                      required
                      className="w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="Cantidad *"
                      value={ingQty}
                      onChange={(e) => setIngQty(e.target.value)}
                      required
                      className="w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                    />
                  </div>
                  <div>
                    <select
                      value={ingUnit}
                      onChange={(e) => setIngUnit(e.target.value)}
                      className="w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                    >
                      <option value="">Unidad</option>
                      {units?.map((u) => (
                        <option key={u.id} value={u.id}>{u.abbreviation}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="Merma %"
                      value={ingWaste}
                      onChange={(e) => setIngWaste(e.target.value)}
                      className="w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Coste/ud"
                      value={ingCost}
                      onChange={(e) => setIngCost(e.target.value)}
                      className="w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Notas de preparación (opcional)"
                    value={ingNotes}
                    onChange={(e) => setIngNotes(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={addIngredient.isPending}
                    className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* STEPS TAB */}
        {activeTab === 'steps' && (
          <div className="space-y-6">
            {steps && steps.length > 0 ? (
              <div className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex gap-3 rounded-md border border-border/50 p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      {step.step_number}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-text-primary">{step.instruction}</p>
                      <div className="mt-1 flex gap-3 text-xs text-text-muted">
                        {step.duration_min && <span>{step.duration_min} min</span>}
                        {step.temperature && <span>{step.temperature}</span>}
                        {step.equipment && <span>{step.equipment}</span>}
                      </div>
                    </div>
                    {isDraft && (
                      <button
                        onClick={() =>
                          removeStep.mutate({ id: step.id, recipe_id: recipeId })
                        }
                        className="text-text-muted hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Sin pasos todavía.</p>
            )}

            {isDraft && (
              <form onSubmit={handleAddStep} className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-medium text-text-primary">Añadir paso</p>
                <textarea
                  placeholder="Instrucción *"
                  value={stepInstruction}
                  onChange={(e) => setStepInstruction(e.target.value)}
                  required
                  rows={2}
                  className="w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Duración (min)"
                    value={stepDuration}
                    onChange={(e) => setStepDuration(e.target.value)}
                    className="w-28 rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Temperatura"
                    value={stepTemp}
                    onChange={(e) => setStepTemp(e.target.value)}
                    className="w-28 rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Equipo"
                    value={stepEquipment}
                    onChange={(e) => setStepEquipment(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={addStep.isPending}
                    className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* COST TAB — Escandallo */}
        {activeTab === 'cost' && (() => {
          const TARGET_FC_PCT = 28 // benchmark hosteleria
          const pvpSugerido = recipe.cost_per_serving > 0
            ? recipe.cost_per_serving / (TARGET_FC_PCT / 100)
            : null
          const ingLines = (ingredients ?? []).map((ing) => ({
            ...ing,
            lineCost: ing.quantity_net * ing.unit_cost,
          }))
          const ingTotal = ingLines.reduce((acc, i) => acc + i.lineCost, 0)

          return (
            <div className="space-y-6">
              {/* KPI row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-md border border-border bg-bg-primary p-3 text-center">
                  <p className="text-xs text-text-muted uppercase tracking-wider">Coste total</p>
                  <p className="mt-1.5 text-xl font-bold text-text-primary">
                    {recipe.total_cost.toFixed(2)}
                    <span className="ml-1 text-xs font-normal text-text-muted">EUR</span>
                  </p>
                </div>
                <div className="rounded-md border border-border bg-bg-primary p-3 text-center">
                  <p className="text-xs text-text-muted uppercase tracking-wider">Coste / ración</p>
                  <p className="mt-1.5 text-xl font-bold text-text-primary">
                    {recipe.cost_per_serving.toFixed(2)}
                    <span className="ml-1 text-xs font-normal text-text-muted">EUR</span>
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">{recipe.servings} raciones</p>
                </div>
                <div className="rounded-md border border-border bg-bg-primary p-3 text-center">
                  <p className="text-xs text-text-muted uppercase tracking-wider">Food cost %</p>
                  <p className={cn(
                    'mt-1.5 text-xl font-bold',
                    recipe.food_cost_pct > 35 ? 'text-danger' :
                    recipe.food_cost_pct > 30 ? 'text-warning' : 'text-success'
                  )}>
                    {recipe.food_cost_pct.toFixed(1)}%
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">objetivo ≤ {TARGET_FC_PCT}%</p>
                </div>
                <div className="rounded-md border border-border bg-bg-primary p-3 text-center">
                  <p className="text-xs text-text-muted uppercase tracking-wider">PVP sugerido</p>
                  <p className="mt-1.5 text-xl font-bold text-accent">
                    {pvpSugerido ? `${pvpSugerido.toFixed(2)}` : '—'}
                    {pvpSugerido && <span className="ml-1 text-xs font-normal text-text-muted">EUR</span>}
                  </p>
                  {recipe.target_price && (
                    <p className="mt-0.5 text-xs text-text-muted">
                      objetivo: {recipe.target_price.toFixed(2)} EUR
                    </p>
                  )}
                </div>
              </div>

              {/* Recalculate action */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => calculateCost.mutate(recipeId)}
                  disabled={calculateCost.isPending}
                  className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  <Calculator className="h-4 w-4" />
                  {calculateCost.isPending ? 'Calculando...' : 'Recalcular escandallo'}
                </button>
                {calculateCost.isSuccess && calculateCost.data && (
                  <span className="text-xs text-success">
                    Actualizado — ingredientes: {calculateCost.data.ingredient_cost.toFixed(2)} EUR
                    {calculateCost.data.sub_recipe_cost > 0 &&
                      ` / sub-recetas: ${calculateCost.data.sub_recipe_cost.toFixed(2)} EUR`}
                  </span>
                )}
                {calculateCost.error && (
                  <span className="text-xs text-danger" role="alert">
                    {(calculateCost.error as Error).message}
                  </span>
                )}
              </div>

              {/* Ingredient breakdown table */}
              {ingLines.length > 0 ? (
                <div>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                    Desglose de ingredientes
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                        <th className="pb-2">Ingrediente</th>
                        <th className="pb-2 text-right">Bruto</th>
                        <th className="pb-2 text-right">Merma</th>
                        <th className="pb-2 text-right">Neto</th>
                        <th className="pb-2 text-right">€/ud</th>
                        <th className="pb-2 text-right">Línea EUR</th>
                        <th className="pb-2 text-right">% coste</th>
                        <th className="pb-2 w-24"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingLines.map((ing) => {
                        const pct = ingTotal > 0 ? (ing.lineCost / ingTotal) * 100 : 0
                        return (
                          <tr key={ing.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 text-text-primary font-medium">
                              {ing.ingredient_name}
                              {ing.preparation_notes && (
                                <span className="ml-1 text-xs font-normal text-text-muted">
                                  ({ing.preparation_notes})
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-right text-text-secondary">
                              {ing.quantity_gross}
                              {ing.unit && <span className="ml-0.5 text-text-muted">{ing.unit.abbreviation}</span>}
                            </td>
                            <td className="py-2 text-right text-text-muted">{ing.waste_pct}%</td>
                            <td className="py-2 text-right text-text-secondary">
                              {ing.quantity_net.toFixed(3)}
                              {ing.unit && <span className="ml-0.5 text-text-muted">{ing.unit.abbreviation}</span>}
                            </td>
                            <td className="py-2 text-right text-text-secondary">
                              {ing.unit_cost > 0 ? ing.unit_cost.toFixed(3) : '—'}
                            </td>
                            <td className={cn(
                              'py-2 text-right font-medium',
                              ing.lineCost > 0 ? 'text-text-primary' : 'text-text-muted'
                            )}>
                              {ing.lineCost > 0 ? ing.lineCost.toFixed(2) : '—'}
                            </td>
                            <td className="py-2 text-right text-text-muted">
                              {pct > 0 ? `${pct.toFixed(1)}%` : '—'}
                            </td>
                            <td className="py-2 pl-3">
                              {pct > 0 && (
                                <div className="h-1.5 w-full rounded-full bg-bg-hover overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full',
                                      pct > 40 ? 'bg-warning' : 'bg-accent'
                                    )}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border">
                        <td colSpan={5} className="pt-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                          Total ingredientes
                        </td>
                        <td className="pt-2 text-right font-bold text-text-primary">
                          {ingTotal.toFixed(2)}
                        </td>
                        <td className="pt-2 text-right text-text-muted">100%</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  Sin ingredientes. Añade ingredientes en la pestaña Ingredientes y recalcula el escandallo.
                </p>
              )}
            </div>
          )
        })()}

        {/* ALLERGENS TAB */}
        {activeTab === 'allergens' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-3">
                Alérgenos (14 obligatorios EU)
              </h3>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((a) => {
                  const active = (recipe.allergens as Allergen[]).includes(a)
                  return (
                    <button
                      key={a}
                      onClick={() => handleToggleAllergen(a)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                        active
                          ? 'border-warning bg-warning/10 text-warning'
                          : 'border-border text-text-muted hover:border-border-focus'
                      }`}
                    >
                      {ALLERGEN_LABELS[a]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-text-primary mb-3">Tags dietéticos</h3>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map((t) => {
                  const active = (recipe.dietary_tags as DietaryTag[]).includes(t)
                  return (
                    <button
                      key={t}
                      onClick={() => handleToggleTag(t)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                        active
                          ? 'border-success bg-success/10 text-success'
                          : 'border-border text-text-muted hover:border-border-focus'
                      }`}
                    >
                      {DIETARY_TAG_LABELS[t]}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
