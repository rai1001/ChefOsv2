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
            You are a nutrition database expert specializing in European food standards (EU Regulation 1169/2011).

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
                "allergens": ["List ALL allergens present or potentially present as traces according to EU Regulation 1169/2011: Gluten, Crustaceans, Eggs, Fish, Peanuts, Soy, Milk, Nuts, Celery, Mustard, Sesame, Sulphites, Lupin, Molluscs"]
            }

            RULES:
            1. Prioritize BEDCA (Spanish) or USDA databases.
            2. Use 0 only for truly zero values. Use null or average if unknown.
            3. If specific variant unknown, use category averages.
            4. STRICTLY follow EU 1169/2011 for allergen naming.
            5. All numbers must be numeric types.
        `;

    const result = await this.generateText(prompt, { jsonMode: true });

    try {
      const text = result.text.trim();
      const cleanJson = text.replace(/^```json\s*|\s*```$/g, '');
      return JSON.parse(cleanJson);
    } catch (e) {
      return { nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 }, allergens: [] };
    }
  }

  async scanDocument(fileOrBase64: File | string, type?: string): Promise<ScannedDocumentResult> {
    let base64 = '';
    if (typeof fileOrBase64 === 'string') {
      base64 = fileOrBase64.includes(',') ? fileOrBase64.split(',')[1]! : fileOrBase64;
    } else {
      throw new Error('GeminiAdapter.scanDocument requires Base64 string for now');
    }

    const prompt = `Analyze this document (Type: ${type || 'General'}). Return a JSON with { "items": [], "rawText": "..." }`;
    const response = await this.analyzeImage(base64, prompt, { jsonMode: true });

    try {
      const text = response.text.trim();
      const cleanJson = text.replace(/^```json\s*|\s*```$/g, '');
      const json = JSON.parse(cleanJson);
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
      const config: any = {};
      if (options?.temperature !== undefined) config.temperature = options.temperature;
      if (options?.jsonMode) config.responseMimeType = 'application/json';

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: Object.keys(config).length > 0 ? config : undefined,
      });
      const response = await result.response;

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

      const response = await result.response;

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

      let text = '';
      try {
        text = response.text();
      } catch (textError) {
        const candidates = (response as any).candidates;
        if (candidates?.[0]?.content?.parts?.[0]?.text) {
          text = candidates[0].content.parts[0].text;
        }
      }

      const finalResponse: AIResponse = {
        text,
        usage,
      };

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
