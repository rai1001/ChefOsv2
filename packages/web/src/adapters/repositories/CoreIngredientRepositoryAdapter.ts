import { injectable } from 'inversify';
import {
  IIngredientRepository,
  Ingredient,
  CreateIngredientDTO,
  UpdateIngredientDTO,
  SupplierOption,
  Quantity,
  Unit,
  Money,
  NutritionalInfo,
} from '@culinaryos/core';
import { supabasePersistenceService } from '@/services/supabasePersistenceService';

@injectable()
export class CoreIngredientRepositoryAdapter implements IIngredientRepository {
  private readonly COLLECTION_NAME = 'ingredients';

  async findByOutletId(outletId: string): Promise<Ingredient[]> {
    const docs = await supabasePersistenceService.query<any>(this.COLLECTION_NAME, (q) =>
      q.eq('outletId', outletId)
    );
    return docs.map((doc) => this.mapToCore(doc));
  }

  async findById(id: string): Promise<Ingredient | null> {
    const doc = await supabasePersistenceService.getById<any>(this.COLLECTION_NAME, id);
    if (!doc) return null;
    return this.mapToCore(doc);
  }

  async create(dto: CreateIngredientDTO): Promise<Ingredient> {
    // Prepare data
    const data = {
      outletId: dto.outletId,
      name: dto.name,
      category: dto.category,
      unit: dto.unit,
      currentStock: 0,
      minimumStock: dto.minimumStock.value,
      yieldFactor: dto.yieldFactor ?? 1,
      preferredSupplierId: dto.preferredSupplierId ?? null,
      suppliers: dto.suppliers ? dto.suppliers.map(this.mapSupplierToFirestore) : [],
      sku: dto.sku ?? null,
      allergens: dto.allergens ?? [],
      density: dto.density ?? null,
      pieceWeight: dto.pieceWeight ?? null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const id = await supabasePersistenceService.create(this.COLLECTION_NAME, data);
    return this.findById(id) as Promise<Ingredient>;
  }

  async update(id: string, dto: UpdateIngredientDTO): Promise<Ingredient> {
    const updates: any = {
      updatedAt: new Date().toISOString(),
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
    if (dto.nutritionalInfo !== undefined) updates.nutritionalInfo = dto.nutritionalInfo.values;
    if (dto.density !== undefined) updates.density = dto.density;
    if (dto.pieceWeight !== undefined) updates.pieceWeight = dto.pieceWeight;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;

    await supabasePersistenceService.update(this.COLLECTION_NAME, id, updates);

    // Fetch and return updated
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Ingredient ${id} not found after update`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await supabasePersistenceService.delete(this.COLLECTION_NAME, id);
  }

  async findByCategory(outletId: string, category: string): Promise<Ingredient[]> {
    const docs = await supabasePersistenceService.query<any>(this.COLLECTION_NAME, (q) =>
      q.eq('outletId', outletId).eq('category', category)
    );
    return docs.map((doc) => this.mapToCore(doc));
  }

  async findLowStock(outletId: string): Promise<Ingredient[]> {
    const all = await this.findByOutletId(outletId);
    return all.filter(
      (i) => i.currentStock.isLessThan(i.minimumStock) || i.currentStock.equals(i.minimumStock)
    );
  }

  async search(outletId: string, query: string): Promise<Ingredient[]> {
    const all = await this.findByOutletId(outletId);
    const lowerQuery = query.toLowerCase();
    return all.filter(
      (i) => i.name.toLowerCase().includes(lowerQuery) || i.sku?.toLowerCase().includes(lowerQuery)
    );
  }

  async updateStock(id: string, quantityChange: Quantity): Promise<void> {
    // Supabase RPC or read-modify-write.
    // RMW is risky but acceptable for now if RPC not set up.
    // Ideally use an RPC call.
    // supabase.rpc('increment_stock', { row_id: id, quantity: value })
    // For now, simpler fetch-update.
    const item = await this.findById(id);
    if (!item) throw new Error('Ingredient does not exist!');

    const newVal = item.currentStock.value + quantityChange.value;
    if (newVal < 0) throw new Error('Insufficient stock');

    await supabasePersistenceService.update(this.COLLECTION_NAME, id, {
      currentStock: newVal,
      updatedAt: new Date().toISOString(),
    });
  }

  private mapToCore(data: any): Ingredient {
    const unit = new Unit(data.unit || 'unit');

    return {
      id: data.id,
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
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
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
      lastOrderDate: supplier.lastOrderDate ? supplier.lastOrderDate.toISOString() : null,
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
      lastOrderDate: data.lastOrderDate ? new Date(data.lastOrderDate) : undefined,
    };
  }
}
