import { injectable } from 'inversify';
import { IIngredientRepository } from '@culinaryos/core/infrastructure/repositories/IIngredientRepository';
import {
  Ingredient,
  CreateIngredientDTO,
  UpdateIngredientDTO,
  SupplierOption,
} from '@culinaryos/core/domain/entities/Ingredient';
import { Quantity } from '@culinaryos/core/domain/value-objects/Quantity';
import { Unit } from '@culinaryos/core/domain/value-objects/Unit';
import { Money } from '@culinaryos/core/domain/value-objects/Money';
import { NutritionalInfo } from '@culinaryos/core/domain/value-objects/NutritionalInfo';
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

@injectable()
export class CoreIngredientRepositoryAdapter implements IIngredientRepository {
  private readonly COLLECTION_NAME = 'ingredients';

  async findByOutletId(outletId: string): Promise<Ingredient[]> {
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const { db } = await import('@/config/firebase');

    const q = query(collection(db, this.COLLECTION_NAME), where('outletId', '==', outletId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => this.mapToCore(doc));
  }

  async findById(id: string): Promise<Ingredient | null> {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/config/firebase');

    const docRef = doc(db, this.COLLECTION_NAME, id);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    return this.mapToCore(snapshot);
  }

  async create(dto: CreateIngredientDTO): Promise<Ingredient> {
    const { collection, addDoc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/config/firebase');

    // Prepare data for Firestore
    const data = {
      outletId: dto.outletId,
      name: dto.name,
      category: dto.category,
      unit: dto.unit,
      currentStock: 0, // Initial stock
      minimumStock: dto.minimumStock.value,
      yieldFactor: dto.yieldFactor ?? 1,
      preferredSupplierId: dto.preferredSupplierId ?? null,
      suppliers: dto.suppliers ? dto.suppliers.map(this.mapSupplierToFirestore) : [],
      sku: dto.sku ?? null,
      allergens: dto.allergens ?? [],
      density: dto.density ?? null,
      pieceWeight: dto.pieceWeight ?? null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, this.COLLECTION_NAME), data);
    const snapshot = await getDoc(docRef);

    return this.mapToCore(snapshot);
  }

  async update(id: string, dto: UpdateIngredientDTO): Promise<Ingredient> {
    const { doc, updateDoc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/config/firebase');

    const docRef = doc(db, this.COLLECTION_NAME, id);
    const updates: any = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.category !== undefined) updates.category = dto.category;
    if (dto.unit !== undefined) updates.unit = dto.unit;
    if (dto.minimumStock !== undefined) updates.minimumStock = dto.minimumStock.value;
    if (dto.currentStock !== undefined) updates.currentStock = dto.currentStock.value;
    if (dto.optimalStock !== undefined) updates.optimalStock = dto.optimalStock.value;
    if (dto.reorderPoint !== undefined) updates.reorderPoint = dto.reorderPoint.value;
    if (dto.lastCost !== undefined) updates.lastCost = dto.lastCost.amount;
    if (dto.averageCost !== undefined) updates.averageCost = dto.averageCost.amount;
    if (dto.yieldFactor !== undefined) updates.yieldFactor = dto.yieldFactor;
    if (dto.preferredSupplierId !== undefined)
      updates.preferredSupplierId = dto.preferredSupplierId;
    if (dto.sku !== undefined) updates.sku = dto.sku;
    if (dto.allergens !== undefined) updates.allergens = dto.allergens;
    if (dto.suppliers !== undefined)
      updates.suppliers = dto.suppliers.map(this.mapSupplierToFirestore);
    if (dto.nutritionalInfo !== undefined) updates.nutritionalInfo = dto.nutritionalInfo.values; // Storing just values for simplicity or adjust as needed
    if (dto.density !== undefined) updates.density = dto.density;
    if (dto.pieceWeight !== undefined) updates.pieceWeight = dto.pieceWeight;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;

    await updateDoc(docRef, updates);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      throw new Error(`Ingredient ${id} not found after update`);
    }

    return this.mapToCore(snapshot);
  }

