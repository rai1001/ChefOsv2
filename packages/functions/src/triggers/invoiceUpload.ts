import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import * as admin from 'firebase-admin';
import { logError, logInfo } from '../utils/logger';

const client = new DocumentProcessorServiceClient();
const db = admin.firestore();

interface ProcessingResult {
  data: InvoiceData;
  confidence: number;
  processorUsed: 'ocr' | 'form' | 'invoice';
  cost: number;
}

interface InvoiceData {
  supplierName: string;
  totalAmount: number;
  invoiceDate: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

/**
 * LEVEL 1: OCR General ($1.50/1,000 pages)
 * Extrae texto plano y usa regex para parsear campos
 */
async function processWithOCR(
  imageUri: string,
  projectId: string
): Promise<ProcessingResult | null> {
  try {
    const processorId = process.env.DOCUMENT_AI_OCR_PROCESSOR_ID;
    if (!processorId) throw new Error('OCR Processor ID not configured');

    const name = `projects/${projectId}/locations/eu/processors/${processorId}`;
    const [result] = await client.processDocument({
      name,
      gcsDocument: { gcsUri: imageUri, mimeType: 'image/jpeg' },
    });

    const text = result.document?.text || '';
    const parsed = parseInvoiceWithRegex(text);

    if (parsed.confidence > 0.85) {
      logInfo('✅ Level 1 (OCR) succeeded', { confidence: parsed.confidence });
      return {
        data: parsed.data,
        confidence: parsed.confidence,
        processorUsed: 'ocr',
        cost: 0.0015,
      };
    }

    return null;
  } catch (error) {
    logError('Level 1 (OCR) failed', error);
    return null;
  }
}

/**
 * LEVEL 2: Form Parser ($10/1,000 pages)
 * Detecta campos estructurados y tablas
 */
async function processWithFormParser(
  imageUri: string,
  projectId: string
): Promise<ProcessingResult | null> {
  try {
    const processorId = process.env.DOCUMENT_AI_FORM_PROCESSOR_ID;
    if (!processorId) throw new Error('Form Processor ID not configured');

    const name = `projects/${projectId}/locations/eu/processors/${processorId}`;
    const [result] = await client.processDocument({
      name,
      gcsDocument: { gcsUri: imageUri, mimeType: 'image/jpeg' },
    });

    const structured = extractFormFields(result.document);

    if (structured.confidence > 0.8) {
      logInfo('⚠️ Level 2 (Form) succeeded', { confidence: structured.confidence });
      return {
        data: structured.data,
        confidence: structured.confidence,
        processorUsed: 'form',
        cost: 0.01,
      };
    }

    return null;
  } catch (error) {
    logError('Level 2 (Form) failed', error);
    return null;
  }
}

/**
 * LEVEL 3: Invoice Parser ($50/1,000 pages) - ÚLTIMA OPCIÓN
 * IA entrenada específicamente en facturas
 */
async function processWithInvoiceParser(
  imageUri: string,
  projectId: string
): Promise<ProcessingResult> {
  const processorId = process.env.DOCUMENT_AI_INVOICE_PROCESSOR_ID;
  if (!processorId) throw new Error('Invoice Processor ID not configured');

  const name = `projects/${projectId}/locations/eu/processors/${processorId}`;
  const [result] = await client.processDocument({
    name,
    gcsDocument: { gcsUri: imageUri, mimeType: 'image/jpeg' },
  });

  logInfo('🚨 Level 3 (Invoice Parser) used - EXPENSIVE', { cost: 0.05 });

  return {
    data: extractInvoiceEntities(result.document),
    confidence: 0.95,
    processorUsed: 'invoice',
    cost: 0.05,
  };
}

/**
 * Main Storage Trigger - Ejecuta cuando se sube una imagen
 */
export const processRestaurantInvoice = onObjectFinalized(
  {
    bucket: process.env.FIREBASE_STORAGE_BUCKET,
    region: 'europe-southwest1',
  },
  async (event) => {
    const filePath = event.data.name;
    if (!filePath || !filePath.includes('invoices/temp_')) return;

    // Extraer IDs del path: restaurants/{restaurantId}/invoices/temp_{uuid}.jpg
    const pathParts = filePath.split('/');
    if (pathParts[0] !== 'restaurants' || pathParts.length < 4) return;

    const restaurantId = pathParts[1];
    const fileName = pathParts[3];
    const imageUri = `gs://${event.data.bucket}/${filePath}`;

    logInfo('📸 New invoice uploaded', { restaurantId, fileName });

    const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId;
    if (!projectId) throw new Error('Project ID not found');

    try {
      // Estrategia de 3 niveles (cascada)
      let result: ProcessingResult | null = null;

      // LEVEL 1: OCR barato primero
      result = await processWithOCR(imageUri, projectId);

      // LEVEL 2: Form Parser si Level 1 falla
      if (!result) {
        result = await processWithFormParser(imageUri, projectId);
      }

      // LEVEL 3: Invoice Parser como último recurso
      if (!result) {
        result = await processWithInvoiceParser(imageUri, projectId);
      }

      // Smart Ingredient Matching
      if (!result) throw new Error('Failed to process invoice with any processor');
      const matchedItems = await smartIngredientMatch(restaurantId, result.data.lineItems);

      // Guardar en Firestore para revisión humana
      const invoiceRef = await db.collection(`restaurants/${restaurantId}/invoices`).add({
        originalUrl: imageUri,
        status: 'needs_review',
        parsedData: result.data,
        matchedItems: matchedItems,
        confidence: result.confidence,
        processorUsed: result.processorUsed,
        cost: result.cost,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logInfo('✅ Invoice processed successfully', {
        invoiceId: invoiceRef.id,
        processor: result.processorUsed,
        cost: result.cost,
        matchedCount: matchedItems.filter((i) => i.ingredientId).length,
      });
    } catch (error: any) {
      logError('❌ Invoice processing failed', error, { restaurantId, filePath });

      // Guardar error en Firestore para debugging
      await db.collection(`restaurants/${restaurantId}/invoices`).add({
        originalUrl: imageUri,
        status: 'failed',
        error: error.message || 'Unknown error',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);

/**
 * Helper: Parse invoice con regex (Level 1)
 */
function parseInvoiceWithRegex(text: string): { data: InvoiceData; confidence: number } {
  // Buscar Total (múltiples formatos)
  const totalRegex = /(?:total|importe|amount)[:\s]*€?\s*([\d.,]+)/i;
  const totalMatch = text.match(totalRegex);
  const totalAmount = totalMatch && totalMatch[1] ? parseFloat(totalMatch[1].replace(',', '.')) : 0;

  // Buscar Supplier (primeras líneas)
  const lines = text.split('\n').filter((l) => l.trim().length > 3);
  const supplierName = lines[0]?.trim() || 'Unknown Supplier';

  // Buscar Fecha
  const dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/;
  const dateMatch = text.match(dateRegex);
  const invoiceDate =
    dateMatch && dateMatch[1] ? dateMatch[1] : new Date().toISOString().split('T')[0];

  // Line items (muy simplificado - mejorará con templates)
  const lineItems: InvoiceData['lineItems'] = [];
  // TODO: Implementar parsing de tabla si está estructurada

  // Calcular confidence basado en campos encontrados
  let confidence = 0;
  if (totalAmount > 0) confidence += 0.4;
  if (supplierName !== 'Unknown Supplier') confidence += 0.3;
  if (dateMatch) confidence += 0.3;

  return {
    data: {
      supplierName,
      totalAmount,
      invoiceDate,
      lineItems,
    },
    confidence,
  };
}

function extractFormFields(document: any): { data: InvoiceData; confidence: number } {
  // basic implementation as per prompt template
  return {
    data: {
      supplierName: 'Form Parser Supplier',
      totalAmount: 0,
      invoiceDate: new Date().toISOString().split('T')[0],
      lineItems: [],
    },
    confidence: 0.8,
  };
}

/**
 * Helper: Extract entities from Invoice Parser (Level 3)
 */
function extractInvoiceEntities(document: any): InvoiceData {
  const entities = document?.entities || [];

  const findEntity = (type: string) =>
    entities.find((e: any) => e.type === type)?.mentionText || '';

  const lineItemEntities = entities.filter((e: any) => e.type === 'line_item');
  const lineItems = lineItemEntities.map((item: any) => {
    const props = (item.properties || []) as any[];
    return {
      description: props.find((p: any) => p.type === 'line_item/description')?.mentionText || '',
      quantity: parseFloat(
        props.find((p: any) => p.type === 'line_item/quantity')?.mentionText || '1'
      ),
      unitPrice: parseFloat(
        props.find((p: any) => p.type === 'line_item/unit_price')?.mentionText || '0'
      ),
      totalPrice: parseFloat(
        props.find((p: any) => p.type === 'line_item/amount')?.mentionText || '0'
      ),
    };
  });

  return {
    supplierName: findEntity('supplier_name') || 'Unknown',
    totalAmount: parseFloat(findEntity('total_amount') || '0'),
    invoiceDate: findEntity('invoice_date') || new Date().toISOString().split('T')[0],
    lineItems,
  };
}

/**
 * Smart Ingredient Matching - El "cerebro" del sistema
 */
async function smartIngredientMatch(restaurantId: string, ocrItems: InvoiceData['lineItems']) {
  const ingredientsSnap = await db
    .collection('ingredients')
    .where('outletId', '==', restaurantId)
    .get();

  const catalog = ingredientsSnap.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name.toLowerCase(),
    aliases: doc.data().supplierAliases || [],
  }));

  return ocrItems.map((item) => {
    const itemLower = item.description.toLowerCase();

    // 1. Exact match o alias conocido
    const exactMatch = catalog.find((i) => i.name === itemLower || i.aliases.includes(itemLower));

    if (exactMatch) {
      return {
        ...item,
        ingredientId: exactMatch.id,
        matchType: 'exact',
        needsReview: false,
      };
    }

    // 2. Fuzzy match (contiene palabras clave)
    const potentialMatches = catalog.filter(
      (i) => itemLower.includes(i.name) || i.name.includes(itemLower.split(' ')[0])
    );

    if (potentialMatches.length === 1) {
      return {
        ...item,
        ingredientId: potentialMatches[0].id,
        matchType: 'fuzzy',
        needsReview: true,
      };
    }

    // 3. No match - requiere intervención humana
    return {
      ...item,
      ingredientId: null,
      matchType: 'none',
      potentialMatches: potentialMatches.map((m) => ({ id: m.id, name: m.name })),
      needsReview: true,
    };
  });
}
