
import type {
    Event,
    Menu,
    Recipe,
    Ingredient
} from '@/types';

interface Requirement {
    ingredientId: string;
    ingredientName: string;
    totalGrossQuantity: number;
    unit: string;
    wastageFactor: number;
    subItems?: {
        eventId: string;
        eventName: string;
        quantity: number;
    }[];
}

interface ExplosionContext {
    menus: Record<string, Menu>;
    recipes: Record<string, Recipe>;
    ingredients: Record<string, Ingredient>;
}

/**
 * Service to calculate purchasing requirements based on events
 */
export const RequirementsService = {

    /**
     * Calculates the total raw ingredients needed for a list of events.
     * Recursively explodes recipes to their base ingredients.
     */
    calculateRequirements: (
        events: Event[],
        context: ExplosionContext
    ): Requirement[] => {
        const requirementsMap = new Map<string, Requirement>();

        const addRequirement = (
            ingredientId: string,
            quantity: number,
            eventId: string,
            eventName: string
        ) => {
            const ingredient = context.ingredients[ingredientId];
            if (!ingredient) {
                console.warn(`Ingredient not found: ${ingredientId}`);
                return;
            }

            // Apply Wastage Factor: Gross = Net / (1 - Waste)
            // Default 0 waste if undefined.
            // If wastageFactor is 0.2 (20%), and we need 100g, we buy 125g.
            const wastage = ingredient.wastageFactor || 0;
            // Avoid division by zero if waste is 100% (shouldn't happen but safety first)
            const safeWastage = wastage >= 1 ? 0.99 : wastage;
            const grossQuantity = quantity / (1 - safeWastage);

            if (!requirementsMap.has(ingredientId)) {
                requirementsMap.set(ingredientId, {
                    ingredientId,
                    ingredientName: ingredient.name,
                    totalGrossQuantity: 0,
                    unit: ingredient.unit,
                    wastageFactor: wastage,
                    subItems: []
                });
            }

            const req = requirementsMap.get(ingredientId)!;

            // Normalize units if needed?
            // Ideally, recipes use same unit as ingredient stock unit, or we convert.
            // For this version, we assume the RecipeIngredient quantity is ALREADY in the Ingredient's unit
            // OR we rely on the fact that if they differ, we might need conversion.
            // The prompt "Ensure clean UI... calculations are transparent regardless of unit" implies we should handle it.
            // Let's assume RecipeIngredient.quantity is in RecipeIngredient.unit (if it existed)
            // But RecipeIngredient definition in types only has 'quantity', implying it matches Ingredient.unit?
            // Checking types: RecipeIngredient has 'quantity' but no explicit 'unit'.
            // Implicitly, it usually means it matches the Ingredient's native unit OR standard metric.
            // *Correction*: In many systems, Recipe defines unit.
            // Current `RecipeIngredient` in `types/index.ts` only has `quantity`.
            // Assumption: The quantity in RecipeIngredient IS in the unit of the Ingredient (ingredient.unit).

            req.totalGrossQuantity += grossQuantity;
            req.subItems?.push({
                eventId,
                eventName,
                quantity: grossQuantity
            });
        };

        const explodeRecipe = (
            recipeId: string,
            multiplier: number,
            eventId: string,
            eventName: string
        ) => {
            const recipe = context.recipes[recipeId];
            if (!recipe) {
                // Check if this ID corresponds to a Base Ingredient that is NOT a recipe
                // Actually, this function is called with recipeId.
                return;
            }

            recipe.ingredients.forEach(ri => {
                const subIngredientId = ri.ingredientId;
                const subQuantity = ri.quantity * multiplier;

                // RECURSION CHECK:
                // Does this ingredient correspond to another Recipe?
                // Logic: Check if there is a recipe with ID == subIngredientId
                // AND that recipe is marked as `isBase`.
                const subRecipe = context.recipes[subIngredientId];

                if (subRecipe?.isBase) {
                    // Recursive explosion
                    explodeRecipe(subIngredientId, subQuantity, eventId, eventName);
                } else {
                    // It's a raw ingredient (or a base that we don't have recipe for, so treat as ingredient)
                    addRequirement(subIngredientId, subQuantity, eventId, eventName);
                }
            });
        };

        events.forEach(event => {
            if (!event.menuId || !event.pax) return;

            const menu = context.menus[event.menuId];
            if (!menu) return;

            menu.recipeIds.forEach(recipeId => {
                // If the recipe exists, explode it.
                // Multiplier = Event PAX (assuming recipe quantities are PER PAX?
                // Or are recipe quantities for X yield?)

                const recipe = context.recipes[recipeId];
                if (!recipe) return;

                // Logic: Recipe ingredients are usually for "YieldPax" portions.
                // If Recipe Yield is 10, and we have 100 pax, multiplier is 10.
                // If Yield is undefined, assume 1? Or assume per-pax?
                // Standard: Recipe quantities are for `recipe.yieldPax`.

                const yieldPax = recipe.yieldPax || 1;
                const multiplier = event.pax / yieldPax;

                explodeRecipe(recipeId, multiplier, event.id, event.name);
            });
        });

        return Array.from(requirementsMap.values());
    }
};
