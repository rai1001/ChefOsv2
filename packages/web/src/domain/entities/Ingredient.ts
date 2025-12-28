import { Unit, InventoryCategory, NutritionalInfo } from '@/types';

export interface PriceHistoryEntry {
  date: string;
  price: number;
  supplierId?: string;
  purchaseOrderId?: string;
  changeReason?: string;
}

export interface LegacyBatch {
  id: string;
  ingredientId?: string;
  batchNumber: string;
  initialQuantity: number;
  currentQuantity: number;
  unit: Unit;
  costPerUnit: number;
  receivedAt: string;
  expiresAt: string;
  supplierId?: string;
  purchaseOrderId?: string;
  outletId: string;
  status: 'ACTIVE' | 'DEPLETED' | 'EXPIRED';
  barcode?: string;
  name?: string;
}

export interface IngredientSupplier {
  supplierId: string;
  costPerUnit: number;
  isDefault?: boolean;
  leadTimeDays?: number;
}

// Complex Supplier Config Types (from suppliers.ts)
export interface SupplierOption {
  supplierId: string;
  supplierName: string;
  price: number;
  unit: string;
  leadTimeDays: number;
  qualityRating: number;
  reliabilityScore: number;
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
      price: number;
      quality: number;
      reliability: number;
      leadTime: number;
    };
  };
}

export class LegacyIngredient {
  constructor(
    public id: string,
    public name: string,
    public unit: Unit,
    public costPerUnit: number,
    public yieldVal: number,
    public allergens: string[],
    public category: InventoryCategory = 'other',

    // Optional Fields
    public stock: number = 0,
    public minStock: number = 0,
    public nutritionalInfo?: NutritionalInfo,
    public batches: LegacyBatch[] = [],
    public supplierId?: string,
    public priceHistory: PriceHistoryEntry[] = [],
    public defaultBarcode?: string,
    public shelfLife?: number,
    public outletId?: string,

    // Advanced Features
    public optimalStock?: number,
    public reorderPoint?: number,
    public supplierInfo: IngredientSupplier[] = [],
    public autoSupplierConfig?: IngredientSupplierConfig,
    public isTrackedInInventory: boolean = true,
    public conversionFactors?: Record<string, number>,
    public density?: number,
    public avgUnitWeight?: number,
    public wastageFactor?: number,

    public createdAt?: string,
    public updatedAt?: string
  ) {}

  // Example Business Logic Method
  get isActive(): boolean {
    return this.stock > 0;
  }

  get totalValue(): number {
    return this.stock * this.costPerUnit;
  }
}

import type { Ingredient as CoreIngredient } from '@culinaryos/core';

/**
 * @deprecated Use LegacyIngredient or CoreIngredient instead.
 */
export type Ingredient = CoreIngredient;
// eslint-disable-next-line no-redeclare
export const Ingredient = LegacyIngredient; // Keep value as Class for instantiation if needed (but types mismatch now?)

export { CoreIngredient };
