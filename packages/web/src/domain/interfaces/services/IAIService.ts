import { NutritionalInfo } from '../../types';

export interface EnrichedIngredientData {
    nutritionalInfo: NutritionalInfo;
    allergens: string[];
}

export interface ScannedDocumentResult {
    items: any[]; // To be refined based on IngestionItem
    rawText?: string;
}

export interface IAIService {
    enrichIngredient(name: string): Promise<EnrichedIngredientData>;
    scanDocument(file: File, type?: string): Promise<ScannedDocumentResult>;
}
