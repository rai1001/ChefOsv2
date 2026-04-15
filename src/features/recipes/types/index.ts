// M2 Recipes & Costing — Types

export const RECIPE_STATUSES = [
  'draft',
  'review_pending',
  'approved',
  'deprecated',
  'archived',
] as const

export type RecipeStatus = (typeof RECIPE_STATUSES)[number]

export const RECIPE_CATEGORIES = [
  'cold_starters',
  'hot_starters',
  'soups_creams',
  'fish',
  'meat',
  'sides',
  'desserts',
  'bakery',
  'sauces_stocks',
  'mise_en_place',
  'buffet',
  'room_service',
  'cocktail_pieces',
] as const

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number]

export const RECIPE_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type RecipeDifficulty = (typeof RECIPE_DIFFICULTIES)[number]

export const MENU_TYPES = ['buffet', 'seated', 'cocktail', 'tasting', 'daily'] as const
export type MenuType = (typeof MENU_TYPES)[number]

export const UNIT_TYPES = ['weight', 'volume', 'count', 'length'] as const
export type UnitType = (typeof UNIT_TYPES)[number]

export const ALLERGENS = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'dairy',
  'tree_nuts',
  'celery',
  'mustard',
  'sesame',
  'sulfites',
  'lupin',
  'mollusks',
] as const

export type Allergen = (typeof ALLERGENS)[number]

export const DIETARY_TAGS = [
  'vegan',
  'vegetarian',
  'gluten_free',
  'lactose_free',
  'halal',
  'kosher',
  'low_salt',
  'keto',
] as const

export type DietaryTag = (typeof DIETARY_TAGS)[number]

// === Interfaces ===

export interface UnitOfMeasure {
  id: string
  hotel_id: string
  name: string
  abbreviation: string
  unit_type: UnitType
  conversion_factor: number
  base_unit_id: string | null
  is_default: boolean
  created_at: string
}

export interface Recipe {
  id: string
  hotel_id: string
  name: string
  description: string | null
  category: RecipeCategory
  subcategory: string | null
  servings: number
  yield_qty: number | null
  yield_unit_id: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  rest_time_min: number | null
  difficulty: RecipeDifficulty
  status: RecipeStatus
  total_cost: number
  cost_per_serving: number
  food_cost_pct: number
  target_price: number | null
  allergens: Allergen[]
  dietary_tags: DietaryTag[]
  notes: string | null
  image_url: string | null
  created_by: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  hotel_id: string
  ingredient_name: string
  product_id: string | null
  unit_id: string | null
  quantity_gross: number
  waste_pct: number
  quantity_net: number
  unit_cost: number
  sort_order: number
  preparation_notes: string | null
  created_at: string
  // joined
  unit?: UnitOfMeasure
}

export interface RecipeStep {
  id: string
  recipe_id: string
  hotel_id: string
  step_number: number
  instruction: string
  duration_min: number | null
  temperature: string | null
  equipment: string | null
  notes: string | null
  created_at: string
}

export interface RecipeSubRecipe {
  id: string
  recipe_id: string
  sub_recipe_id: string
  quantity: number
  unit_id: string | null
  created_at: string
  // joined
  sub_recipe?: Pick<Recipe, 'id' | 'name' | 'category' | 'cost_per_serving'>
}

export interface RecipeVersion {
  id: string
  recipe_id: string
  hotel_id: string
  version_number: number
  data: Record<string, unknown>
  changed_by: string
  change_reason: string | null
  created_at: string
}

export interface Menu {
  id: string
  hotel_id: string
  name: string
  description: string | null
  menu_type: MenuType
  is_template: boolean
  target_food_cost_pct: number | null
  total_cost: number
  notes: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface MenuSection {
  id: string
  menu_id: string
  hotel_id: string
  name: string
  sort_order: number
  created_at: string
  recipes?: MenuSectionRecipe[]
}

export interface MenuSectionRecipe {
  id: string
  section_id: string
  hotel_id: string
  recipe_id: string
  servings_override: number | null
  price: number | null
  sort_order: number
  created_at: string
  recipe?: Pick<Recipe, 'id' | 'name' | 'category' | 'cost_per_serving'>
}

export interface RecipeCostResult {
  recipe_id: string
  ingredient_cost: number
  sub_recipe_cost: number
  total_cost: number
  cost_per_serving: number
  food_cost_pct: number
  servings: number
}

export interface ScaleRecipeResult {
  recipe_id: string
  original_servings: number
  new_servings: number
  scale_factor: number
  ingredients: {
    id: string
    ingredient_name: string
    original_qty: number
    scaled_qty: number
    waste_pct: number
    scaled_net: number
    unit_abbreviation: string | null
    preparation_notes: string | null
  }[]
  sub_recipes: {
    sub_recipe_id: string
    sub_recipe_name: string
    original_qty: number
    scaled_qty: number
  }[]
}

// === Labels ===

export const RECIPE_CATEGORY_LABELS: Record<RecipeCategory, string> = {
  cold_starters: 'Entrantes fríos',
  hot_starters: 'Entrantes calientes',
  soups_creams: 'Sopas y cremas',
  fish: 'Pescados',
  meat: 'Carnes',
  sides: 'Guarniciones',
  desserts: 'Postres',
  bakery: 'Panadería / Bollería',
  sauces_stocks: 'Salsas y fondos',
  mise_en_place: 'Mise en place',
  buffet: 'Buffet',
  room_service: 'Room service',
  cocktail_pieces: 'Cocktail (piezas)',
}

export const RECIPE_STATUS_LABELS: Record<RecipeStatus, string> = {
  draft: 'Borrador',
  review_pending: 'Pendiente revisión',
  approved: 'Aprobada',
  deprecated: 'Obsoleta',
  archived: 'Archivada',
}

export const RECIPE_STATUS_COLORS: Record<RecipeStatus, string> = {
  draft: 'text-text-muted',
  review_pending: 'text-warning',
  approved: 'text-success',
  deprecated: 'text-danger',
  archived: 'text-text-muted',
}

/** Left-border / badge-status variant (DESIGN.md §Left-Border Status System) */
export const RECIPE_STATUS_VARIANT: Record<RecipeStatus, 'neutral' | 'warning' | 'success' | 'urgent'> = {
  draft: 'neutral',
  review_pending: 'warning',
  approved: 'success',
  deprecated: 'urgent',
  archived: 'neutral',
}

export const RECIPE_DIFFICULTY_LABELS: Record<RecipeDifficulty, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
  expert: 'Experto',
}

export const MENU_TYPE_LABELS: Record<MenuType, string> = {
  buffet: 'Buffet',
  seated: 'Emplatado',
  cocktail: 'Cocktail',
  tasting: 'Degustación',
  daily: 'Menú del día',
}

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  crustaceans: 'Crustáceos',
  eggs: 'Huevos',
  fish: 'Pescado',
  peanuts: 'Cacahuetes',
  soy: 'Soja',
  dairy: 'Lácteos',
  tree_nuts: 'Frutos secos',
  celery: 'Apio',
  mustard: 'Mostaza',
  sesame: 'Sésamo',
  sulfites: 'Sulfitos',
  lupin: 'Altramuces',
  mollusks: 'Moluscos',
}

export const DIETARY_TAG_LABELS: Record<DietaryTag, string> = {
  vegan: 'Vegano',
  vegetarian: 'Vegetariano',
  gluten_free: 'Sin gluten',
  lactose_free: 'Sin lactosa',
  halal: 'Halal',
  kosher: 'Kosher',
  low_salt: 'Bajo en sal',
  keto: 'Keto',
}
