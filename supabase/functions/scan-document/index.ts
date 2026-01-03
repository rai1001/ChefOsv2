/**
 * Supabase Edge Function: scan-document
 *
 * Scans invoices, delivery notes, menus, and other documents using Gemini Vision AI
 * Extracts structured data from images and returns JSON
 *
 * Used by:
 * - UniversalImporter
 * - InvoiceScanner
 * - DataImportModal
 * - Various other components that need document scanning
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  handleCorsPreflightRequest,
  createErrorResponse,
  createSuccessResponse,
} from '../_shared/cors.ts';
import { createGeminiClient } from '../_shared/gemini-client.ts';
import {
  getDocumentScannerPrompt,
  getInvoiceScannerPrompt,
  getSportsMenuScannerPrompt,
} from '../_shared/prompts.ts';
import type { ScanDocumentRequest, ScannedDocumentResult } from '../_shared/types.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    // Parse request body
    const body: ScanDocumentRequest = await req.json();

    // Validate required fields
    if (!body.imageBase64) {
      return createErrorResponse('imageBase64 is required');
    }

    // Get Gemini client
    const gemini = createGeminiClient();

    // Select appropriate prompt based on document type
    let prompt: string;
    switch (body.type) {
      case 'invoice':
        prompt = getInvoiceScannerPrompt();
        break;
      case 'sports_menu':
        prompt = getSportsMenuScannerPrompt();
        break;
      case 'menu':
      case 'delivery_note':
      default:
        prompt = getDocumentScannerPrompt();
        break;
    }

    // Analyze the document image
    const { text, usage } = await gemini.analyzeImage(body.imageBase64, prompt, {
      temperature: 0.2, // Low temperature for consistent structured output
      maxOutputTokens: 2048,
    });

    // Parse the JSON response
    let parsedData: any;
    try {
      parsedData = gemini.parseJSON(text);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', text);
      return createErrorResponse(
        `AI returned invalid JSON. Raw response: ${text.substring(0, 200)}...`
      );
    }

    // Transform the response based on document type
    let result: ScannedDocumentResult;

    if (body.type === 'invoice') {
      // Invoice-specific format
      result = {
        items: (parsedData.items || []).map((item: any) => ({
          name: item.description || item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.lineTotal || item.totalPrice,
          code: item.code,
          category: undefined,
        })),
        rawText: text,
        metadata: {
          totalAmount: parsedData.totalCost || parsedData.totalAmount,
          currency: parsedData.currency || 'EUR',
          date: parsedData.issueDate || parsedData.date,
          vendor: parsedData.supplierName || parsedData.vendor,
          documentType: 'invoice',
        },
      };
    } else if (body.type === 'sports_menu') {
      // Sports menu specific format
      result = {
        items: (parsedData.items || []).map((item: any) => ({
          name: item.name,
          quantity: item.quantity || 1,
          unit: 'un',
          category: item.category,
          description: item.description,
        })),
        rawText: text,
        metadata: {
          vendor: parsedData.eventName,
          date: parsedData.eventDate,
          documentType: 'sports_menu',
        },
      };
    } else {
      // Generic document format
      result = {
        items: (parsedData.items || []).map((item: any) => ({
          name: item.name || item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.price || item.unitPrice,
          totalPrice: item.totalPrice,
          description: item.description,
          category: item.category,
        })),
        rawText: text,
        metadata: parsedData.metadata || {
          totalAmount: parsedData.totalAmount,
          date: parsedData.date,
          vendor: parsedData.vendor,
        },
      };
    }

    // Log usage for monitoring (optional)
    if (usage) {
      console.log('Gemini API Usage:', {
        outletId: body.outletId,
        type: body.type,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cost: usage.estimatedCost.toFixed(6),
      });

      // TODO: Save to ai_usage table in Supabase for budget tracking
      // This would require Supabase client connection
    }

    return createSuccessResponse(result, usage);
  } catch (error: any) {
    console.error('Error in scan-document function:', error);

    // Return user-friendly error message
    const errorMessage = error.message || 'Unknown error occurred';
    return createErrorResponse(`Failed to scan document: ${errorMessage}`, 500);
  }
});
