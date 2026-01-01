import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { VertexAI } from '@google-cloud/vertexai';
import * as admin from 'firebase-admin';
import { logError, logWarn } from '../utils/logger';
import { checkRateLimit } from '../utils/rateLimiter';

const visionClient = new ImageAnnotatorClient();

interface InvoiceScannerData {
  gcsUri: string;
  fileType?: string;
  outletId?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface InvoiceData {
  supplierName: string;
  date: string;
  totalCost: number;
  items: InvoiceItem[];
  rawText: string;
}

// Utility function - kept for potential future use
// const cleanNumber = (text: string): number => {
//   if (!text) return 0;
//   const clean = text.replace(/[^0-9.-]/g, '');
//   const val = parseFloat(clean);
//   return isNaN(val) ? 0 : val;
// };

/**
 * Cloud Vision OCR Invoice Scanner V2
 *
 * Cost savings: Uses Cloud Vision (1000 pages FREE/month) instead of Document AI (€0.015/page)
 *
 * Approach:
 * 1. Cloud Vision OCR extracts text (FREE for first 1000 pages)
 * 2. Gemini structures the extracted text into invoice data
 */
export const scanInvoiceV2 = onCall(
  {
    timeoutSeconds: 120, // COST CONTROL: 2 minutes max
    memory: '512MiB',
    maxInstances: 2, // COST CONTROL: Max 2 concurrent scans
    cors: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { gcsUri, outletId } = request.data as InvoiceScannerData;

    if (!gcsUri) {
      throw new HttpsError(
        'invalid-argument',
        "The function must be called with a 'gcsUri' argument."
      );
    }

    await checkRateLimit(uid, 'scan_invoice');

    const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId || 'chefosv2';

    try {
      // Step 1: Extract text using Cloud Vision OCR (FREE for first 1000 pages/month)
      console.log('[Cloud Vision] Starting OCR extraction...', { gcsUri });

      const [result] = await visionClient.documentTextDetection({
        image: { source: { imageUri: gcsUri } },
      });

      const fullTextAnnotation = result.fullTextAnnotation;
      const rawText = fullTextAnnotation?.text || '';

      if (!rawText) {
        throw new Error('Cloud Vision returned empty text.');
      }

      console.log('[Cloud Vision] OCR extracted', rawText.length, 'characters');

      // Step 2: Use Gemini to structure the extracted text
      console.log('[Gemini] Structuring invoice data...');

      const vertexAI = new VertexAI({
        project: projectId,
        location: 'europe-southwest1', // Same region as Cloud Functions
      });

      const model = vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
      });

      const prompt = `You are an invoice data extraction expert. Parse the following invoice text and extract structured data.

INVOICE TEXT:
${rawText}

Extract and return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "supplierName": "supplier name from invoice",
  "date": "invoice date in ISO format YYYY-MM-DD",
  "totalCost": numeric total amount,
  "items": [
    {
      "description": "item description",
      "quantity": numeric quantity,
      "unit": "kg|L|un|etc",
      "unitPrice": numeric unit price,
      "totalPrice": numeric line total
    }
  ]
}

Rules:
- If supplier name not found, use "Unknown Supplier"
- If date not found, use today's date
- If quantity not specified, use 1
- If unit not specified, use "un"
- totalPrice = quantity * unitPrice
- Return valid JSON only, no markdown code blocks`;

      const geminiResult = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistency
          maxOutputTokens: 2048,
        },
      });

      const responseText = geminiResult.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      // Remove markdown code blocks if present
      const cleanJson = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      console.log('[Gemini] Structured response:', cleanJson.substring(0, 200));

      let invoiceData: InvoiceData;
      try {
        invoiceData = JSON.parse(cleanJson);
      } catch (parseError) {
        logWarn('[Gemini] Failed to parse JSON, using fallback', { responseText });
        // Fallback: return raw text with basic structure
        invoiceData = {
          supplierName: 'Unknown Supplier',
          date: new Date().toISOString().split('T')[0] || '',
          totalCost: 0,
          items: [],
          rawText: rawText,
        };
      }

      // Add raw text to response (ensure it's defined)
      if (!invoiceData.rawText) {
        invoiceData.rawText = rawText;
      }

      console.log('[Success] Invoice processed:', {
        supplier: invoiceData.supplierName,
        itemCount: invoiceData.items.length,
        total: invoiceData.totalCost,
      });

      return invoiceData;
    } catch (error: any) {
      logError('Invoice Scanner V2 Error:', error, { uid, gcsUri, outletId });

      if (error.code === 7 || error.message.includes('permission')) {
        throw new HttpsError(
          'permission-denied',
          'Service Account missing Cloud Vision or Vertex AI permissions.'
        );
      }

      throw new HttpsError('internal', 'Failed to process invoice: ' + error.message);
    }
  }
);
