import { NutritionalInfo } from '@/types';

export interface EnrichedIngredientData {
  nutritionalInfo: NutritionalInfo;
  allergens: string[];
}

export interface IngestionIngredient {
  name: string;
  unit: string;
  costPerUnit: number;
  category?: string;
  allergens?: string[];
}

export interface IngestionRecipe {
  name: string;
  description?: string;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  instructions?: string[];
  servings?: number;
}

export interface IngestionStaff {
  name: string;
  role: string;
  hourlyRate?: number;
}

export interface IngestionSupplier {
  name: string;
  taxId?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

export interface IngestionItem<T = any> {
  type: 'ingredient' | 'recipe' | 'staff' | 'supplier' | 'occupancy' | 'unknown';
  data: T;
  confidence: number;
  sheetName?: string;
}

export interface ScannedDocumentResult<T = any> {
  items: T[];
  rawText?: string;
}

export interface AIRequestOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  jsonMode?: boolean;
  promptVersion?: string;
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
  analyzeImage(
    imageBase64: string,
    prompt: string,
    options?: AIRequestOptions
  ): Promise<AIResponse>;
  streamGenerateText(prompt: string, options?: AIRequestOptions): AsyncIterable<string>;
}
