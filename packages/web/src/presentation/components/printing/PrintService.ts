import type { Ingredient, Recipe, Unit } from '@/types';

export interface LabelData {
    title: string;
    date: Date;
    expiryDate?: Date;
    quantity?: string;
    unit?: Unit;
    allergens?: string[];
    batchNumber?: string;
    type: 'INGREDIENT' | 'PREP' | 'BUFFET';
}

export const PRINT_EVENT = 'kitchen-app:print-label';

export const printLabel = (data: LabelData) => {
    const event = new CustomEvent(PRINT_EVENT, { detail: data });
    window.dispatchEvent(event);
};

export const calculateExpiry = (startDate: Date, days?: number): Date | undefined => {
    if (!days) return undefined;
    const expiry = new Date(startDate);
    expiry.setDate(startDate.getDate() + days);
    return expiry;
};

export const formatLabelData = (
    item: Ingredient | Recipe,
    type: LabelData['type'],
    quantity?: number
): LabelData => {
    const now = new Date();

    if (type === 'INGREDIENT') {
        const ing = item as Ingredient;
        // Default expiry logic could be added here if not present in item
        return {
            title: ing.name,
            date: now,
            expiryDate: calculateExpiry(now, ing.shelfLife),
            allergens: ing.allergens,
            type: 'INGREDIENT',
            quantity: quantity ? `${quantity} ${ing.unit}` : undefined,
        };
    } else {
        const rec = item as Recipe;
        return {
            title: rec.name,
            date: now,
            allergens: rec.allergens,
            type: type,
            quantity: quantity ? `${quantity} raciones` : undefined,
        };
    }
};
