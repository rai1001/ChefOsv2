import { injectable } from 'inversify';
import { db } from '@/config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { IIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
import { LegacyIngredient } from '@/domain/entities/Ingredient';

@injectable()
export class FirebaseIngredientRepository implements IIngredientRepository {
  private collectionName = 'ingredients';

  // Sanitize unit field - BUGFIX: some records have numbers instead of UnitType
  private sanitizeUnit(rawUnit: any): string {
    // If it's a number or invalid, default to 'un'
    if (typeof rawUnit === 'number' || !rawUnit || typeof rawUnit !== 'string') {
      console.warn(`Invalid unit type encountered: ${rawUnit}, defaulting to unitType.UNIT`);
      return 'un';
    }
    return rawUnit;
  }

  async getIngredients(outletId: string): Promise<LegacyIngredient[]> {
    // Query by outletId if provided, or logic for global ingredients
    // For now, let's assume all ingredients are accessible or filtered by validation if needed.
    // Legacy system often fetched all ingredients. Let's filter by outletId if user is restricted?
    // But for master library, usually it's "ingredients" collection directly.
    // Let's assume fetching all for now to match 'useStore' behavior essentially.

    const q =
      outletId && outletId !== 'GLOBAL'
        ? query(collection(db, this.collectionName), where('outletId', 'in', [outletId, 'GLOBAL']))
        : collection(db, this.collectionName);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return new LegacyIngredient(
        doc.id,
        data.name,
        this.sanitizeUnit(data.unit),
        data.costPerUnit,
        data.yield || 1, // field renamed to yieldVal in class but logic maps to yield in DB?
        // Wait, Firestore data has 'yield'. Entity has 'yieldVal'.
        // I should map it correctly.
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
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    return new LegacyIngredient(
      snapshot.id,
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
    // Map Class to Plain Object for Firestore
    const data = { ...ingredient };
    // Handle renaming if needed (yieldVal -> yield)
    // @ts-expect-error Intentionally ignoring property rename logic
    data.yield = ingredient.yieldVal;
    // @ts-expect-error Intentionally ignoring property deletion logic
    delete data.yieldVal;

    const sanitizedData = this.sanitizeData(data);
    await setDoc(doc(db, this.collectionName, ingredient.id), sanitizedData);
  }

  async updateIngredient(id: string, ingredient: Partial<LegacyIngredient>): Promise<void> {
    const data: any = { ...ingredient, updatedAt: new Date().toISOString() };
    if (ingredient.yieldVal !== undefined) {
      data.yield = ingredient.yieldVal;
      delete data.yieldVal;
    }

    const sanitizedData = this.sanitizeData(data);
    await updateDoc(doc(db, this.collectionName, id), sanitizedData);
  }

  private sanitizeData(data: any): any {
    return JSON.parse(
      JSON.stringify(data, (_key, value) => {
        return value === undefined ? null : value;
      })
    );
  }

  async deleteIngredient(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  async updateStock(id: string, quantityChange: number): Promise<void> {
    const docRef = doc(db, this.collectionName, id);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(docRef);
      if (!snapshot.exists()) {
        throw new Error('Ingredient not found');
      }

      const currentStock = snapshot.data().stock || 0;
      transaction.update(docRef, { stock: currentStock + quantityChange });
    });
  }

  async updateCost(id: string, newCost: number): Promise<void> {
    await updateDoc(doc(db, this.collectionName, id), {
      costPerUnit: newCost,
      updatedAt: new Date().toISOString(),
    });
  }
}
