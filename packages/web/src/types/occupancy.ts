export interface OccupancyData {
    date: Date;
    totalRooms: number;
    occupiedRooms: number;
    occupancyRate: number; // 0-100
    estimatedPax: number;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    specialEvents?: string[];
}

export interface ConsumptionRatio {
    ingredientId: string;
    ingredientName: string;
    quantityPerPax: number;
    unit: string;
    category: 'breakfast' | 'lunch' | 'dinner';
}

export interface IngredientNeed {
    ingredientId: string;
    ingredientName: string;
    quantityNeeded: number;
    unit: string;
    date: Date;
}
