/**
 * Supabase Edge Function: enrich-ingredient
 *
 * Enriches ingredient data with nutritional information and allergens
 * Uses Gemini AI to provide detailed nutritional data per EU Regulation 1169/2011
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  handleCorsPreflightRequest,
  createErrorResponse,
  createSuccessResponse,
} from '../_shared/cors.ts';
import { createGeminiClient } from '../_shared/gemini-client.ts';
import { getIngredientEnrichmentPrompt } from '../_shared/prompts.ts';
import type { EnrichIngredientRequest, EnrichedIngredientData } from '../_shared/types.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    // Parse request body
    const body: EnrichIngredientRequest = await req.json();

    // Validate required fields
    if (!body.ingredientName) {
      return createErrorResponse('ingredientName is required');
    }

    // Get Gemini client
    const gemini = createGeminiClient();

    // Get enrichment prompt
    const prompt = getIngredientEnrichmentPrompt(body.ingredientName);

    // Generate enrichment data
    const { text, usage } = await gemini.generateText(prompt, {
      temperature: 0.3, // Low temperature for factual data
      maxOutputTokens: 1024,
    });

    // Parse the JSON response
    let enrichedData: EnrichedIngredientData;
    try {
      enrichedData = gemini.parseJSON<EnrichedIngredientData>(text);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', text);
      return createErrorResponse(
        `AI returned invalid JSON. Raw response: ${text.substring(0, 200)}...`
      );
    }

    // Log usage for monitoring
    if (usage) {
      console.log('Gemini API Usage:', {
        outletId: body.outletId,
        ingredient: body.ingredientName,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cost: usage.estimatedCost.toFixed(6),
      });
    }

    return createSuccessResponse(enrichedData, usage);
  } catch (error: any) {
    console.error('Error in enrich-ingredient function:', error);

    // Return user-friendly error message
    const errorMessage = error.message || 'Unknown error occurred';
    return createErrorResponse(`Failed to enrich ingredient: ${errorMessage}`, 500);
  }
});
