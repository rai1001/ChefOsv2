import { injectable, inject } from 'inversify';
import { IIngredientRepository } from '@culinaryos/core/domain/interfaces/repositories/IIngredientRepository';
import {
  Ingredient,
  CreateIngredientDTO,
  UpdateIngredientDTO,
} from '@culinaryos/core/domain/entities/Ingredient';
import { IIngredientRepository as ILegacyIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
import { LegacyIngredient } from '@/domain/entities/Ingredient';
import { toCore } from '@/adapters/IngredientAdapter';
import { TYPES } from '@/application/di/types';

@injectable()
export class CoreIngredientRepositoryAdapter implements IIngredientRepository {
  constructor(
    @inject(TYPES.IngredientRepository) private legacyRepo: ILegacyIngredientRepository
  ) {}

  async findByOutletId(outletId: string): Promise<Ingredient[]> {
    const legacyIngredients = await this.legacyRepo.getIngredients(outletId);
    return legacyIngredients.map(toCore);
  }

  async findById(id: string): Promise<Ingredient | null> {
    const legacy = await this.legacyRepo.getIngredientById(id);
    return legacy ? toCore(legacy) : null;
  }

  async create(dto: CreateIngredientDTO): Promise<Ingredient> {
    const { doc, collection } = await import('firebase/firestore');
    const { db } = await import('@/config/firebase');
    const newDocRef = doc(collection(db, 'ingredients'));
    const newId = newDocRef.id;

    const legacyIngredient = new LegacyIngredient(
      newId,
      dto.name,
      dto.unit as any,
      0, // Default cost
      1, // Default yield
      dto.allergens || [],
      dto.category as any,
      0, // Initial stock
      dto.minimumStock.value,
      undefined, // nutritionalInfo
      [], // batches
      dto.supplier,
      [], // priceHistory
      dto.sku,
      undefined, // shelfLife
      dto.outletId
    );

    await this.legacyRepo.createIngredient(legacyIngredient);
    return toCore(legacyIngredient);
  }

  async findByCategory(outletId: string, category: string): Promise<Ingredient[]> {
    const all = await this.findByOutletId(outletId);
    return all.filter((i) => i.category === category);
  }

  async findLowStock(outletId: string): Promise<Ingredient[]> {
    const all = await this.findByOutletId(outletId);
    return all.filter((i) => i.currentStock.value <= i.minimumStock.value);
  }

  async update(id: string, dto: UpdateIngredientDTO): Promise<Ingredient> {
    const partial: Partial<LegacyIngredient> = {};

    if (dto.name !== undefined) partial.name = dto.name;
    if (dto.category !== undefined) partial.category = dto.category as any;
    if (dto.minimumStock !== undefined) partial.minStock = dto.minimumStock.value;
    if (dto.supplier !== undefined) partial.supplierId = dto.supplier;
    if (dto.sku !== undefined) partial.defaultBarcode = dto.sku;
    if (dto.allergens !== undefined) partial.allergens = dto.allergens;
    if (dto.currentStock !== undefined) partial.stock = dto.currentStock.value;
    if (dto.lastCost !== undefined) partial.costPerUnit = dto.lastCost.amount;

    await this.legacyRepo.updateIngredient(id, partial);
    const updated = await this.legacyRepo.getIngredientById(id);
    if (!updated) throw new Error(`Updated ingredient ${id} not found`);
    return toCore(updated);
  }

  async delete(id: string): Promise<void> {
    return this.legacyRepo.deleteIngredient(id);
  }

  async search(outletId: string, query: string): Promise<Ingredient[]> {
    const all = await this.findByOutletId(outletId);
    const lowerQuery = query.toLowerCase();
    return all.filter((i) => i.name.toLowerCase().includes(lowerQuery));
  }
}
