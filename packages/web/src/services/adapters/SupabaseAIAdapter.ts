import { injectable } from 'inversify';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  IAIService,
  AIRequestOptions,
  AIResponse,
  EnrichedIngredientData,
  ScannedDocumentResult,
} from '@/domain/interfaces/services/IAIService';

/**
 * Supabase AI Adapter
 * Calls Supabase Edge Functions instead of calling Gemini API directly
 * This keeps API keys secure on the server side
 */
@injectable()
export class SupabaseAIAdapter implements IAIService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPA_URL;
    const supabaseKey = import.meta.env.VITE_SUPA_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase configuration missing. Set VITE_SUPA_URL and VITE_SUPA_KEY environment variables.'
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Scan a document (invoice, menu, etc.) using the scan-document Edge Function
   */
  async scanDocument(fileOrBase64: File | string, type?: string): Promise<ScannedDocumentResult> {
    try {
      // Convert File to base64 if needed
      let imageBase64: string;
      if (typeof fileOrBase64 === 'string') {
        imageBase64 = fileOrBase64;
      } else {
        imageBase64 = await this.fileToBase64(fileOrBase64);
      }

      // Call the Edge Function
      const { data, error } = await this.supabase.functions.invoke('scan-document', {
        body: {
          imageBase64,
          type: type || 'menu', // Default to generic menu type
        },
      });

      if (error) {
        console.error('Supabase Edge Function error:', error);
        throw new Error(`Edge Function failed: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error from Edge Function');
      }

      // Log usage for monitoring
      if (data.usage) {
        console.log('[Supabase AI] Usage:', {
          inputTokens: data.usage.inputTokens,
          outputTokens: data.usage.outputTokens,
          cost: `$${data.usage.estimatedCost.toFixed(6)}`,
        });
      }

      return data.data;
    } catch (error: any) {
      console.error('Error calling scan-document Edge Function:', error);
      throw new Error(`Failed to scan document: ${error.message}`);
    }
  }

  /**
   * Scan a sports menu using the scan-document Edge Function with sports_menu type
   */
  async scanSportsMenu(fileOrBase64: File | string): Promise<ScannedDocumentResult> {
    return this.scanDocument(fileOrBase64, 'sports_menu');
  }

  /**
   * Enrich ingredient with nutritional data using enrich-ingredient Edge Function
   */
  async enrichIngredient(name: string): Promise<EnrichedIngredientData> {
    try {
      // Call the Edge Function
      const { data, error } = await this.supabase.functions.invoke('enrich-ingredient', {
        body: {
          ingredientName: name,
        },
      });

      if (error) {
        console.error('Supabase Edge Function error:', error);
        throw new Error(`Edge Function failed: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error from Edge Function');
      }

      // Log usage for monitoring
      if (data.usage) {
        console.log('[Supabase AI] Usage:', {
          inputTokens: data.usage.inputTokens,
          outputTokens: data.usage.outputTokens,
          cost: `$${data.usage.estimatedCost.toFixed(6)}`,
        });
      }

      return data.data;
    } catch (error: any) {
      console.error('Error calling enrich-ingredient Edge Function:', error);
      // Return fallback data instead of throwing
      return {
        nutritionalInfo: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
        allergens: [],
      };
    }
  }

  /**
   * Generate text using AI
   * TODO: Implement generate-text Edge Function
   */
  async generateText(prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
    console.warn('generateText not yet implemented with Edge Functions');
    return { text: 'Not implemented', usage: undefined };
  }

  /**
   * Analyze an image
   * TODO: Implement analyze-image Edge Function
   */
  async analyzeImage(
    imageBase64: string,
    prompt: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    console.warn('analyzeImage not yet implemented with Edge Functions');
    return { text: 'Not implemented', usage: undefined };
  }

  /**
   * Stream generate text
   * TODO: Implement with Edge Functions streaming
   */
  async *streamGenerateText(prompt: string, options?: AIRequestOptions): AsyncIterable<string> {
    console.warn('streamGenerateText not yet implemented with Edge Functions');
    yield 'Not implemented';
  }

  /**
   * Convert File to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result); // Keep data URI prefix for Edge Function
      };
      reader.onerror = reject;
    });
  }
}
