import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import * as admin from 'firebase-admin';
import { logError, logWarn } from '../utils/logger';
import { checkRateLimit } from '../utils/rateLimiter';

const client = new DocumentProcessorServiceClient();

interface InvoiceScannerData {
  gcsUri: string;
  fileType?: string;
  outletId?: string;
}

interface DocumentEntity {
  type: string;
  mentionText?: string;
  normalizedValue?: {
    text?: string;
  };
  properties?: DocumentEntity[];
}

const cleanNumber = (text: string): number => {
  if (!text) return 0;
  const clean = text.replace(/[^0-9.-]/g, '');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
};

export const scanInvoice = onCall(
  {
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { gcsUri, fileType, outletId } = request.data as InvoiceScannerData;

    if (!gcsUri) {
      throw new HttpsError(
        'invalid-argument',
        "The function must be called with a 'gcsUri' argument."
      );
    }

    await checkRateLimit(uid, 'scan_invoice');

    const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId || 'chefosv2';
    const location = 'eu';
    const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;

    if (!processorId) {
      logWarn('DOCUMENT_AI_PROCESSOR_ID is missing.', { uid });
      throw new HttpsError(
        'failed-precondition',
        'Server configuration missing DOCUMENT_AI_PROCESSOR_ID.'
      );
    }

    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    const processRequest = {
      name,
      gcsDocument: {
        gcsUri,
        mimeType: fileType || 'application/pdf',
      },
    };

    try {
      const [result] = await client.processDocument(processRequest);
      const { document } = result;

      if (!document) {
        throw new Error('Document AI returned empty result.');
      }

      const entities = (document.entities || []) as DocumentEntity[];
      const items = entities.filter((e: DocumentEntity) => e.type === 'line_item');

      const parsedItems = items.map((item: DocumentEntity) => {
        const description =
          item.properties?.find((p: DocumentEntity) => p.type === 'line_item/description')
            ?.mentionText || 'Item desconocidos';
        const quantityText =
          item.properties?.find((p: DocumentEntity) => p.type === 'line_item/quantity')
            ?.mentionText || '1';
        const unitPriceText =
          item.properties?.find((p: DocumentEntity) => p.type === 'line_item/unit_price')
            ?.mentionText || '0';

        const quantity = cleanNumber(quantityText);
        const unitPrice = cleanNumber(unitPriceText);

        return {
          description: description.replace(/\n/g, ' ').trim(),
          quantity: quantity === 0 ? 1 : quantity,
          unit: 'un',
          unitPrice: unitPrice,
          totalPrice: (quantity === 0 ? 1 : quantity) * unitPrice,
        };
      });

      const totalAmountText =
        entities.find((e: DocumentEntity) => e.type === 'total_amount')?.mentionText || '0';
      const supplierName =
        entities.find((e: DocumentEntity) => e.type === 'supplier_name')?.mentionText ||
        'Unknown Supplier';
      const dateEntity = entities.find((e: DocumentEntity) => e.type === 'invoice_date');
      const invoiceDate =
        dateEntity?.normalizedValue?.text || dateEntity?.mentionText || new Date().toISOString();

      return {
        supplierName: supplierName.replace(/\n/g, ' ').trim(),
        date: invoiceDate,
        totalCost: cleanNumber(totalAmountText),
        items: parsedItems,
        rawText: document.text,
      };
    } catch (error: any) {
      logError('Document AI Error:', error, { uid, gcsUri, outletId });
      if (error.code === 7 || error.message.includes('permission')) {
        throw new HttpsError(
          'permission-denied',
          'Service Account missing Document AI permissions.'
        );
      }
      throw new HttpsError('internal', 'Failed to process document: ' + error.message);
    }
  }
);
