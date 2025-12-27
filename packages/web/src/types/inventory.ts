// Basic Units & Categories
export type Unit = 'kg' | 'g' | 'L' | 'ml' | 'un' | 'manojo';
import type { IngredientSupplierConfig } from './suppliers';

export type InventoryCategory =
  | 'meat'
  | 'fish'
  | 'produce'
  | 'dairy'
  | 'dry'
  | 'frozen'
  | 'canned'
  | 'cocktail'
  | 'sports_menu'
  | 'corporate_menu'
  | 'coffee_break'
  | 'restaurant'
  | 'other'
  | 'preparation';

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
  unit: string;
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

import {
  Quantity,
  Money,
  NutritionalInfo as CoreNutritionalInfo,
  SupplierOption,
} from '@culinaryos/core';

export interface Ingredient {
  id: string;
  name: string;
  // Core Fields
  currentStock: Quantity;
  minimumStock: Quantity;
  optimalStock?: Quantity;
  lastCost?: Money;
  averageCost?: Money;
  unit: string;

  // Legacy support / Web specific
  yieldFactor: number; // Replaces yield
  allergens: string[];
  nutritionalInfo?: CoreNutritionalInfo;

  // Relationships
  supplierId?: string; // Legacy Primary
  preferredSupplierId?: string; // Core Primary
  suppliers: SupplierOption[];

  category: InventoryCategory | string;
  sku?: string;
  isActive: boolean;
  reorderPoint?: Quantity;

  createdAt?: Date;
  updatedAt?: Date;

  // Legacy fields kept for compatibility during strict migration (optional)
  stock?: number;
  minStock?: number;
  costPerUnit?: number;
  yield?: number;

  // Extended Web fields
  batches?: Batch[];
  priceHistory?: PriceHistoryEntry[];
  defaultBarcode?: string;
  shelfLife?: number;
  outletId: string;

  autoSupplierConfig?: IngredientSupplierConfig;
  supplierInfo?: IngredientSupplier[];

  isTrackedInInventory?: boolean;
  conversionFactors?: Record<string, number>;
  density?: number;
  avgUnitWeight?: number;
  pieceWeight?: number;
  wastageFactor?: number;
}

export interface InventoryItem {
  id: string;
  ingredientId?: string; // Optional link to master ingredient
  outletId: string;
  name: string; // Required for standalone
  unit: string; // Required for standalone
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
export type StockMovementType =
  | 'PURCHASE_RECEIVE'
  | 'PRODUCTION'
  | 'WASTE'
  | 'ADJUSTMENT'
  | 'INITIAL'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

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
  unit: string;
  costAtTime: number; // Snapshot of costPerUnit when waste happened
  reason: WasteReason;
  notes?: string;
}

export interface CreateIngredientRequest {
  name: string;
  category: string;
  unit: Unit;
  minStock: number;
  stock?: number;
  costPerUnit?: number;
  yieldFactor?: number;
  shelfLife?: number;
  allergens?: string[];
  supplierId?: string;
  outletId: string;
  sku?: string;
  isActive?: boolean;
  pieceWeight?: number;
}

export interface UpdateIngredientRequest {
  name?: string;
  category?: string;
  unit?: Unit;
  minStock?: number;
  stock?: number;
  costPerUnit?: number;
  yieldFactor?: number;
  shelfLife?: number;
  allergens?: string[];
  supplierId?: string;
  sku?: string;
  isActive?: boolean;
  pieceWeight?: number;
}
