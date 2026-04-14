'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type {
  Recipe,
  RecipeCategory,
  RecipeStatus,
  RecipeIngredient,
  RecipeStep,
  RecipeCostResult,
  ScaleRecipeResult,
} from '../types'

export function useRecipes(filters?: {
  category?: RecipeCategory
  status?: RecipeStatus
  search?: string
}) {
  const { data: hotel } = useActiveHotel()

  return useQuery<Recipe[]>({
    queryKey: ['recipes', hotel?.hotel_id, filters],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('recipes')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .neq('status', 'archived')
        .order('updated_at', { ascending: false })

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Recipe[]
    },
  })
}

export function useRecipe(recipeId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<Recipe>({
    queryKey: ['recipe', recipeId],
    enabled: !!hotel && !!recipeId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId!)
        .eq('hotel_id', hotel!.hotel_id)
        .single()
      if (error) throw error
      return data as Recipe
    },
  })
}

export function useRecipeIngredients(recipeId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<RecipeIngredient[]>({
    queryKey: ['recipe-ingredients', recipeId],
    enabled: !!hotel && !!recipeId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*, unit:units_of_measure(id, abbreviation, name)')
        .eq('recipe_id', recipeId!)
        .eq('hotel_id', hotel!.hotel_id)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as RecipeIngredient[]
    },
  })
}

export function useRecipeSteps(recipeId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<RecipeStep[]>({
    queryKey: ['recipe-steps', recipeId],
    enabled: !!hotel && !!recipeId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('recipe_steps')
        .select('*')
        .eq('recipe_id', recipeId!)
        .eq('hotel_id', hotel!.hotel_id)
        .order('step_number', { ascending: true })
      if (error) throw error
      return data as RecipeStep[]
    },
  })
}

interface CreateRecipeInput {
  name: string
  category: RecipeCategory
  description?: string
  subcategory?: string
  servings?: number
  prep_time_min?: number
  cook_time_min?: number
  rest_time_min?: number
  difficulty?: string
  target_price?: number
  allergens?: string[]
  dietary_tags?: string[]
  notes?: string
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: CreateRecipeInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          hotel_id: hotel!.hotel_id,
          name: input.name,
          category: input.category,
          description: input.description ?? null,
          subcategory: input.subcategory ?? null,
          servings: input.servings ?? 1,
          prep_time_min: input.prep_time_min ?? null,
          cook_time_min: input.cook_time_min ?? null,
          rest_time_min: input.rest_time_min ?? null,
          difficulty: input.difficulty ?? 'medium',
          target_price: input.target_price ?? null,
          allergens: input.allergens ?? [],
          dietary_tags: input.dietary_tags ?? [],
          notes: input.notes ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Recipe> & { id: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', id)
        .eq('hotel_id', hotel!.hotel_id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe', vars.id] })
    },
  })
}

interface AddIngredientInput {
  recipe_id: string
  ingredient_name: string
  quantity_gross: number
  unit_id?: string
  waste_pct?: number
  unit_cost?: number
  sort_order?: number
  preparation_notes?: string
}

export function useAddIngredient() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: AddIngredientInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: input.recipe_id,
          hotel_id: hotel!.hotel_id,
          ingredient_name: input.ingredient_name,
          quantity_gross: input.quantity_gross,
          unit_id: input.unit_id ?? null,
          waste_pct: input.waste_pct ?? 0,
          unit_cost: input.unit_cost ?? 0,
          sort_order: input.sort_order ?? 0,
          preparation_notes: input.preparation_notes ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['recipe-ingredients', vars.recipe_id],
      })
    },
  })
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      recipe_id,
      ...updates
    }: Partial<RecipeIngredient> & { id: string; recipe_id: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('recipe_ingredients')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['recipe-ingredients', vars.recipe_id],
      })
    },
  })
}

export function useRemoveIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
    }: {
      id: string
      recipe_id: string
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['recipe-ingredients', vars.recipe_id],
      })
    },
  })
}

interface AddStepInput {
  recipe_id: string
  step_number: number
  instruction: string
  duration_min?: number
  temperature?: string
  equipment?: string
  notes?: string
}

export function useAddStep() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: AddStepInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('recipe_steps')
        .insert({
          recipe_id: input.recipe_id,
          hotel_id: hotel!.hotel_id,
          step_number: input.step_number,
          instruction: input.instruction,
          duration_min: input.duration_min ?? null,
          temperature: input.temperature ?? null,
          equipment: input.equipment ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['recipe-steps', vars.recipe_id],
      })
    },
  })
}

export function useRemoveStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
    }: {
      id: string
      recipe_id: string
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('recipe_steps')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['recipe-steps', vars.recipe_id],
      })
    },
  })
}

// Workflow RPCs
export function useSubmitForReview() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('submit_recipe_for_review', {
        p_hotel_id: hotel!.hotel_id,
        p_recipe_id: recipeId,
      })
      if (error) throw error
    },
    onSuccess: (_, recipeId) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
    },
  })
}

export function useApproveRecipe() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('approve_recipe', {
        p_hotel_id: hotel!.hotel_id,
        p_recipe_id: recipeId,
      })
      if (error) throw error
    },
    onSuccess: (_, recipeId) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
    },
  })
}

export function useDeprecateRecipe() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('deprecate_recipe', {
        p_hotel_id: hotel!.hotel_id,
        p_recipe_id: recipeId,
      })
      if (error) throw error
    },
    onSuccess: (_, recipeId) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
    },
  })
}

export function useCalculateRecipeCost() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('calculate_recipe_cost', {
        p_hotel_id: hotel!.hotel_id,
        p_recipe_id: recipeId,
      })
      if (error) throw error
      return data as RecipeCostResult
    },
    onSuccess: (_, recipeId) => {
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useScaleRecipe() {
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async ({
      recipeId,
      newServings,
    }: {
      recipeId: string
      newServings: number
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('scale_recipe', {
        p_hotel_id: hotel!.hotel_id,
        p_recipe_id: recipeId,
        p_new_servings: newServings,
      })
      if (error) throw error
      return data as ScaleRecipeResult
    },
  })
}

export function useDuplicateRecipe() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('duplicate_recipe', {
        p_hotel_id: hotel!.hotel_id,
        p_recipe_id: recipeId,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
