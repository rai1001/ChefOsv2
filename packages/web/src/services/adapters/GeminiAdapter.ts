import { getAI, getGenerativeModel } from 'firebase/ai';
import { app } from '@/config/firebase';
import type {
  IAIService,
  AIRequestOptions,
  AIResponse,
  EnrichedIngredientData,
  ScannedDocumentResult,
} from '@/domain/interfaces/services/IAIService';
import { ResilientGeminiWrapper } from '../wrappers/ResilientGeminiWrapper';
import { CostTracker } from '../monitoring/CostTracker';

import { injectable } from 'inversify';

@injectable()
export class GeminiAdapter implements IAIService {
  private model;
  private resiliencer: ResilientGeminiWrapper;

  constructor() {
    const vertexAI = getAI(app);
    this.model = getGenerativeModel(vertexAI, { model: 'gemini-2.0-flash' });
    this.resiliencer = new ResilientGeminiWrapper();
  }

  async enrichIngredient(name: string): Promise<EnrichedIngredientData> {
    const prompt = `
            You are a nutrition database expert specializing in European food standards.

            Analyze this ingredient: "${name}"

            Return ONLY a valid JSON object with this exact structure:
            {
                "nutritionalInfo": {
                    "calories": <number in kcal per 100g>,
                    "protein": <grams per 100g>,
                    "carbs": <grams per 100g>,
                    "fat": <grams per 100g>,
                    "fiber": <grams per 100g>,
                    "sodium": <mg per 100g>
                },
                "allergens": ["List following EU Regulation 1169/2011: Gluten, Crustaceans, Eggs, Fish, Peanuts, Soy, Milk, Nuts, Celery, Mustard, Sesame, Sulphites, Lupin, Molluscs"]
            }

            RULES:
            1. Prioritize BEDCA (Spanish) or USDA databases
            2. Use 0 only for truly zero values, not unknowns
            3. If data unavailable, use category averages (e.g., "white fish" for unknown fish)
            4. Include allergen traces when scientifically documented
            5. All numbers must be numeric types, not strings
        `;
    const result = await this.generateText(prompt);
    // Extract JSON
    try {
      const text = result.text;
      const jsonMatch = /```json\n([\s\S]*?)\n```/.exec(text) || /\{[\s\S]*\}/.exec(text);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to enrich ingredient via Gemini', e);
      return { nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 }, allergens: [] };
    }
  }

  async scanDocument(fileOrBase64: File | string, type?: string): Promise<ScannedDocumentResult> {
    // reuse generic analyze logic or specific prompts?
    // For simplicity, we assume the caller (geminiService usually) handles the sophisticated prompts via analyzeImage,
    // BUT if this is called directly (legacy mode), we need a prompt.

    let base64 = '';
    if (typeof fileOrBase64 === 'string') {
      base64 = fileOrBase64.includes(',') ? fileOrBase64.split(',')[1]! : fileOrBase64;
    } else {
      // File to base64 not implemented here synchronously easily without await.
      throw new Error('GeminiAdapter.scanDocument requires Base64 string for now');
    }

    const prompt = `Analyze this document (Type: ${type || 'General'}). Return a JSON with { "items": [], "rawText": "..." }`;
    const response = await this.analyzeImage(base64, prompt);

    try {
      // Naive parse
      const jsonMatch =
        /```json\n([\s\S]*?)\n```/.exec(response.text) || /\{[\s\S]*\}/.exec(response.text);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response.text;
      const json = JSON.parse(jsonStr);
      return { items: json.items || [], rawText: response.text };
    } catch {
      return { items: [], rawText: response.text };
    }
  }

  async scanSportsMenu(fileOrBase64: File | string): Promise<ScannedDocumentResult> {
    return this.scanDocument(fileOrBase64, 'SportsMenu');
  }

  async generateText(prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
    return this.resiliencer.execute(async () => {
      console.log('[GeminiAdapter] Calling generateContent (Text)...');

      const config: any = {};
      if (options?.temperature !== undefined) config.temperature = options.temperature;
      if (options?.jsonMode) config.responseMimeType = 'application/json';

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: Object.keys(config).length > 0 ? config : undefined,
      });
      const response = await result.response;

      console.log('[GeminiAdapter] Text response keys:', Object.keys(response));

      const usage = response.usageMetadata
        ? {
            promptTokens: Number(response.usageMetadata.promptTokenCount || 0),
            completionTokens: Number(response.usageMetadata.candidatesTokenCount || 0),
            totalTokens: Number(response.usageMetadata.totalTokenCount || 0),
          }
        : undefined;

      if (usage) {
        CostTracker.logUsage(usage, { feature: 'generateText' });
      }

      return {
        text: response.text(),
        usage,
      };
    });
  }

  async analyzeImage(
    imageBase64: string,
    prompt: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    return this.resiliencer.execute(async () => {
      console.log('[GeminiAdapter] Calling generateContent (Multimodal)...');
      const isPdf = imageBase64.startsWith('JVBERi');
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
        },
      };

      const config: any = {};
      if (options?.temperature !== undefined) config.temperature = options.temperature;
      if (options?.jsonMode) config.responseMimeType = 'application/json';

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }],
        generationConfig: Object.keys(config).length > 0 ? config : undefined,
      });

      console.log('[GeminiAdapter] Multimodal result objects keys:', Object.keys(result));

      const response = await result.response;
      console.log('[GeminiAdapter] Multimodal response keys:', Object.keys(response));

      // EXTREME USAGE LOGGING
      if (response.usageMetadata) {
        console.log('[GeminiAdapter] usageMetadata found:', JSON.stringify(response.usageMetadata));
      } else {
        console.warn('[GeminiAdapter] usageMetadata MISSING from response');
      }

      const usage = response.usageMetadata
        ? {
            promptTokens: Number(response.usageMetadata.promptTokenCount || 0),
            completionTokens: Number(response.usageMetadata.candidatesTokenCount || 0),
            totalTokens: Number(response.usageMetadata.totalTokenCount || 0),
          }
        : undefined;

      if (usage) {
        CostTracker.logUsage(usage, { feature: 'analyzeImage' });
      }

      // DEFENSIVE TEXT EXTRACTION
      let text = '';
      try {
        text = response.text();
        console.log('[GeminiAdapter] Extracted text length:', text.length);
      } catch (textError) {
        console.error('[GeminiAdapter] CRITICAL: response.text() failed', textError);
        // Fallback to candidates structure
        const candidates = (response as any).candidates;
        if (candidates?.[0]?.content?.parts?.[0]?.text) {
          text = candidates[0].content.parts[0].text;
          console.log('[GeminiAdapter] Recovered text from candidates fallback.');
        } else {
          console.error('[GeminiAdapter] Could not recover text from candidates.');
        }
      }

      const finalResponse: AIResponse = {
        text,
        usage,
      };

      console.log('[GeminiAdapter] Returning finalResponse with keys:', Object.keys(finalResponse));
      return finalResponse;
    });
  }

  async *streamGenerateText(prompt: string, _options?: AIRequestOptions): AsyncIterable<string> {
    const result = await this.model.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      yield chunk.text();
    }
  }
}
