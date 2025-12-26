import { Quantity } from '../value-objects/Quantity';
import { Money } from '../value-objects/Money';

export interface Ingredient {
  id: string;
  outletId: string;
  name: string;
  category: string;
  unit: string;
  currentStock: Quantity;
  minimumStock: Quantity;
  lastCost?: Money;
  averageCost?: Money;
  supplier?: string;
  sku?: string;
  allergens?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIngredientDTO {
  outletId: string;
  name: string;
  category: string;
  unit: string;
  minimumStock: Quantity;
  supplier?: string;
  sku?: string;
  allergens?: string[];
}

export interface UpdateIngredientDTO {
  name?: string;
  category?: string;
  minimumStock?: Quantity;
  supplier?: string;
  sku?: string;
  allergens?: string[];
  currentStock?: Quantity;
  lastCost?: Money;
  averageCost?: Money;
}
