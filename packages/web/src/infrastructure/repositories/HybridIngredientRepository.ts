import { injectable, inject } from 'inversify';
import { IIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
import { LegacyIngredient } from '@/domain/entities/Ingredient';
import { TYPES } from '@/application/di/types';

// Feature Flag (Can be moved to store or env)
const USE_SUPABASE_READ = import.meta.env.VITE_USE_SUPABASE_READ === 'true';
const USE_DUAL_WRITE = true; // Always write to both for syncing

@injectable()
export class HybridIngredientRepository implements IIngredientRepository {
  constructor(
    @inject(TYPES.FirebaseIngredientRepository) private firebaseRepo: IIngredientRepository,
    @inject(TYPES.SupabaseIngredientRepository) private supabaseRepo: IIngredientRepository
  ) {}

  async getIngredients(outletId: string): Promise<LegacyIngredient[]> {
    if (USE_SUPABASE_READ) {
      try {
        return await this.supabaseRepo.getIngredients(outletId);
      } catch (e) {
        console.error('Supabase Fallback:', e);
        return await this.firebaseRepo.getIngredients(outletId);
      }
    }
    return await this.firebaseRepo.getIngredients(outletId);
  }

  async getIngredientById(id: string): Promise<LegacyIngredient | null> {
    if (USE_SUPABASE_READ) {
      return await this.supabaseRepo.getIngredientById(id);
    }
    return await this.firebaseRepo.getIngredientById(id);
  }

  async createIngredient(ingredient: LegacyIngredient): Promise<void> {
    await this.firebaseRepo.createIngredient(ingredient);
    if (USE_DUAL_WRITE) {
      this.supabaseRepo
        .createIngredient(ingredient)
        .catch((err) => console.error('Dual write failed', err));
    }
  }

  async updateIngredient(id: string, ingredient: Partial<LegacyIngredient>): Promise<void> {
    await this.firebaseRepo.updateIngredient(id, ingredient);
    if (USE_DUAL_WRITE) {
      this.supabaseRepo
        .updateIngredient(id, ingredient)
        .catch((err) => console.error('Dual write failed', err));
    }
  }

  async deleteIngredient(id: string): Promise<void> {
    await this.firebaseRepo.deleteIngredient(id);
    if (USE_DUAL_WRITE) {
      this.supabaseRepo
        .deleteIngredient(id)
        .catch((err) => console.error('Dual write failed', err));
    }
  }

  async updateStock(id: string, quantityChange: number): Promise<void> {
    await this.firebaseRepo.updateStock(id, quantityChange);
    if (USE_DUAL_WRITE) {
      this.supabaseRepo
        .updateStock(id, quantityChange)
        .catch((err) => console.error('Dual write failed', err));
    }
  }

  async updateCost(id: string, newCost: number): Promise<void> {
    await this.firebaseRepo.updateCost(id, newCost);
    if (USE_DUAL_WRITE) {
      this.supabaseRepo
        .updateCost(id, newCost)
        .catch((err) => console.error('Dual write failed', err));
    }
  }
}
