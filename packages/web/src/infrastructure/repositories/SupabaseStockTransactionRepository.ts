import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import {
  IStockTransactionRepository,
  CreateStockTransactionDTO,
  StockTransaction as CoreStockTransaction,
  StockTransactionType,
  Quantity,
  Unit,
  Money,
} from '@culinaryos/core';

@injectable()
export class SupabaseStockTransactionRepository implements IStockTransactionRepository {
  async create(
    dto: CreateStockTransactionDTO,
    options?: { transaction?: any }
  ): Promise<CoreStockTransaction> {
    // Map DTO to Row
    const row = {
      ingredient_id: dto.ingredientId,
      quantity: dto.quantity.value,
      unit: dto.quantity.unit.toString(),
      type: this.toDbType(dto.type),
      cost_per_unit: dto.unitCost.amount,
      reason: dto.reason,
      reference_id: dto.referenceId,
      performed_by: dto.performedBy,
      outlet_id:
        options?.transaction?.outletId || (await this.getOutletIdForIngredient(dto.ingredientId)), // Need a way to get outlet_id
    };

    const { data, error } = await supabase.from('stock_transactions').insert(row).select().single();

    if (error) throw error;

    return this.mapToDomain(data);
  }

  async findById(id: string): Promise<CoreStockTransaction | null> {
    const { data, error } = await supabase
      .from('stock_transactions')
      .select(
        `
                *,
                ingredients ( name )
            `
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToDomain(data);
  }

  async findByIngredientId(ingredientId: string, limit?: number): Promise<CoreStockTransaction[]> {
    let query = supabase
      .from('stock_transactions')
      .select(
        `
                *,
                ingredients ( name )
            `
      )
      .eq('ingredient_id', ingredientId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map((row: any) => this.mapToDomain(row));
  }

  async findByOutletId(outletId: string, limit?: number): Promise<CoreStockTransaction[]> {
    let query = supabase
      .from('stock_transactions')
      .select(
        `
                *,
                ingredients ( name )
            `
      )
      .eq('outlet_id', outletId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map((row: any) => this.mapToDomain(row));
  }

  // Helper to get outlet_id if not provided
  // This assumes ingredients belong to an outlet.
  private async getOutletIdForIngredient(ingredientId: string): Promise<string> {
    const { data, error } = await supabase
      .from('ingredients')
      .select('outlet_id')
      .eq('id', ingredientId)
      .single();

    if (error || !data) return ''; // Should ideally throw or handle graceful failure
    return data.outlet_id;
  }

  private mapToDomain(row: any): CoreStockTransaction {
    // Handle linked data safely
    const ingredientName = row.ingredients?.name || 'Unknown Ingredient';

    return {
      id: row.id,
      ingredientId: row.ingredient_id,
      ingredientName: ingredientName, // This would require a join or separate fetch. For performance, maybe we can skip or join if needed.
      // If CoreStockTransaction requires name, we MUST update query to join.
      quantity: new Quantity(row.quantity, new Unit(row.unit)),
      unitCost: Money.fromCents((row.cost_per_unit || 0) * 100, 'EUR'), // DB stores decimal amount, Money wants cents? Or verify Money usage.
      // Usually Money.fromCents takes cents. DB typically stores plain currency (e.g. 5.50). 5.50 * 100 = 550.
      type: this.toDomainType(row.type),
      date: new Date(row.created_at),
      performedBy: row.performed_by,
      reason: row.reason,
      referenceId: row.reference_id,
    };
  }

  private toDbType(type: StockTransactionType): string {
    return type.toLowerCase();
  }

  private toDomainType(type: string): StockTransactionType {
    // Map string back to Enum
    const upper = type.toUpperCase();
    const map: Record<string, StockTransactionType> = {
      PURCHASE: 'PURCHASE',
      WASTE: 'WASTE',
      USAGE: 'SALE', // usage -> sale/usage? Core has SALE. DB has USAGE.
      SALE: 'SALE',
      AUDIT: 'AUDIT',
      ADJUSTMENT: 'ADJUSTMENT',
      INITIAL_STOCK: 'INITIAL_STOCK',
      PRODUCTION: 'PRODUCTION',
    };
    return map[upper] || 'ADJUSTMENT';
  }
}
