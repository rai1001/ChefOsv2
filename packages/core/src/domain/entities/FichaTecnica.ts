import { Quantity } from '../value-objects/Quantity';
import { Money } from '../value-objects/Money';

export interface RecipeIngredient {
  ingredientId: string;
  type: 'raw' | 'recipe';
  ingredientName: string;
  quantity: Quantity;
  unitCost?: Money;
  totalCost?: Money;
  wastePercentage?: number;
  notes?: string;
}

export interface FichaTecnica {
  id: string;
  outletId: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  yield: Quantity;
  ingredients: RecipeIngredient[];
  instructions?: string[];
  prepTime?: number; // minutos
  cookTime?: number; // minutos

  // Costes adicionales
  laborCost?: Money;
  packagingCost?: Money;

  // Precios y objetivos
  sellingPrice?: Money;
  targetCostPercent?: number;

  // Calculados
  totalCost?: Money;
  costPerPortion?: Money;
  actualCostPercent?: number;
  grossMargin?: Money;

  version: number;
  isActive: boolean;
  imageUrl?: string;
  allergens?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFichaTecnicaDTO {
  outletId: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  yield: Quantity;
  ingredients: Omit<RecipeIngredient, 'ingredientName' | 'unitCost' | 'totalCost'>[];
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  laborCost?: Money;
  packagingCost?: Money;
  sellingPrice?: Money;
  targetCostPercent?: number;
  imageUrl?: string;
}

export interface UpdateFichaTecnicaDTO {
  name?: string;
  description?: string;
  category?: string;
  subCategory?: string;
  yield?: Quantity;
  ingredients?: Omit<RecipeIngredient, 'ingredientName' | 'unitCost' | 'totalCost'>[];
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  laborCost?: Money;
  packagingCost?: Money;
  sellingPrice?: Money;
  targetCostPercent?: number;
  imageUrl?: string;
}

/**
 * Snapshot de una versión de ficha técnica (inmutable)
 */
export interface FichaTecnicaVersion {
  id: string;
  fichaId: string;
  versionNumber: number;
  snapshot: FichaTecnica;
  createdBy: string;
  createdAt: Date;
  reason?: string;
}
