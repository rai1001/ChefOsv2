import { Quantity } from '../value-objects/Quantity';
import { Money } from '../value-objects/Money';
import { NutritionalInfo } from '../value-objects/NutritionalInfo';

export interface SupplierOption {
  supplierId: string;
  supplierName: string;
  price: Money;
  unit: string;
  leadTimeDays: number;
  qualityRating?: number;
  isPrimary: boolean;
  isActive: boolean;
  lastOrderDate?: Date;
}

export interface Ingredient {
  id: string;
  outletId: string;
  name: string;
  category: string;
  unit: string;

  // Stock Management
  currentStock: Quantity;
  minimumStock: Quantity;
  optimalStock?: Quantity;
  reorderPoint?: Quantity;

  // Costing
  lastCost?: Money;
  averageCost?: Money;
  yieldFactor: number; // 0-1, represents usable portion (e.g. 0.9 = 90% usable)

  // Supplier Info
  preferredSupplierId?: string;
  suppliers: SupplierOption[];
  sku?: string;

  // Product Details
  allergens: string[];
  nutritionalInfo?: NutritionalInfo;

  // Physical properties (for conversions)
  density?: number; // g/ml
  pieceWeight?: number; // g per piece

  isTrackedInInventory?: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIngredientDTO {
  outletId: string;
  name: string;
  category: string;
  unit: string;
  minimumStock: Quantity;
  yieldFactor?: number;
  preferredSupplierId?: string;
  sku?: string;
  allergens?: string[];
  suppliers?: SupplierOption[];
  density?: number;
  pieceWeight?: number;
}

export interface UpdateIngredientDTO {
  name?: string;
  category?: string;
  unit?: string;
  minimumStock?: Quantity;
  optimalStock?: Quantity;
  reorderPoint?: Quantity;
  currentStock?: Quantity;
  lastCost?: Money;
  averageCost?: Money;
  yieldFactor?: number;
  preferredSupplierId?: string;
  sku?: string;
  allergens?: string[];
  suppliers?: SupplierOption[];
  nutritionalInfo?: NutritionalInfo;
  density?: number;
  pieceWeight?: number;
  isActive?: boolean;
}
