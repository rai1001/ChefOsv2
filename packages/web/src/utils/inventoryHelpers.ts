import { v4 as uuidv4 } from 'uuid';
import { TIME, INVENTORY } from '../constants';
import type { Ingredient, IngredientBatch } from '@/types';

/**
 * Inventory Helper Functions
 * Pure functions for FIFO stock management, batch creation, and calculations
 *
 * These are pure utilities with no side effects, extracted from inventoryService
 * for better testability and reusability.
 */

/**
 * Consume stock using FIFO (First In, First Out) method based on expiry dates
 * @param batches - Current ingredient batches
 * @param quantity - Quantity to consume
 * @returns Object containing updated batches and total consumed amount
 */
export const consumeStockFIFO = (
  batches: IngredientBatch[],
  quantity: number
): { newBatches: IngredientBatch[]; consumed: number } => {
  let remainingQtyToConsume = quantity;
  let totalConsumed = 0;

  // Sort batches by expiry date ASC (FIFO - consume oldest first)
  const sortedBatches = [...batches].sort(
    (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
  );

  const newBatches: IngredientBatch[] = [];

  for (const batch of sortedBatches) {
    if (remainingQtyToConsume <= 0) {
      // No more to consume, keep remaining batches
      newBatches.push(batch);
      continue;
    }

    if (batch.currentQuantity > remainingQtyToConsume) {
      // Partial consumption of this batch
      const consumedFromBatch = remainingQtyToConsume;
      newBatches.push({
        ...batch,
        currentQuantity: batch.currentQuantity - consumedFromBatch,
      });
      totalConsumed += consumedFromBatch;
      remainingQtyToConsume = 0;
    } else {
      // Fully consume this batch (don't push to newBatches)
      const consumedFromBatch = batch.currentQuantity;
      totalConsumed += consumedFromBatch;
      remainingQtyToConsume -= consumedFromBatch;
    }
  }

  return { newBatches, consumed: totalConsumed };
};

/**
 * Create a default batch from legacy stock data (migration helper)
 * @param ingredient - Ingredient with legacy stock
 * @returns New ingredient batch
 */
export const createDefaultBatch = (ingredient: Ingredient): IngredientBatch => {
  return {
    id: uuidv4(),
    ingredientId: ingredient.id,
    initialQuantity: ingredient.stock || 0,
    currentQuantity: ingredient.stock || 0,
    unit: ingredient.unit,
    batchNumber: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    expiresAt: new Date(Date.now() + INVENTORY.DEFAULT_EXPIRY_DAYS * TIME.MS_PER_DAY).toISOString(),
    receivedAt: new Date().toISOString(),
    costPerUnit: ingredient.costPerUnit || 0,
    outletId: ingredient.outletId || 'unknown',
    status: 'ACTIVE',
  };
};

/**
 * Create a migration batch (alias for compatibility)
 * @deprecated Use createDefaultBatch instead
 */
export const createMigrationBatch = (
  ingredientId: string,
  currentStock: number,
  costPerUnit: number,
  outletId: string
): IngredientBatch => {
  return {
    id: crypto.randomUUID(),
    ingredientId,
    initialQuantity: currentStock,
    currentQuantity: currentStock,
    unit: 'un',
    batchNumber: `LOT-MIG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    receivedAt: new Date().toISOString(),
    costPerUnit: costPerUnit,
    outletId: outletId,
    status: 'ACTIVE',
  };
};

/**
 * Initialize batches for an ingredient if they don't exist (migration)
 * @param ingredient - Ingredient to initialize
 * @returns Ingredient with initialized batches
 */
export const initializeBatches = (ingredient: Ingredient): Ingredient => {
  if (ingredient.batches && ingredient.batches.length > 0) {
    return ingredient;
  }

  // Create default batch from current stock
  const batches = ingredient.stock && ingredient.stock > 0 ? [createDefaultBatch(ingredient)] : [];

  return {
    ...ingredient,
    batches,
    stock: batches.reduce((sum, b) => sum + b.currentQuantity, 0),
  };
};

/**
 * Calculate total stock from batches
 * @param batches - Ingredient batches
 * @returns Total stock quantity
 */
export const calculateTotalStock = (batches: IngredientBatch[]): number => {
  return batches.reduce((sum, batch) => sum + batch.currentQuantity, 0);
};

/**
 * Get batches expiring within specified days
 * @param batches - Ingredient batches
 * @param days - Number of days to check
 * @returns Batches expiring within the specified period
 */
export const getBatchesExpiringSoon = (
  batches: IngredientBatch[],
  days: number = INVENTORY.EXPIRING_SOON_DAYS
): IngredientBatch[] => {
  const cutoffDate = new Date(Date.now() + days * TIME.MS_PER_DAY);

  return batches
    .filter((batch) => new Date(batch.expiresAt) <= cutoffDate)
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
};

/**
 * Get batches that are already expired
 * @param batches - Ingredient batches
 * @returns Expired batches
 */
export const getExpiredBatches = (batches: IngredientBatch[]): IngredientBatch[] => {
  const now = new Date();
  return batches
    .filter((batch) => new Date(batch.expiresAt) < now)
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
};

/**
 * Calculate value of inventory batches
 * @param batches - Ingredient batches
 * @returns Total value (sum of quantity * cost per unit)
 */
export const calculateBatchesValue = (batches: IngredientBatch[]): number => {
  return batches.reduce((sum, batch) => {
    return sum + (batch.currentQuantity * batch.costPerUnit);
  }, 0);
};

/**
 * Sort batches by expiry date (FIFO order)
 * @param batches - Ingredient batches
 * @returns Sorted batches (oldest first)
 */
export const sortBatchesFIFO = (batches: IngredientBatch[]): IngredientBatch[] => {
  return [...batches].sort(
    (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
  );
};
