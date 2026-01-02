import { injectable } from 'inversify';
import {
  getCollection,
  getDocumentById,
  setDocument,
  updateDocument,
  deleteDocument,
} from '@/services/firestoreService';
import { IIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
import { LegacyIngredient } from '@/domain/entities/Ingredient';
import type { Unit } from '@/types';

@injectable()
export class FirebaseIngredientRepository implements IIngredientRepository {
  private collectionName = 'ingredients';

  // Sanitize unit field - BUGFIX: some records have numbers instead of UnitType
  private sanitizeUnit(rawUnit: any): Unit {
    // If it's a number or invalid, default to 'un'
    if (typeof rawUnit === 'number' || !rawUnit || typeof rawUnit !== 'string') {
      console.warn(`Invalid unit type encountered: ${rawUnit}, defaulting to unitType.UNIT`);
      return 'un' as Unit;
    }
    return rawUnit as Unit;
  }

  async getIngredients(outletId: string): Promise<LegacyIngredient[]> {
    const recipes = await getCollection<any>(this.collectionName);

    let filtered = recipes;
    if (outletId && outletId !== 'GLOBAL') {
      filtered = recipes.filter((r) => r.outletId === outletId || r.outletId === 'GLOBAL');
    }

    return filtered.map((data) => {
      return new LegacyIngredient(
        data.id,
        data.name,
        this.sanitizeUnit(data.unit),
        data.costPerUnit,
        data.yield || 1,
        data.allergens || [],
        data.category || 'other',
        data.stock || 0,
        data.minStock || 0,
        data.nutritionalInfo,
        data.batches || [],
        data.supplierId,
        data.priceHistory || [],
        data.defaultBarcode,
        data.shelfLife,
        data.outletId,
        data.optimalStock,
        data.reorderPoint,
        data.supplierInfo || [],
        data.autoSupplierConfig,
        data.isTrackedInInventory ?? true,
        data.conversionFactors,
        data.density,
        data.avgUnitWeight,
        data.wastageFactor,
        data.createdAt,
        data.updatedAt
      );
    });
  }

  async getIngredientById(id: string): Promise<LegacyIngredient | null> {
    const data = await getDocumentById<any>(this.collectionName, id);
    if (!data) return null;

    return new LegacyIngredient(
      id,
      data.name,
      this.sanitizeUnit(data.unit),
      data.costPerUnit,
      data.yield || 1,
      data.allergens || [],
      data.category || 'other',
      data.stock || 0,
      data.minStock || 0,
      data.nutritionalInfo,
      data.batches || [],
      data.supplierId,
      data.priceHistory || [],
      data.defaultBarcode,
      data.shelfLife,
      data.outletId,
      data.optimalStock,
      data.reorderPoint,
      data.supplierInfo || [],
      data.autoSupplierConfig,
      data.isTrackedInInventory ?? true,
      data.conversionFactors,
      data.density,
      data.avgUnitWeight,
      data.wastageFactor,
      data.createdAt,
      data.updatedAt
    );
  }

  async createIngredient(ingredient: LegacyIngredient): Promise<void> {
    const data = { ...ingredient };
    // @ts-expect-error Intentionally ignoring property rename logic
    data.yield = ingredient.yieldVal;
    // @ts-expect-error Intentionally ignoring property deletion logic
    delete data.yieldVal;

    await setDocument(this.collectionName, ingredient.id, data as any);
  }

  async updateIngredient(id: string, ingredient: Partial<LegacyIngredient>): Promise<void> {
    const data: any = { ...ingredient, updatedAt: new Date().toISOString() };
    if (ingredient.yieldVal !== undefined) {
      data.yield = ingredient.yieldVal;
      delete data.yieldVal;
    }

    await updateDocument(this.collectionName, id, data as any);
  }

  async deleteIngredient(id: string): Promise<void> {
    await deleteDocument(this.collectionName, id);
  }

  async updateStock(id: string, quantityChange: number): Promise<void> {
    const ingredient = await getDocumentById<any>(this.collectionName, id);
    if (!ingredient) throw new Error('Ingredient not found');

    await updateDocument(this.collectionName, id, {
      stock: (ingredient.stock || 0) + quantityChange,
      updatedAt: new Date().toISOString(),
    } as any);
  }

  async updateCost(id: string, newCost: number): Promise<void> {
    await updateDocument(this.collectionName, id, {
      costPerUnit: newCost,
      updatedAt: new Date().toISOString(),
    } as any);
  }
}
