import type { Unit } from './inventory';

export type WasteActionType = 'FLASH_SALE' | 'BUFFET' | 'PRESERVE';

export interface WasteSuggestion {
    batchId: string;
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: Unit;
    expiresInHours: number;
    suggestedAction: WasteActionType;
    reasoning: string;
    recipeName?: string;
    discountPercentage?: number;
}

export interface ProductionTask {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    source: 'ZERO_WASTE' | 'MANUAL';
    priority: 'high' | 'medium' | 'low';
    ingredientId?: string;
    batchId?: string;
    createdAt: string;
    deadline?: string;
    outletId: string;
}
