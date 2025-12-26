import { injectable } from 'inversify';
import { functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { IAIService, EnrichedIngredientData, ScannedDocumentResult } from '../../domain/interfaces/services/IAIService';

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

    async scanDocument(file: File, type?: string): Promise<ScannedDocumentResult> {
        const analyzeDocument = httpsCallable<any, { items: any[] }>(functions, 'analyzeDocument');

        try {
            const base64Data = await this.fileToBase64(file);
            const result = await analyzeDocument({
                base64Data,
                mimeType: file.type,
                targetCollection: type
            });

            return { items: result.data.items };
        } catch (error) {
            console.error("FirebaseAIService: Error scanning document", error);
            throw new Error("Failed to scan document via AI");
        }
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
