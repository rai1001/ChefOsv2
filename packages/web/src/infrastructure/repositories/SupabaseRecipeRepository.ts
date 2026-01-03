import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';
import { Recipe, RecipeIngredient } from '@/domain/entities/Recipe';

@injectable()
export class SupabaseRecipeRepository implements IRecipeRepository {
  async getRecipes(outletId?: string): Promise<Recipe[]> {
    let query = supabase.from('recipes').select(`
                *,
                recipe_ingredients (*)
            `);

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map((row: any) => this.mapToDomain(row));
  }

  async getRecipeById(id: string): Promise<Recipe | null> {
    const { data, error } = await supabase
      .from('recipes')
      .select(
        `
                *,
                recipe_ingredients (*)
            `
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return this.mapToDomain(data);
  }

  async createRecipe(recipe: Recipe): Promise<void> {
    const { ingredients, ...recipeData } = recipe;

    // 1. Insert Recipe
    const { error: recipeError } = await supabase.from('recipes').insert(this.mapToRow(recipeData));

    if (recipeError) throw recipeError;

    // 2. Insert Ingredients
    if (ingredients.length > 0) {
      const ingredientsRowData = ingredients.map((ing) => ({
        recipe_id: recipe.id,
        linked_ingredient_id: ing.type === 'raw' ? ing.id : null,
        linked_recipe_id: ing.type === 'recipe' ? ing.id : null,
        type: ing.type,
        name_snapshot: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        waste_percentage: ing.wastePercentage,
      }));

      const { error: ingError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsRowData);

      if (ingError) throw ingError; // Ideally roll back here
    }
  }

  async updateRecipe(id: string, recipe: Partial<Recipe>): Promise<void> {
    const { ingredients, ...recipeData } = recipe;

    // 1. Update Recipe Fields
    if (Object.keys(recipeData).length > 0) {
      const { error } = await supabase
        .from('recipes')
        .update(this.mapToRow(recipeData))
        .eq('id', id);

      if (error) throw error;
    }

    // 2. Update Ingredients (Full Replace Strategy for Simplicity for now)
    // A more optimized approach would be diffing.
    if (ingredients) {
      // Delete old
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);

      // Insert new
      const ingredientsRowData = ingredients.map((ing) => ({
        recipe_id: id,
        linked_ingredient_id: ing.type === 'raw' ? ing.id : null,
        linked_recipe_id: ing.type === 'recipe' ? ing.id : null,
        type: ing.type, // 'raw' | 'recipe'
        name_snapshot: ing.name, // Fallback if linked entity deleted
        quantity: ing.quantity,
        unit: ing.unit,
        waste_percentage: ing.wastePercentage,
      }));

      const { error: ingError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsRowData);

      if (ingError) throw ingError;
    }
  }

  async deleteRecipe(id: string): Promise<void> {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) throw error;
  }

  async searchRecipes(queryStr: string, outletId?: string): Promise<Recipe[]> {
    let query = supabase
      .from('recipes')
      .select(`*, recipe_ingredients (*)`)
      .ilike('name', `%${queryStr}%`);

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map((row: any) => this.mapToDomain(row));
  }

  private mapToDomain(row: any): Recipe {
    const ingredients: RecipeIngredient[] = (row.recipe_ingredients || []).map((ri: any) => ({
      id: ri.linked_ingredient_id || ri.linked_recipe_id, // Restore ID
      type: ri.type as 'raw' | 'recipe',
      name: ri.name_snapshot,
      quantity: ri.quantity,
      unit: ri.unit,
      wastePercentage: ri.waste_percentage,
      // Calculated fields are re-calculated or fetched if persisted
      // For now, simpler mapping
      grossCost: 0,
      unitCost: 0,
    }));

    return new Recipe(
      row.id,
      row.name,
      row.description || '',
      row.category,
      row.sub_category || '',
      row.servings,
      row.yield_quantity,
      row.yield_unit,
      row.prep_time,
      row.cook_time,
      ingredients,
      row.instructions || [],
      // row.instructions is expected to be text[] or jsonb in Supabase, assuming simple array of strings for now.

      row.labor_cost,
      row.packaging_cost,
      row.selling_price,
      row.target_cost_percent,
      0, // totalCost - usually calculated
      0, // costPerServing
      0, // foodCostPercent
      0, // grossMargin
      row.outlet_id,
      row.image_url,
      row.video_url,
      row.allergens || [],
      row.tags || [],
      row.created_at,
      row.updated_at
    );
  }

  private mapToRow(recipe: Partial<Recipe>): any {
    const data: any = {};
    if (recipe.name !== undefined) data.name = recipe.name;
    if (recipe.description !== undefined) data.description = recipe.description;
    if (recipe.category !== undefined) data.category = recipe.category;
    if (recipe.subCategory !== undefined) data.sub_category = recipe.subCategory;
    if (recipe.servings !== undefined) data.servings = recipe.servings;
    if (recipe.yieldQuantity !== undefined) data.yield_quantity = recipe.yieldQuantity;
    if (recipe.yieldUnit !== undefined) data.yield_unit = recipe.yieldUnit;
    if (recipe.prepTime !== undefined) data.prep_time = recipe.prepTime;
    if (recipe.cookTime !== undefined) data.cook_time = recipe.cookTime;
    if (recipe.laborCost !== undefined) data.labor_cost = recipe.laborCost;
    if (recipe.packagingCost !== undefined) data.packaging_cost = recipe.packagingCost;
    if (recipe.sellingPrice !== undefined) data.selling_price = recipe.sellingPrice;
    if (recipe.targetCostPercent !== undefined) data.target_cost_percent = recipe.targetCostPercent;
    if (recipe.imageUrl !== undefined) data.image_url = recipe.imageUrl;
    if (recipe.videoUrl !== undefined) data.video_url = recipe.videoUrl;
    if (recipe.outletId !== undefined) data.outlet_id = recipe.outletId;
    if (recipe.instructions !== undefined) data.instructions = recipe.instructions;
    if (recipe.allergens !== undefined) data.allergens = recipe.allergens;
    if (recipe.tags !== undefined) data.tags = recipe.tags;

    return data;
  }
}
