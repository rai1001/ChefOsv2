'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { TechSheetData } from '../types'
import type { Recipe, RecipeIngredient, RecipeStep } from '@/features/recipes/types'

export function useTechSheet(recipeId: string | null) {
  const { data: hotel } = useActiveHotel()

  return useQuery<TechSheetData>({
    queryKey: ['tech-sheet', hotel?.hotel_id, recipeId],
    enabled: !!hotel && !!recipeId,
    queryFn: async () => {
      const supabase = createClient()

      const [recipeRes, ingredientsRes, stepsRes, hotelRes] = await Promise.all([
        supabase
          .from('recipes')
          .select('*')
          .eq('id', recipeId!)
          .eq('hotel_id', hotel!.hotel_id)
          .single(),
        supabase
          .from('recipe_ingredients')
          .select('*, unit:units_of_measure(id, abbreviation, name)')
          .eq('recipe_id', recipeId!)
          .eq('hotel_id', hotel!.hotel_id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('recipe_steps')
          .select('*')
          .eq('recipe_id', recipeId!)
          .eq('hotel_id', hotel!.hotel_id)
          .order('step_number', { ascending: true }),
        supabase
          .from('hotels')
          .select('name')
          .eq('id', hotel!.hotel_id)
          .single(),
      ])

      if (recipeRes.error) throw recipeRes.error
      if (ingredientsRes.error) throw ingredientsRes.error
      if (stepsRes.error) throw stepsRes.error

      return {
        recipe: recipeRes.data as Recipe,
        ingredients: (ingredientsRes.data ?? []) as RecipeIngredient[],
        steps: (stepsRes.data ?? []) as RecipeStep[],
        hotel_name: hotelRes.data?.name ?? hotel!.hotel_id,
      }
    },
  })
}
