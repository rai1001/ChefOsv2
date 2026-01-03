import { v4 as uuidv4 } from 'uuid';
import { TIME, INVENTORY } from '../constants';
import type { Ingredient, IngredientBatch, InventoryItem, StockMovement } from '@/types';
import { firestoreService } from '@/services/firestoreService';
import { COLLECTIONS, collections } from '@/config/collections';
import { supabase } from '@/config/supabase';
import { supabasePersistenceService } from './supabasePersistenceService';

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
 * Use createDefaultBatch instead (Alias for compatibility if needed)
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
 * Deducts stock for a completed event based on its menu and PAX.
 * @param eventId - ID of the event
 * @param userId - ID of the user performing the action (for logging, future use)
 */
export const deductStockForEvent = async (eventId: string, _userId?: string): Promise<void> => {
  // 1. Fetch Event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();
  if (eventError || !event?.menuId || !event.outletId) {
    console.warn('Event not found or missing menu/outlet', eventError);
    return;
  }

  // 2. Fetch Menu
  const { data: menu, error: menuError } = await supabase
    .from('menus')
    .select('*')
    .eq('id', event.menuId)
    .single();
  if (menuError || !menu?.recipeIds || menu.recipeIds.length === 0) return;

  // 3. Fetch Recipes (Optimized with 'in' query)
  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('*')
    .in('id', menu.recipeIds);

  if (recipesError || !recipes || recipes.length === 0) return;

  // 4. Calculate Total Ingredient Needs
  const ingredientNeeds: Record<string, number> = {};

  recipes.forEach((recipe: any) => {
    const yieldPax = recipe.yieldPax || 1;
    const multiplier = event.pax / yieldPax;

    (recipe.ingredients || []).forEach((ri: any) => {
      const current = ingredientNeeds[ri.ingredientId] || 0;
      ingredientNeeds[ri.ingredientId] = current + ri.quantity * multiplier;
    });
  });

  const neededIngIds = Object.keys(ingredientNeeds).filter((id) => (ingredientNeeds[id] || 0) > 0);
  if (neededIngIds.length === 0) return;

  // 5. Fetch Inventory Items
  const { data: inventoryItems, error: invError } = await supabase
    .from('inventory')
    .select('*')
    .eq('outletId', event.outletId)
    .in('ingredientId', neededIngIds);

  if (invError || !inventoryItems) {
    console.error('Failed to fetch inventory items', invError);
    return;
  }

  // 6. Deduct Stock (Sequential updates mocking transaction)
  // TODO: Move this to a Supabase Edge Function or RPC for true atomicity
  for (const item of inventoryItems) {
    const qtyNeeded = ingredientNeeds[item.ingredientId] || 0;
    if (qtyNeeded <= 0) continue;

    const batches = item.batches || [];
    if (batches.length === 0) continue;

    const { newBatches } = consumeStockFIFO(batches, qtyNeeded);
    const newStock = calculateTotalStock(newBatches);

    await supabasePersistenceService.update(COLLECTIONS.INVENTORY, item.id, {
      batches: newBatches,
      stock: newStock,
      updatedAt: new Date().toISOString(),
    });
  }

  console.log(`Successfully deducted stock for event ${eventId}`);
};

/**
 * Records a physical count, calculates variance, and adjusts stock.
 */
export const recordPhysicalCount = async (
  inventoryItemId: string,
  realCount: number,
  userId: string,
  notes?: string
): Promise<{ variance: number }> => {
  // 1. Fetch current InventoryItem
  const item = await firestoreService.getById<InventoryItem>(
    COLLECTIONS.INVENTORY,
    inventoryItemId
  );
  if (!item) throw new Error('Inventory item not found');

  // 2. Calculate Variance
  const theoretical = item.theoreticalStock ?? item.stock;
  const variance = realCount - theoretical;

  const now = new Date().toISOString();

  // 3. Update (Sequential - effectively atomic if no contention)

  // A. Create Stock Movement
  const movement: Omit<StockMovement, 'id'> = {
    ingredientId: item.ingredientId || 'standalone',
    type: 'ADJUSTMENT',
    quantity: variance,
    costPerUnit: item.costPerUnit,
    date: now,
    referenceId: inventoryItemId,
    userId: userId,
    outletId: item.outletId,
    notes: notes || `Physical count adjustment. Variance: ${finalVarianceToString(variance)}`,
  };

  // We need a UUID generator instead of doc()
  // Since we removed Firebase `doc`, let's generate ID
  const movementId = crypto.randomUUID();

  await supabasePersistenceService.set(
    collections.stockMovements.path || 'stock_movements',
    movementId,
    {
      ...movement,
      id: movementId,
    }
  );

  // B. Update Inventory
  await supabasePersistenceService.update(COLLECTIONS.INVENTORY, inventoryItemId, {
    stock: realCount,
    theoreticalStock: realCount,
    lastPhysicalCount: realCount,
    lastCountedAt: now,
    updatedAt: now,
  });

  return { variance };
};

const finalVarianceToString = (v: number) => Math.round(v * 100) / 100;
