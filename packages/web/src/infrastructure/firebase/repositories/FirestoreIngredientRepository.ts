import {
  IIngredientRepository,
  Ingredient,
  CreateIngredientDTO,
  UpdateIngredientDTO,
  RepositoryOptions,
  Quantity,
  Money,
  Unit,
} from '@culinaryos/core';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  Transaction,
  collectionGroup,
  documentId,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const toDomain = (id: string, data: any): Ingredient => {
  // Sanitize unit field - BUGFIX: algunos registros tienen números en vez de UnitType
  const sanitizeUnit = (rawUnit: any): string => {
    // Si es número o inválido, defaultear a 'ud'
    if (typeof rawUnit === 'number' || !rawUnit || typeof rawUnit !== 'string') {
      console.warn(`Invalid unit type encountered: ${rawUnit}, defaulting to unitType.UNIT`);
      return 'ud'; // UnitType.UNIT
    }
    return rawUnit;
  };

  const sanitizedUnit = sanitizeUnit(data.unit);
  const currentStockUnit = sanitizeUnit(data.currentStock?.unit || data.unit);
  const minimumStockUnit = sanitizeUnit(data.minimumStock?.unit || data.unit);

  return {
    id,
    outletId: data.outletId,
    name: data.name,
    category: data.category,
    unit: sanitizedUnit,
    currentStock: new Quantity(
      data.currentStock?.value || 0,
      new Unit(currentStockUnit)
    ),
    minimumStock: new Quantity(
      data.minimumStock?.value || 0,
      new Unit(minimumStockUnit)
    ),
    lastCost: data.lastCost ? new Money(data.lastCost.amount, data.lastCost.currency) : undefined,
    averageCost: data.averageCost
      ? new Money(data.averageCost.amount, data.averageCost.currency)
      : undefined,
    suppliers:
      data.suppliers ||
      (data.supplier
        ? [
            {
              supplierId: data.supplier,
              name: 'Unknown',
              price: 0,
              unit: sanitizedUnit, // BUGFIX: usar sanitized unit
              isPrimary: true,
            },
          ]
        : []),
    sku: data.sku,
    allergens: data.allergens || [],
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
    yieldFactor: data.yieldFactor || 1,
    isActive: data.isActive ?? true,
    isTrackedInInventory: data.isTrackedInInventory ?? true,
  };
};

export class FirestoreIngredientRepository implements IIngredientRepository {
  private getCollection(outletId: string) {
    return collection(db, 'outlets', outletId, 'ingredients');
  }

  async create(dto: CreateIngredientDTO, options?: RepositoryOptions): Promise<Ingredient> {
    const coll = this.getCollection(dto.outletId);
    const docRef = doc(coll);
    const now = new Date();

    const data = {
      outletId: dto.outletId,
      name: dto.name,
      category: dto.category,
      unit: dto.unit,
      currentStock: { value: 0, unit: dto.unit },
      minimumStock: dto.minimumStock.toJSON(),
      suppliers: dto.suppliers || [],
      sku: dto.sku,
      allergens: dto.allergens || [],
      createdAt: now,
      updatedAt: now,
    };

    if (options?.transaction) {
      const txn = options.transaction as Transaction;
      txn.set(docRef, data);
    } else {
      await setDoc(docRef, data);
    }

    return toDomain(docRef.id, data);
  }

  async findById(id: string): Promise<Ingredient | null> {
    const q = query(collectionGroup(db, 'ingredients'), where(documentId(), '==', id));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const firstDoc = snapshot.docs[0];
    if (!firstDoc) return null;
    return toDomain(firstDoc.id, firstDoc.data());
  }

