import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
import { LegacyIngredient } from '@/domain/entities/Ingredient';

@injectable()
export class SupabaseIngredientRepository implements IIngredientRepository {
  async getIngredients(outletId: string): Promise<LegacyIngredient[]> {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('outlet_id', outletId);

    if (error) {
      console.error('Supabase fetch error:', error);
      throw error;
    }

    return (data || []).map(this.mapToEntity);
  }

  async getIngredientById(id: string): Promise<LegacyIngredient | null> {
    const { data, error } = await supabase.from('ingredients').select('*').eq('id', id).single();

    if (error) return null;
    return this.mapToEntity(data);
  }

  async createIngredient(ingredient: LegacyIngredient): Promise<void> {
    const { error } = await supabase.from('ingredients').insert(this.mapToSupabase(ingredient));

    if (error) throw error;
  }

  async updateIngredient(id: string, ingredient: Partial<LegacyIngredient>): Promise<void> {
    const { error } = await supabase
      .from('ingredients')
      .update(this.mapToSupabase(ingredient as LegacyIngredient))
      .eq('id', id);

    if (error) throw error;
  }

  async deleteIngredient(id: string): Promise<void> {
    const { error } = await supabase.from('ingredients').delete().eq('id', id);

    if (error) throw error;
  }

  async updateStock(id: string, quantityChange: number): Promise<void> {
    // Use RPC for atomic increment if available, or fetch-update
    // For PoC: simple fetch-update
    const item = await this.getIngredientById(id);
    if (!item) throw new Error('Item not found');

    await this.updateIngredient(id, { stock: (item.stock || 0) + quantityChange });
  }

  async updateCost(id: string, newCost: number): Promise<void> {
    await this.updateIngredient(id, { costPerUnit: newCost });
  }

  // Mappers
  private mapToEntity(row: any): LegacyIngredient {
    // Basic mapping for PoC - Needs full field list from migration schema
    // Assuming schema matches the one in migration_report.md
    return new LegacyIngredient(
      row.id,
      row.name,
      row.unit,
      row.cost_per_unit || 0,
      1, // yield
      row.allergens || [],
      'other',
      row.current_stock || 0,
      row.min_stock || 0,
      row.nutritional_info,
      [], // batches
      undefined, // supplierId
      [], // priceHistory
      undefined, // barcode
      undefined, // shelfLife
      row.outlet_id
      // ... fill rest with defaults
    );
  }

  private mapToSupabase(entity: LegacyIngredient): any {
    return {
      id: entity.id,
      outlet_id: entity.outletId,
      name: entity.name,
      unit: entity.unit,
      cost_per_unit: entity.costPerUnit,
      current_stock: entity.stock,
      min_stock: entity.minStock,
      allergens: entity.allergens,
      nutritional_info: entity.nutritionalInfo,
    };
  }
}
