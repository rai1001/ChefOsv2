import { injectable } from 'inversify';
import { functions } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import { IAIService, EnrichedIngredientData, ScannedDocumentResult, AIRequestOptions, AIResponse } from '@/domain/interfaces/services/IAIService';

@injectable()
export class FirebaseAIService implements IAIService {

    async enrichIngredient(name: string): Promise<EnrichedIngredientData> {
        const enrichCallable = httpsCallable<any, EnrichedIngredientData>(functions, 'enrichIngredientCallable');
        try {
            const result = await enrichCallable({ name });
            return result.data;
        } catch (error) {
            console.error("FirebaseAIService: Error enriching ingredient", error);
            // Return empty/safe default to prevent crash
            return { nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 }, allergens: [] };
        }
    }

    async scanDocument(fileOrBase64: File | string, type?: string): Promise<ScannedDocumentResult> {
        const analyzeDocument = httpsCallable<any, { items: any[] }>(functions, 'analyzeDocument');

        try {
            let base64Data: string;
            let mimeType: string = 'image/jpeg'; // Default for base64 string

            if (typeof fileOrBase64 === 'string') {
                if (fileOrBase64.includes('base64,')) {
                    base64Data = fileOrBase64.split('base64,')[1] || '';
                    const meta = fileOrBase64.split(';')[0] || '';
                    if (meta.includes(':')) mimeType = meta.split(':')[1] || 'image/jpeg';
                } else {
                    base64Data = fileOrBase64;
                }
            } else {
                base64Data = await this.fileToBase64(fileOrBase64);
                mimeType = fileOrBase64.type;
            }

            const result = await analyzeDocument({
                base64Data,
                mimeType,
                targetCollection: type
            });

            return { items: result.data.items };
        } catch (error) {
            console.error("FirebaseAIService: Error scanning document", error);
            throw new Error("Failed to scan document via AI");
        }
    }

    async scanSportsMenu(fileOrBase64: File | string): Promise<ScannedDocumentResult> {
        return this.scanDocument(fileOrBase64, 'sportsMenu');
    }

    async generateText(prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
        const generateTextCallable = httpsCallable<any, AIResponse>(functions, 'generateText');
        try {
            const result = await generateTextCallable({ prompt, options });
            return result.data;
        } catch (error) {
            console.error("FirebaseAIService: Error generating text", error);
            throw error;
        }
    }

    async analyzeImage(imageBase64: string, prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
        const analyzeImageCallable = httpsCallable<any, AIResponse>(functions, 'analyzeImage');
        try {
            const result = await analyzeImageCallable({ imageBase64, prompt, options });
            return result.data;
        } catch (error) {
            console.error("FirebaseAIService: Error analyzing image", error);
            throw error;
        }
    }

    async *streamGenerateText(prompt: string, options?: AIRequestOptions): AsyncIterable<string> {
        // Firebase Cloud Functions don't support streaming easily via httpsCallable.
        // We'll fall back to non-streaming for now or throw error if not supported.
        const response = await this.generateText(prompt, options);
        yield response.text;
    }

    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data URL prefix (e.g. "data:image/jpeg;base64,")
                resolve(result?.split(',')[1] || "");
            };
            reader.onerror = error => reject(error);
        });
    }
}
