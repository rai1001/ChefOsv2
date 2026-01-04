/**
 * Gemini API Client for Supabase Edge Functions
 * Handles all interactions with Google's Gemini API
 */

import type { GeminiRequest, GeminiResponse, AIUsageMetrics, AIRequestOptions } from './types.ts';

export class GeminiClient {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private defaultModel = 'gemini-2.0-flash-exp';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API Key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Calculate estimated cost based on token usage
   * Pricing: Input $0.10/1M tokens, Output $0.40/1M tokens
   */
  private calculateCost(usage: AIUsageMetrics): number {
    const inputCost = (usage.inputTokens / 1_000_000) * 0.1;
    const outputCost = (usage.outputTokens / 1_000_000) * 0.4;
    return inputCost + outputCost;
  }

  /**
   * Parse usage metadata from Gemini response
   */
  private parseUsage(response: GeminiResponse): AIUsageMetrics | undefined {
    if (!response.usageMetadata) return undefined;

    const usage: AIUsageMetrics = {
      inputTokens: response.usageMetadata.promptTokenCount || 0,
      outputTokens: response.usageMetadata.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata.totalTokenCount || 0,
      estimatedCost: 0,
    };

    usage.estimatedCost = this.calculateCost(usage);
    return usage;
  }

  /**
   * Generate text from a prompt
   */
  async generateText(
    prompt: string,
    options: AIRequestOptions = {}
  ): Promise<{ text: string; usage?: AIUsageMetrics }> {
    const model = options.model || this.defaultModel;
    const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

    const request: GeminiRequest = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        topK: options.topK ?? 40,
        topP: options.topP ?? 0.95,
        maxOutputTokens: options.maxOutputTokens ?? 2048,
      },
    };

    // Enable JSON mode if requested
    if (options.jsonMode) {
      request.generationConfig!.responseMimeType = 'application/json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response candidates from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;
    const usage = this.parseUsage(data);

    return { text, usage };
  }

  /**
   * Analyze an image with a prompt
   */
  async analyzeImage(
    imageBase64: string,
    prompt: string,
    options: AIRequestOptions = {}
  ): Promise<{ text: string; usage?: AIUsageMetrics }> {
    const model = options.model || this.defaultModel;
    const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

    // Clean base64 string (remove data URI prefix if present)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Determine MIME type from base64 or default to JPEG
    let mimeType = 'image/jpeg';
    if (imageBase64.startsWith('data:')) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,/);
      if (match) mimeType = match[1];
    }

    const request: GeminiRequest = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.4, // Lower temp for structured extraction
        topK: options.topK ?? 40,
        topP: options.topP ?? 0.95,
        maxOutputTokens: options.maxOutputTokens ?? 2048,
      },
    };

    // Enable JSON mode if requested
    if (options.jsonMode) {
      request.generationConfig!.responseMimeType = 'application/json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response candidates from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;
    const usage = this.parseUsage(data);

    return { text, usage };
  }

  /**
   * Helper method to parse JSON from Gemini response
   * Handles common issues like markdown code blocks
   */
  parseJSON<T = any>(text: string): T {
    // Remove markdown code blocks if present
    let cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      // Try to find JSON object in the text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error(`Failed to parse JSON from Gemini response: ${error}`);
        }
      }
      throw new Error(`Failed to parse JSON from Gemini response: ${error}`);
    }
  }
}

/**
 * Create a GeminiClient instance from environment variable
 */
export function createGeminiClient(): GeminiClient {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY environment variable is not set. Please configure it in Supabase secrets.'
    );
  }
  return new GeminiClient(apiKey);
}
