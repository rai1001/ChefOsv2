import { OpenAI } from 'openai';
import { aiConfig } from '@/config/aiConfig';
import type {
  IAIService,
  AIRequestOptions,
  AIResponse,
  EnrichedIngredientData,
  ScannedDocumentResult,
} from '@/domain/interfaces/services/IAIService';
import { CostTracker } from '../monitoring/CostTracker';
import { injectable } from 'inversify';

@injectable()
export class OpenAIAdapter implements IAIService {
  private client: OpenAI | null = null;

  constructor() {
    if (aiConfig.openAIApiKey) {
      this.client = new OpenAI({
        apiKey: aiConfig.openAIApiKey,
        dangerouslyAllowBrowser: true, // Required for client-side usage in Vite
      });
    }
  }

  private getSafeClient(): OpenAI {
    if (!this.client) {
      throw new Error('OpenAI client is not configured. Please provide VITE_OPENAI_API_KEY.');
    }
    return this.client;
  }

  async enrichIngredient(name: string): Promise<EnrichedIngredientData> {
    const prompt = `
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
                "allergens": ["Gluten", "Crustaceans", "Eggs", "Fish", "Peanuts", "Soy", "Milk", "Nuts", "Celery", "Mustard", "Sesame", "Sulphites", "Lupin", "Molluscs"]
            }
        `;

    const result = await this.generateText(prompt, { jsonMode: true });

    try {
      return JSON.parse(result.text);
    } catch (e) {
      console.error('OpenAI JSON parse error:', e);
      return { nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 }, allergens: [] };
    }
  }

  async scanDocument(fileOrBase64: File | string, type?: string): Promise<ScannedDocumentResult> {
    let base64 = '';
    if (typeof fileOrBase64 === 'string') {
      base64 = fileOrBase64.includes(',') ? fileOrBase64.split(',')[1]! : fileOrBase64;
    } else {
      throw new Error('OpenAIAdapter.scanDocument requires Base64 string for now');
    }

    const prompt = `Analyze this document (Type: ${type || 'General'}). Return a JSON with { "items": [], "rawText": "..." }`;

    // OpenAI Vision API usage
    const response = await this.analyzeImage(base64, prompt, { jsonMode: true });

    try {
      const json = JSON.parse(response.text);
      return { items: json.items || [], rawText: response.text };
    } catch (e) {
      return { items: [], rawText: response.text };
    }
  }

  async scanSportsMenu(fileOrBase64: File | string): Promise<ScannedDocumentResult> {
    return this.scanDocument(fileOrBase64, 'SportsMenu');
  }

  async generateText(prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
    const client = this.getSafeClient();
    const response = await client.chat.completions.create({
      model: aiConfig.openAIModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 0.7,
      response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
    });

    const choice = response.choices[0];
    const usage = response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined;

    if (usage) {
      CostTracker.logUsage(usage, { feature: 'generateText', provider: 'openai' });
    }

    return {
      text: choice.message.content || '',
      usage,
    };
  }

  async analyzeImage(
    imageBase64: string,
    prompt: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    const client = this.getSafeClient();

    const response = await client.chat.completions.create({
      model: aiConfig.openAIModel, // usually gpt-4o or gpt-4-vision
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      temperature: options?.temperature ?? 0.7,
      response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
    });

    const choice = response.choices[0];
    const usage = response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined;

    if (usage) {
      CostTracker.logUsage(usage, { feature: 'analyzeImage', provider: 'openai' });
    }

    return {
      text: choice.message.content || '',
      usage,
    };
  }

  async *streamGenerateText(prompt: string, options?: AIRequestOptions): AsyncIterable<string> {
    const client = this.getSafeClient();
    const stream = await client.chat.completions.create({
      model: aiConfig.openAIModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) yield content;
    }
  }
}
