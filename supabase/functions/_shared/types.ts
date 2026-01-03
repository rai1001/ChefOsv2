/**
 * Shared TypeScript types for Supabase Edge Functions
 * These types are used across all AI-related Edge Functions
 */

export interface ScannedItem {
  name: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  category?: string;
  code?: string;
  description?: string;
}

export interface ScannedDocumentResult {
  items: ScannedItem[];
  rawText?: string;
  metadata?: {
    totalAmount?: number;
    currency?: string;
    date?: string;
    vendor?: string;
    documentType?: 'invoice' | 'delivery_note' | 'menu' | 'sports_menu' | 'other';
  };
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface EnrichedIngredientData {
  nutritionalInfo: NutritionalInfo;
  allergens: string[];
  category?: string;
  seasonality?: string[];
}

export interface AIRequestOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  jsonMode?: boolean;
  model?: string;
}

export interface AIUsageMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number; // in USD
}

export interface AIResponse {
  text: string;
  usage?: AIUsageMetrics;
}

// Request/Response types for Edge Functions
export interface ScanDocumentRequest {
  imageBase64: string;
  type?: 'invoice' | 'menu' | 'sports_menu' | 'delivery_note';
  outletId?: string;
}

export interface ScanDocumentResponse {
  success: boolean;
  data?: ScannedDocumentResult;
  usage?: AIUsageMetrics;
  error?: string;
}

export interface EnrichIngredientRequest {
  ingredientName: string;
  outletId?: string;
}

export interface EnrichIngredientResponse {
  success: boolean;
  data?: EnrichedIngredientData;
  usage?: AIUsageMetrics;
  error?: string;
}

// Gemini API types
export interface GeminiContent {
  parts: Array<{
    text?: string;
    inline_data?: {
      mime_type: string;
      data: string;
    };
  }>;
  role?: string;
}

export interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
