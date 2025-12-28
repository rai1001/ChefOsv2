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
export interface ExpirationResult {
  success: boolean;
  date: Date | null;
  dateType: 'EXPIRATION' | 'BEST_BEFORE' | 'UNKNOWN';
  lotCode: string | null;
  confidence: number;
  text: string;
}

/**
 * Scan expiration date and lot code from image using Gemini AI
 */
export async function scanExpirationDate(
  imageElement: HTMLImageElement | HTMLCanvasElement
): Promise<ExpirationResult> {
  try {
    // Convert image to Base64
    let base64Data: string;
    if (imageElement instanceof HTMLCanvasElement) {
      base64Data = imageElement.toDataURL('image/jpeg').split(',')[1] || '';
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');
      ctx.drawImage(imageElement, 0, 0);
      base64Data = canvas.toDataURL('image/jpeg').split(',')[1] || '';
    }

    const prompt = `
            ROL: Actúa como un Inspector de Calidad que verifica etiquetas de caducidad.
            
            TAREA: Extraer la fecha de caducidad y el lot code de esta etiqueta.
            
            INSTRUCCIONES:
            1. PRIORIDAD: Busca explícitamente "Caducidad" o "EXP". Si solo pone "Best Before" o "Consumo Preferente", márcalo como 'BEST_BEFORE'.
            2. FORMATO: Devuelve siempre en formato ISO YYYY-MM-DD.
            3. LOTE: Extrae el código alfanumérico cercano a la fecha (suele empezar por L o LOT).
            
            JSON:
            {
                "date": "YYYY-MM-DD",
                "type": "EXPIRATION" | "BEST_BEFORE",
                "lotCode": "L23409",
                "text": "Texto exacto encontrado (ej: cad 12/11/24)",
                "confidence": 0-100
            }
        `;

    const result = await analyzeImage(base64Data, prompt);

    if (result.success && result.data) {
      const dateStr = result.data.date;
      const type = result.data.type || 'UNKNOWN';
      const lot = result.data.lotCode || null;
      const text = result.data.text || '';
      const confidence = result.data.confidence || 0;

      let dateObj: Date | null = null;
      if (dateStr) {
        dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) dateObj = null;
      }

      return {
        success: !!dateObj,
        date: dateObj,
        dateType: type,
        lotCode: lot,
        confidence: confidence || 90,
        text: text,
      };
    } else {
      return {
        success: false,
        date: null,
        dateType: 'UNKNOWN',
        lotCode: null,
        confidence: 0,
        text: '',
      };
    }
  } catch (error) {
    console.error('AI OCR error:', error);
    return {
      success: false,
      date: null,
      dateType: 'UNKNOWN',
      lotCode: null,
      confidence: 0,
      text: '',
    };
  }
}

/**
 * Cleanup OCR worker (No-op now)
 */
export async function cleanupOCR(): Promise<void> {
  // No worker to terminate
}
