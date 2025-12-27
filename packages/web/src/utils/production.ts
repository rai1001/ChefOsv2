import type { Menu } from '@/types';

export interface ShoppingItem {
    ingredientId: string;
    ingredientName: string;
    unit: string;
    totalQuantity: number; // Gross needed
    totalCost: number;
}

export const calculateShoppingList = (
    menu: Menu,
    pax: number
): ShoppingItem[] => {
    const itemsMap = new Map<string, ShoppingItem>();

    // Iterate over all recipes in the menu
    menu.recipes?.forEach(recipe => {
        recipe.ingredients.forEach(ri => {
            // Logic: 
            // Qty in Recipe is usually for X servings. 
            // Assumption: Data imported is normalized to 1 Serving, OR we simply multiply by PAX.
            // If the Excel is "Recipe for 10 people", we need that metadata. 
            // For this MVP, we assume the Quantity in Excel is "Per Serving" (or user scales it).
            // Let's assume Per Serving for simplicity as 'PAX' implies dynamic scaling.

            // If recipe has overhead/buffer? 
            // We prioritize exact math: Qty * PAX.

            const quantityNeeded = ri.quantity * pax;
            const cost = (ri.ingredient?.costPerUnit || 0) * quantityNeeded;

            const existing = itemsMap.get(ri.ingredientId);
            if (existing) {
                existing.totalQuantity += quantityNeeded;
                existing.totalCost += cost;
            } else {
                itemsMap.set(ri.ingredientId, {
                    ingredientId: ri.ingredientId,
                    ingredientName: ri.ingredient?.name || 'Unknown',
                    unit: ri.ingredient?.unit || 'units',
                    totalQuantity: quantityNeeded,
                    totalCost: cost
                });
            }
        });
    });

    return Array.from(itemsMap.values());
};