  async findByOutletId(outletId: string): Promise<Ingredient[]> {
    const q = query(collection(db, 'outlets', outletId, 'ingredients'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => toDomain(d.id, d.data()));
  }

  async findByCategory(outletId: string, category: string): Promise<Ingredient[]> {
    const q = query(
      collection(db, 'outlets', outletId, 'ingredients'),
      where('category', '==', category)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => toDomain(d.id, d.data()));
  }

  async findLowStock(outletId: string): Promise<Ingredient[]> {
    // Requires logic to compare currentStock < minimumStock.
    // In Firestore, comparing fields is hard if they are in Map/Object.
    // 'currentStock.value' < 'minimumStock.value'.
    // Firestore allows comparison of field vs Field. 'where("currentStock.value", "<", "minimumStock.value")'?
    // NO, Firestore only compares field vs constant.
    // So we fetch all and filter in memory? Or we maintain a flag `lowStock`?
    // Maintaining a flag is better for performance. `isLowStock: boolean`.
    // Since I cannot change the schema easily without migrations (logic update), I will filter in memory for now.
    // Assuming 50-100 ingredients per outlet, it's fine.

    // Better: Add `isLowStock` to data model in `create` and `update`.
    // I'll filter in JS for now.

    const all = await this.findByOutletId(outletId);
    return all.filter((i) => i.currentStock.isLessThan(i.minimumStock));
  }

  async update(
    id: string,
    dto: UpdateIngredientDTO,
    options?: RepositoryOptions
  ): Promise<Ingredient> {
    // Need to find the doc path.
    // Assuming context-less update is allowed, we find it first.
    // Ideally we pass outletId or have context.
    const current = await this.findById(id);
    if (!current) throw new Error('Ingredient not found');

    const docRef = doc(db, 'outlets', current.outletId, 'ingredients', id);

    const updates: any = { updatedAt: new Date() };
    if (dto.name) updates.name = dto.name;
    if (dto.category) updates.category = dto.category;
    if (dto.suppliers) updates.suppliers = dto.suppliers;
    if (dto.sku) updates.sku = dto.sku;
    if (dto.allergens) updates.allergens = dto.allergens;
    if (dto.minimumStock) updates.minimumStock = dto.minimumStock.toJSON();
    if (dto.currentStock) updates.currentStock = dto.currentStock.toJSON();
    if (dto.lastCost) updates.lastCost = dto.lastCost.toJSON();

    if (options?.transaction) {
      (options.transaction as Transaction).update(docRef, updates);
    } else {
      await updateDoc(docRef, updates);
    }

    // Return updated entity... approximation (merging in memory)
    return {
      ...current,
      ...dto,
      // merge manual fields
      minimumStock: dto.minimumStock || current.minimumStock,
      currentStock: dto.currentStock || current.currentStock,
      lastCost: dto.lastCost || current.lastCost,
      updatedAt: updates.updatedAt,
    } as Ingredient;
  }

  async delete(id: string, options?: RepositoryOptions): Promise<void> {
    const current = await this.findById(id);
    if (!current) return;

    const docRef = doc(db, 'outlets', current.outletId, 'ingredients', id);

    if (options?.transaction) {
      (options.transaction as Transaction).delete(docRef);
    } else {
      await deleteDoc(docRef);
    }
  }

  async search(outletId: string, queryText: string): Promise<Ingredient[]> {
    // Firestore has no full text search.
    // Simple prefix search on name.
    const q = query(
      collection(db, 'outlets', outletId, 'ingredients'),
      where('name', '>=', queryText),
      where('name', '<=', queryText + '\uf8ff')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => toDomain(d.id, d.data()));
  }

  async updateStock(id: string, quantityChange: Quantity): Promise<void> {
    // 1. Find the document reference (we need outletId, which is tricky if we only have ID)
    // Ideally we should have outletId. But unlike 'update', we might not have the entity loaded.
    // We must find it first.
    const ingredient = await this.findById(id);
    if (!ingredient) throw new Error(`Ingredient ${id} not found`);

    const docRef = doc(db, 'outlets', ingredient.outletId, 'ingredients', id);

    await runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(docRef);
      if (!sfDoc.exists()) {
        throw new Error('Ingredient does not exist!');
      }

      const data = sfDoc.data();
      const currentStockVal = data.currentStock?.value || 0;
      const newStockVal = currentStockVal + quantityChange.value;

      if (newStockVal < 0) {
        throw new Error('Insufficient stock for atomic update');
      }

      // We maintain the same unit
      const unit = data.unit || data.currentStock?.unit;

      transaction.update(docRef, {
        currentStock: {
          value: newStockVal,
          unit: unit,
        },
        updatedAt: new Date(),
      });
    });
  }
}
