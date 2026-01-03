// import { getAI, getGenerativeModel } from 'firebase/ai';
// import { app } from '@/config/firebase';
import type {
  IAIService,
  AIRequestOptions,
  AIResponse,
  EnrichedIngredientData,
  ScannedDocumentResult,
} from '@/domain/interfaces/services/IAIService';
// import { ResilientGeminiWrapper } from '../wrappers/ResilientGeminiWrapper';
// import { CostTracker } from '../monitoring/CostTracker';

import { injectable } from 'inversify';

@injectable()
export class GeminiAdapter implements IAIService {
  // private model;
  // private resiliencer: ResilientGeminiWrapper;

  constructor() {
    // const vertexAI = getAI(app);
    // this.model = getGenerativeModel(vertexAI, { model: 'gemini-2.0-flash' });
    // this.resiliencer = new ResilientGeminiWrapper();
  }

  async enrichIngredient(name: string): Promise<EnrichedIngredientData> {
    return { nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 }, allergens: [] };
  }

  async scanDocument(fileOrBase64: File | string, type?: string): Promise<ScannedDocumentResult> {
    return { items: [], rawText: 'AI Disabled' };
  }

  async scanSportsMenu(fileOrBase64: File | string): Promise<ScannedDocumentResult> {
    return this.scanDocument(fileOrBase64, 'SportsMenu');
  }

  async generateText(prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
    return { text: 'AI Disabled during migration', usage: undefined };
  }

  async analyzeImage(
    imageBase64: string,
    prompt: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    return { text: 'AI Disabled during migration', usage: undefined };
  }

  async *streamGenerateText(prompt: string, _options?: AIRequestOptions): AsyncIterable<string> {
    yield 'AI Disabled';
  }
}
