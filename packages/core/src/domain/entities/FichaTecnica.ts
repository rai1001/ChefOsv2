import { Quantity } from '../value-objects/Quantity';
import { Money } from '../value-objects/Money';

export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: Quantity;
  unitCost?: Money;
  totalCost?: Money;
  notes?: string;
}

export interface FichaTecnica {
  id: string;
  outletId: string;
  name: string;
  description?: string;
  category: string;
  yield: Quantity;
  ingredients: RecipeIngredient[];
  instructions?: string[];
  prepTime?: number; // minutos
  cookTime?: number; // minutos
  totalCost?: Money;
  costPerPortion?: Money;
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
  yield: Quantity;
  ingredients: Omit<RecipeIngredient, 'ingredientName' | 'unitCost' | 'totalCost'>[];
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  imageUrl?: string;
}

export interface UpdateFichaTecnicaDTO {
  name?: string;
  description?: string;
  category?: string;
  yield?: Quantity;
  ingredients?: Omit<RecipeIngredient, 'ingredientName' | 'unitCost' | 'totalCost'>[];
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
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
