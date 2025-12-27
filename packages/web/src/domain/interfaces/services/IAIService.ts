import { NutritionalInfo } from '@/types';

export interface EnrichedIngredientData {
    nutritionalInfo: NutritionalInfo;
    allergens: string[];
}

export interface ScannedDocumentResult {
    items: any[]; // To be refined based on IngestionItem
    rawText?: string;
}

export interface AIRequestOptions {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
}

export interface AIResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface IAIService {
    enrichIngredient(name: string): Promise<EnrichedIngredientData>;
    scanDocument(fileOrBase64: File | string, type?: string): Promise<ScannedDocumentResult>;
    scanSportsMenu(fileOrBase64: File | string): Promise<ScannedDocumentResult>;

    // Low-level Gemini Primitives
    generateText(prompt: string, options?: AIRequestOptions): Promise<AIResponse>;
    analyzeImage(imageBase64: string, prompt: string, options?: AIRequestOptions): Promise<AIResponse>;
    streamGenerateText(prompt: string, options?: AIRequestOptions): AsyncIterable<string>;
}
