export interface AISample {
    rawTextSnippet: string; // Part of the original OCR text
    verifiedData: any;      // User-corrected data
}

export interface SupplierAIConfig {
    hints?: string;          // e.g., "VAT appears as 'Impuesto 21%'"
    samples?: AISample[];    // Few-Shot samples for the model
}

export interface Supplier {
    id: string;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    leadTime?: number; // Days to deliver
    orderDays?: number[]; // Days of week (0-6) they accept/deliver orders
    minimumOrderValue?: number; // Minimum monetary value for an order
    outletId?: string;

    // New fields for Automatic Purchases
    address?: string;
    taxId?: string; // NIF/CIF
    paymentTerms?: string; // e.g., "Net 30", "Immediate"
    deliveryWindows?: { start: string; end: string }[]; // e.g., "08:00"-"12:00"
    aiConfig?: SupplierAIConfig;
}

export interface SupplierOption {
    supplierId: string;
    supplierName: string;
    price: number;
    unit: string;
    leadTimeDays: number;
    qualityRating: number; // 1-5
    reliabilityScore: number; // 0-100 (based on on-time deliveries)
    isPrimary: boolean;
    isActive: boolean;
    lastOrderDate?: string;
    minimumOrder?: number;
}

export interface IngredientSupplierConfig {
    ingredientId: string;
    suppliers: SupplierOption[];
    selectionCriteria: {
        priorityFactor: 'price' | 'quality' | 'reliability' | 'leadTime';
        weights: {
            price: number;      // 0-100
            quality: number;
            reliability: number;
            leadTime: number;
        };
    };
}