  async delete(id: string): Promise<void> {
    const { doc, deleteDoc } = await import('firebase/firestore');
    const { db } = await import('@/config/firebase');
    await deleteDoc(doc(db, this.COLLECTION_NAME, id));
  }

  async findByCategory(outletId: string, category: string): Promise<Ingredient[]> {
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const { db } = await import('@/config/firebase');

    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('outletId', '==', outletId),
      where('category', '==', category)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => this.mapToCore(doc));
  }

  async findLowStock(outletId: string): Promise<Ingredient[]> {
    const all = await this.findByOutletId(outletId);
    return all.filter(
      (i) => i.currentStock.isLessThan(i.minimumStock) || i.currentStock.equals(i.minimumStock)
    );
  }

  async search(outletId: string, query: string): Promise<Ingredient[]> {
    // Basic in-memory search as Firestore doesn't support full-text natively effectively for this without external index
    const all = await this.findByOutletId(outletId);
    const lowerQuery = query.toLowerCase();
    return all.filter(
      (i) => i.name.toLowerCase().includes(lowerQuery) || i.sku?.toLowerCase().includes(lowerQuery)
    );
  }

  async updateStock(id: string, quantityChange: Quantity): Promise<void> {
    const { doc, runTransaction } = await import('firebase/firestore');
    const { db } = await import('@/config/firebase');

    const docRef = doc(db, this.COLLECTION_NAME, id);

    await runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(docRef);
      if (!sfDoc.exists()) {
        throw new Error('Ingredient does not exist!');
      }

      const data = sfDoc.data();
      // Assume value is stored as number in 'currentStock' field based on create/update methods in this file
      // create: currentStock: 0
      // update: currentStock: dto.currentStock.value
      // So data.currentStock is a number.

      const currentVal = data.currentStock || 0;
      const newVal = currentVal + quantityChange.value;

      if (newVal < 0) {
        throw new Error('Insufficient stock for atomic update');
      }

      transaction.update(docRef, {
        currentStock: newVal,
        updatedAt: new Date(),
      });
    });
  }

  private mapToCore(doc: QueryDocumentSnapshot | any): Ingredient {
    const data = doc.data() as DocumentData;
    const unit = new Unit(data.unit || 'unit');

    return {
      id: doc.id,
      outletId: data.outletId,
      name: data.name,
      category: data.category,
      unit: data.unit,
      currentStock: new Quantity(data.currentStock || 0, unit),
      minimumStock: new Quantity(data.minimumStock || 0, unit),
      optimalStock: data.optimalStock ? new Quantity(data.optimalStock, unit) : undefined,
      reorderPoint: data.reorderPoint ? new Quantity(data.reorderPoint, unit) : undefined,

      lastCost: data.lastCost !== undefined ? Money.fromCents(data.lastCost) : undefined,
      averageCost: data.averageCost !== undefined ? Money.fromCents(data.averageCost) : undefined,
      yieldFactor: data.yieldFactor || 1,

      preferredSupplierId: data.preferredSupplierId,
      suppliers: (data.suppliers || []).map(this.mapSupplierFromFirestore),
      sku: data.sku,

      allergens: data.allergens || [],
      nutritionalInfo: data.nutritionalInfo ? new NutritionalInfo(data.nutritionalInfo) : undefined,

      density: data.density,
      pieceWeight: data.pieceWeight,

      isActive: data.isActive ?? true,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }

  private mapSupplierToFirestore(supplier: SupplierOption): any {
    return {
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      price: supplier.price.amount, // Store as cents
      unit: supplier.unit,
      leadTimeDays: supplier.leadTimeDays,
      qualityRating: supplier.qualityRating,
      isPrimary: supplier.isPrimary,
      isActive: supplier.isActive,
      lastOrderDate: supplier.lastOrderDate,
    };
  }

  private mapSupplierFromFirestore(data: any): SupplierOption {
    return {
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      price: Money.fromCents(data.price || 0),
      unit: data.unit,
      leadTimeDays: data.leadTimeDays,
      qualityRating: data.qualityRating,
      isPrimary: data.isPrimary,
      isActive: data.isActive,
      lastOrderDate: data.lastOrderDate?.toDate(),
    };
  }
}
