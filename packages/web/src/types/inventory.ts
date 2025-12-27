// Basic Units & Categories
export type Unit = 'kg' | 'g' | 'L' | 'ml' | 'un' | 'manojo';
import type { IngredientSupplierConfig } from './suppliers';

export type InventoryCategory = 'meat' | 'fish' | 'produce' | 'dairy' | 'dry' | 'frozen' | 'canned' | 'cocktail' | 'sports_menu' | 'corporate_menu' | 'coffee_break' | 'restaurant' | 'other' | 'preparation';

export interface NutritionalInfo {
    calories: number; // kcal per 100g/ml
    protein: number; // g per 100g/ml
    carbs: number; // g per 100g/ml
    fat: number; // g per 100g/ml
}

export interface PriceHistoryEntry {
    date: string; // ISO Date
    price: number;
    supplierId?: string;
    purchaseOrderId?: string;
    changeReason?: string;
}

export interface Batch {
    id: string;
    ingredientId?: string; // Optional if standalone
    batchNumber: string; // "LOT-20231222-001"
    initialQuantity: number;
    currentQuantity: number;
    unit: Unit;
    costPerUnit: number;
    receivedAt: string; // ISO Date
    expiresAt: string; // ISO Date
    supplierId?: string;
    purchaseOrderId?: string;
    outletId: string;
    status: 'ACTIVE' | 'DEPLETED' | 'EXPIRED';
    barcode?: string;
    name?: string; // Optional name if standalone batch
}

export type IngredientBatch = Batch;

export interface IngredientSupplier {
    supplierId: string;
    costPerUnit: number;
    isDefault?: boolean;
    leadTimeDays?: number;
}

export interface Ingredient {
    id: string;
    name: string;
    unit: Unit;
    costPerUnit: number; // Price per unit (e.g., /kg)
    yield: number; // Merma (0-1), e.g., 0.9 means 10% loss
    allergens: string[];
    nutritionalInfo?: NutritionalInfo;
    stock?: number; // Calculated total (cached/legacy)
    batches?: Batch[]; // Batches list (legacy)
    minStock?: number; // Safety stock level (legacy)
    supplierId?: string;
    priceHistory?: PriceHistoryEntry[];
    defaultBarcode?: string;
    category?: InventoryCategory;
    shelfLife?: number; // Days
    outletId?: string;
    createdAt?: string;
    updatedAt?: string;

    // Automatic Purchasing Fields
    optimalStock?: number;
    reorderPoint?: number;
    supplierInfo?: IngredientSupplier[];
    autoSupplierConfig?: IngredientSupplierConfig;

    // Inventory Tracking
    isTrackedInInventory?: boolean;

    // Conversion Factors
    conversionFactors?: Record<string, number>; // e.g. { "caja": 15, "bolsa": 5 } -> multiplier to base unit
    density?: number; // g/ml - For Volume <-> Mass conversions
    avgUnitWeight?: number; // g/ud - For Unit <-> Mass conversions
    wastageFactor?: number; // 0-1 (e.g., 0.2 for 20% waste) - For purchasing calculations
}

export interface InventoryItem {
    id: string;
    ingredientId?: string; // Optional link to master ingredient
    outletId: string;
    name: string; // Required for standalone
    unit: Unit; // Required for standalone
    category: InventoryCategory; // Required for standalone
    costPerUnit: number; // Snapshot/standalone cost
    barcode?: string; // Standalone barcode
    stock: number; // This is the "Real" or current active stock
    theoreticalStock: number; // Calculated stock since last count
    minStock: number;
    optimalStock: number;
    batches: Batch[];
    lastCountedAt?: string;
    lastPhysicalCount?: number;
    updatedAt: string;
}

// Stock Movements
export type StockMovementType = 'PURCHASE_RECEIVE' | 'PRODUCTION' | 'WASTE' | 'ADJUSTMENT' | 'INITIAL' | 'TRANSFER_IN' | 'TRANSFER_OUT';

export interface StockMovement {
    id: string;
    ingredientId: string;
    type: StockMovementType;
    quantity: number; // Positive for add, negative for remove
    costPerUnit: number; // Snapshot of cost at time of movement
    date: string; // ISO Date

    referenceId?: string; // ID of PO, WasteRecord, Recipe (Production), etc.
    batchId?: string; // Specific batch affected
    userId: string; // User who performed/authorized action
    outletId?: string;
    notes?: string;
}


export type WasteReason = 'CADUCIDAD' | 'ELABORACION' | 'DETERIORO' | 'EXCESO_PRODUCCION' | 'OTROS';

export interface WasteRecord {
    id: string;
    date: string; // ISO Date
    ingredientId: string;
    quantity: number;
    unit: Unit; // Inherited from Ingredient
    costAtTime: number; // Snapshot of costPerUnit when waste happened
    reason: WasteReason;
    notes?: string;
}

