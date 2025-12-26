export type Unit = 'kg' | 'g' | 'L' | 'ml' | 'un' | 'manojo';

export type InventoryCategory = 'meat' | 'fish' | 'produce' | 'dairy' | 'dry' | 'frozen' | 'canned' | 'cocktail' | 'sports_menu' | 'corporate_menu' | 'coffee_break' | 'restaurant' | 'other' | 'preparation';

export interface NutritionalInfo {
    calories: number; // kcal per 100g/ml
    protein: number; // g per 100g/ml
    carbs: number; // g per 100g/ml
    fat: number; // g per 100g/ml
}
