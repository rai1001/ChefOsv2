import { injectable } from 'inversify';
import type {
  IAIService,
  AIRequestOptions,
  AIResponse,
  EnrichedIngredientData,
  ScannedDocumentResult,
} from '@/domain/interfaces/services/IAIService';

@injectable()
export class GeminiAdapter implements IAIService {
  private apiKey: string | null = null;
  // private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

  constructor() {
    // Attempt to load from env or wait for explicit set
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || null;
  }

  // Allow setting key dynamically (e.g. from Outlet settings)
  setApiKey(key: string) {
    this.apiKey = key;
  }

  async enrichIngredient(name: string): Promise<EnrichedIngredientData> {
    // Basic implementation stub
    return { nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 }, allergens: [] };
  }

  async scanDocument(fileOrBase64: File | string, type?: string): Promise<ScannedDocumentResult> {
    if (!this.apiKey) {
      console.warn('Gemini API Key missing');
      throw new Error(
        'API Key no configurada para AI. Verifica la configuración de la cocina (Configuración > General).'
      );
    }

    try {
      let base64Data = '';
      if (typeof fileOrBase64 === 'string') {
        base64Data = fileOrBase64;
      } else {
        base64Data = await this.fileToBase64(fileOrBase64);
      }

      // 1. Prepare Prompt
      const prompt = `Analiza este documento (Factura, Albarán, Menú o similar). 
      Extrae los items en formato JSON estricto.
      
      Estructura esperada:
      {
        "items": [
          { 
            "name": "Nombre del producto o plato",
            "quantity": 1, 
            "unit": "kg/un/L", 
            "price": 10.5,
            "description": "Descripción si existe"
          }
        ]
      }
      
      Si es un menú, usa quantity=1 por defecto.
      Devuelve SOLO el JSON sin markdown (sin \`\`\`json).`;

      // 2. Call API (Vision)
      const model = 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Data } },
            ],
          },
        ],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // 3. Parse JSON
      // Clean potential markdown blocks
      const jsonStr = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.warn('Failed to parse (trying loose match):', jsonStr);
        // Fallback or re-throw
        parsed = { items: [] };
      }

      return {
        items: parsed.items || [],
        rawText: text,
      };
    } catch (error: any) {
      console.error('AI Scan Error:', error);
      throw new Error('Error analizando documento: ' + error.message);
    }
  }

  async scanSportsMenu(fileOrBase64: File | string): Promise<ScannedDocumentResult> {
    return this.scanDocument(fileOrBase64, 'SportsMenu');
  }

  async generateText(prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
    if (!this.apiKey) return { text: 'API Key Missing', usage: undefined };
    return { text: 'Not implemented for text-only yet', usage: undefined };
  }

  async analyzeImage(
    imageBase64: string,
    prompt: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    const res = await this.scanDocument(imageBase64);
    return { text: JSON.stringify(res.items), usage: undefined };
  }

  async *streamGenerateText(prompt: string, _options?: AIRequestOptions): AsyncIterable<string> {
    yield 'Stream Disabled';
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // helper to strip prefix usually: data:image/png;base64,
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  }
}
