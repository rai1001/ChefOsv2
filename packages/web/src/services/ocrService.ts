import { analyzeImage } from './geminiService';


export interface OCRResult {
    success: boolean;
    text: string;
    confidence: number;
    date: Date | null;
}

/**
 * Scan expiration date from image using Gemini AI (replaces Tesseract)
 * @param imageElement - Image element or canvas containing the date
 * @returns OCR result with parsed date
 */
export async function scanExpirationDate(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<OCRResult> {
    try {
        // Convert image to Base64
        let base64Data: string;
        if (imageElement instanceof HTMLCanvasElement) {
            base64Data = (imageElement.toDataURL('image/jpeg').split(',')[1]) || '';
        } else {
            const canvas = document.createElement('canvas');
            canvas.width = imageElement.width;
            canvas.height = imageElement.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not create canvas context');
            ctx.drawImage(imageElement, 0, 0);
            base64Data = (canvas.toDataURL('image/jpeg').split(',')[1]) || '';
        }

        const prompt = `
            Analyze this product label image.
            Find the Expiration Date / Best Before date.
            Return a JSON object:
            {
                "date": "YYYY-MM-DD",
                "text": "The exact text found on the label",
                "confidence": 0-100
            }
            If no date found, return null for date.
        `;

        const result = await analyzeImage(base64Data, prompt);

        if (result.success && result.data) {
            const dateStr = result.data.date;
            const text = result.data.text || '';
            const confidence = result.data.confidence || 0;

            let dateObj: Date | null = null;
            if (dateStr) {
                dateObj = new Date(dateStr);
                // Basic validation
                if (isNaN(dateObj.getTime())) dateObj = null;
            }

            return {
                success: !!dateObj,
                text: text,
                confidence: confidence || 90, // AI is usually confident
                date: dateObj
            };
        } else {
            return {
                success: false,
                text: '',
                confidence: 0,
                date: null
            };
        }

    } catch (error) {
        console.error('AI OCR error:', error);
        return {
            success: false,
            text: '',
            confidence: 0,
            date: null
        };
    }
}

/**
 * Cleanup OCR worker (No-op now)
 */
export async function cleanupOCR(): Promise<void> {
    // No worker to terminate
}
