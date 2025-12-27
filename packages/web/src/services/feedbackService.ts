import type { AISample, Supplier } from '@/types/suppliers';

/**
 * Capture a correction from the user after an AI OCR scan
 * and store it as a 'Golden Record' sample for future scans of this supplier.
 */
export async function saveAICorrection(
    supplier: Supplier,
    rawCapturedText: string,
    correctedData: any
): Promise<Supplier> {
    const newSample: AISample = {
        rawTextSnippet: rawCapturedText.substring(0, 1000), // Protect against massive blobs
        verifiedData: correctedData
    };

    // Initialize aiConfig if it doesn't exist
    const currentConfig = supplier.aiConfig || { samples: [] };
    const currentSamples = currentConfig.samples || [];

    // Keep only the last 5 samples to avoid prompt bloat and token limits
    const updatedSamples = [newSample, ...currentSamples].slice(0, 5);

    const updatedSupplier: Supplier = {
        ...supplier,
        aiConfig: {
            ...currentConfig,
            samples: updatedSamples
        }
    };

    // Note: The actual persistence to Firestore should be handled by the store/slice
    // but this service encapsulates the logic of sample management.
    return updatedSupplier;
}
