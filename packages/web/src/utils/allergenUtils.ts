import type { RecipeIngredient, Ingredient } from '@/types';

export const ALLERGENS = [
    'Huevo', 'Leche', 'Gluten', 'Frutos de cáscara', 'Cacahuete',
    'Sésamo', 'Altramuz', 'Pescado', 'Crustáceos', 'Moluscos',
    'Soja', 'Apio', 'Mostaza', 'Sulfitos'
];

/**
 * Aggregates allergens from a list of recipe ingredients.
 * @param ingredients List of recipe ingredients
 * @param ingredientMap Map of ingredient details for quick lookup
 * @returns Array of unique allergen strings
 */
export const aggregateAllergens = (
    ingredients: RecipeIngredient[],
    ingredientMap: Map<string, Ingredient>
): string[] => {
    const allergenSet = new Set<string>();

    ingredients.forEach(ri => {
        const ing = ingredientMap.get(ri.ingredientId);
        if (ing?.allergens) {
            ing.allergens.forEach(allergen => allergenSet.add(allergen));
        }
    });

    return Array.from(allergenSet).sort();
};
