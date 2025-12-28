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
        Eres un experto en OCR especializado en etiquetado de alimentos y trazabilidad.

        Analiza esta imagen para extraer la fecha de caducidad y datos de trazabilidad.

        REGLAS DE INTERPRETACIÓN:
        1. Diferencia entre "Fecha de Caducidad" (Expiration Date) y "Consumo Preferente" (Best Before).
        2. Formatos de fecha: soporta DD/MM/YY, DD-MM-YYYY, MM/YYYY.
        3. Lot Code: busca códigos que empiecen por L:, LOT, LOTE o códigos alfanuméricos aislados cerca de la fecha.
        4. Si hay varias fechas, identifica la primaria (la de caducidad más próxima).

        Devuelve SOLO JSON:
        {
            "primaryDate": "YYYY-MM-DD",
            "dateType": "EXPIRATION" | "BEST_BEFORE",
            "lotCode": "string o null",
            "detectedFormat": "string (ej: DD/MM/YY)",
            "location": "Top-right | Label | Inkjet printer | etc",
            "confidence": <0-100>,
            "confidenceReason": "Explicación breve",
            "validation": {
                "isExpired": <true/false respecto a hoy 2025-12-28>,
                "isFormatStandard": <true/false>
            },
            "imageQuality": "HIGH | MEDIUM | LOW"
        }
    `;

    const result = await analyzeImage(base64Data, prompt);

    if (result.success && result.data) {
      const dateStr = result.data.primaryDate || result.data.date;
      const type = result.data.dateType || result.data.type || 'UNKNOWN';
      const lot = result.data.lotCode || null;
      const confidence = result.data.confidence || 0;
      const text = result.data.confidenceReason || result.data.text || '';

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
