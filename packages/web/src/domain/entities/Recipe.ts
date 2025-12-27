import { Unit } from '@/types';

export type RecipeIngredientType = 'raw' | 'recipe';

export interface RecipeIngredient {
    id: string; // Reference to Ingredient or another Recipe (sub-recipe)
    type: RecipeIngredientType;
    name: string;
    quantity: number; // Gross quantity used
    unit: Unit;
    grossCost: number; // Calculated cost based on quantity * unitCost
    unitCost: number; // Cost per unit at time of calculation
    wastePercentage: number; // Specific wastage for this usage if applicable
}

export class Recipe {
    constructor(
        public id: string,
        public name: string,
        public description: string,
        public category: string,
        public subCategory: string = '',

        // Output / Yield
        public servings: number, // Number of portions
        public yieldQuantity: number, // Total weight/volume if applicable
        public yieldUnit: Unit,

        // Times
        public prepTime: number, // minutes
        public cookTime: number, // minutes

        // Composition
        public ingredients: RecipeIngredient[],
        public instructions: string[],

        // Financials (fixed/manual inputs)
        public laborCost: number,
        public packagingCost: number,
        public sellingPrice: number,
        public targetCostPercent: number = 30, // Target Food Cost %

        // Financials (Calculated/Cached)
        public totalCost: number = 0,
        public costPerServing: number = 0,
        public foodCostPercent: number = 0,
        public grossMargin: number = 0,

        // Metadata
        public outletId?: string,
        public imageUrl?: string,
        public videoUrl?: string,
        public allergens: string[] = [],
        public tags: string[] = [],

        public createdAt: string = new Date().toISOString(),
        public updatedAt: string = new Date().toISOString(),
    ) { }
}
