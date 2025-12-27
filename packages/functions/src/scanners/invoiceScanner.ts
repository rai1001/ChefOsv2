import { onCall, HttpsError } from "firebase-functions/v2/https";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

// Initialize Client (outside handler for cold-start reuse)
const client = new DocumentProcessorServiceClient();

interface InvoiceScannerData {
    gcsUri: string;
    fileType?: string;
    outletId?: string; // Optional context
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
    // Remove currency symbols, keep digits, dots, commas (replace comma with dot if needed)
    // Simple heuristic: remove everything strictly not digit, dot, minus.
    // Handling "1.234,56" vs "1,234.56" is complex without locale.
    // We assume dot decimal for now or standard regex.
    const clean = text.replace(/[^0-9.-]/g, '');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
};

export const scanInvoice = onCall({
    timeoutSeconds: 300, 
    memory: "512MiB" 
}, async (request) => {
    // 1. Validation
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { gcsUri, fileType } = request.data as InvoiceScannerData;

    if (!gcsUri) {
        throw new HttpsError('invalid-argument', "The function must be called with a 'gcsUri' argument.");
    }

    // 2. Configuration
    const projectId = process.env.GCLOUD_PROJECT || "antigrabity-ec1d1"; // Fallback or strict
    const location = "eu"; // Document AI location
    const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;

    if (!processorId) {
        // Log warning but don't fail if we can fallback or dev mode
        console.warn("DOCUMENT_AI_PROCESSOR_ID is missing.");
        throw new HttpsError('failed-precondition', "Server configuration missing DOCUMENT_AI_PROCESSOR_ID.");
    }

    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    // 3. Process Document
    const processRequest = {
        name,
        gcsDocument: {
            gcsUri,
            mimeType: fileType || "application/pdf",
        },
    };

    try {
        const [result] = await client.processDocument(processRequest);
        const { document } = result;

        if (!document) {
            throw new Error("Document AI returned empty result.");
        }

        // 4. Parse Entities
        const entities = (document.entities || []) as DocumentEntity[];
        const items = entities.filter((e: DocumentEntity) => e.type === "line_item");

        const parsedItems = items.map((item: DocumentEntity) => {
            const description = item.properties?.find((p: DocumentEntity) => p.type === "line_item/description")?.mentionText || "Item desconocidos";
            const quantityText = item.properties?.find((p: DocumentEntity) => p.type === "line_item/quantity")?.mentionText || "1";
            const unitPriceText = item.properties?.find((p: DocumentEntity) => p.type === "line_item/unit_price")?.mentionText || "0";

            // Attempt to extract unit from description or quantity (e.g. "5 kg")
            // This is a naive extraction. Real-world needs regex.
            const quantity = cleanNumber(quantityText);
            const unitPrice = cleanNumber(unitPriceText);

            return {
                description: description.replace(/\n/g, ' ').trim(),
                quantity: quantity === 0 ? 1 : quantity, // Default to 1 if parsing fails
                unit: 'un', // Default unit, AI usually doesn't separate it cleanly without custom parser
                unitPrice: unitPrice,
                totalPrice: (quantity === 0 ? 1 : quantity) * unitPrice
            };
        });

        // 5. Header Fields
        const totalAmountText = entities.find((e: DocumentEntity) => e.type === "total_amount")?.mentionText || "0";
        const supplierName = entities.find((e: DocumentEntity) => e.type === "supplier_name")?.mentionText || "Unknown Supplier";
        const dateEntity = entities.find((e: DocumentEntity) => e.type === "invoice_date");
        const invoiceDate = dateEntity?.normalizedValue?.text || dateEntity?.mentionText || new Date().toISOString();

        return {
            supplierName: supplierName.replace(/\n/g, ' ').trim(),
            date: invoiceDate,
            totalCost: cleanNumber(totalAmountText),
            items: parsedItems,
            rawText: document.text // Valid for debugging
        };

    } catch (error: any) {
        console.error("Document AI Error:", error);
        // Distinguish between API errors and Auth/Config
        if (error.code === 7 || error.message.includes('permission')) {
            throw new HttpsError('permission-denied', "Service Account missing Document AI permissions.");
        }
        throw new HttpsError('internal', "Failed to process document: " + error.message);
    }
});
