import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IInventoryRepository } from '@/domain/repositories/IInventoryRepository';
import { StockTransaction } from '@/domain/entities/StockTransaction';

@injectable()
export class SupabaseInventoryRepository implements IInventoryRepository {
  private readonly tableName = 'stock_transactions';
  private readonly ingredientsTable = 'ingredients';

  async addTransaction(transaction: StockTransaction): Promise<void> {
    // 1. Get current stock
    const { data: ingredient, error: fetchError } = await supabase
      .from(this.ingredientsTable)
      .select('current_stock')
      .eq('id', transaction.ingredientId)
      .single();

    if (fetchError || !ingredient) {
      throw new Error(`Ingredient ${transaction.ingredientId} does not exist or fetch failed`);
    }

    const currentStock = ingredient.current_stock || 0;
    const newStock = currentStock + transaction.quantity;

    // 2. Prepare data for Supabase (mapping camelCase to snake_case if needed)
    // Looking at Firebase rep, it used ingredientId, ingredientName, etc.
    // We should follow the schema in migration_report.md or assume direct mapping for now
    const transactionData = {
      id: transaction.id,
      ingredient_id: transaction.ingredientId,
      ingredient_name: transaction.ingredientName,
      quantity: transaction.quantity,
      unit: transaction.unit,
      type: transaction.type,
      date: transaction.date.toISOString(),
      performed_by: transaction.performedBy,
      cost_per_unit: transaction.costPerUnit,
      reason: transaction.reason || null,
      batch_id: transaction.batchId || null,
      order_id: transaction.orderId || null,
      related_entity_id: transaction.relatedEntityId || null,
    };

    // 3. Persist (We should ideally use a transaction/batch but Supabase client simplifies this)
    const { error: insertError } = await supabase.from(this.tableName).insert(transactionData);
    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from(this.ingredientsTable)
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', transaction.ingredientId);

    if (updateError) throw updateError;
  }

  async addTransactionRecord(
    transaction: StockTransaction,
    _options?: { transaction?: any }
  ): Promise<void> {
    const transactionData = {
      id: transaction.id,
      ingredient_id: transaction.ingredientId,
      ingredient_name: transaction.ingredientName,
      quantity: transaction.quantity,
      unit: transaction.unit,
      type: transaction.type,
      date: transaction.date.toISOString(),
      performed_by: transaction.performedBy,
      cost_per_unit: transaction.costPerUnit,
      reason: transaction.reason || null,
      batch_id: transaction.batchId || null,
      order_id: transaction.orderId || null,
      related_entity_id: transaction.relatedEntityId || null,
    };

    const { error } = await supabase.from(this.tableName).insert(transactionData);
    if (error) throw error;
  }

  async getTransactionsByIngredient(
    ingredientId: string,
    limitVal: number = 20
  ): Promise<StockTransaction[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('ingredient_id', ingredientId)
      .order('date', { ascending: false })
      .limit(limitVal);

    if (error) throw error;
    return (data || []).map(this.mapToEntity);
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<StockTransaction[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapToEntity);
  }

  async getCurrentStockLevel(ingredientId: string): Promise<number> {
    const { data, error } = await supabase
      .from(this.ingredientsTable)
      .select('current_stock')
      .eq('id', ingredientId)
      .single();

    if (error) return 0;
    return data?.current_stock || 0;
  }

  async getTransactionsForBatch(batchId: string): Promise<StockTransaction[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('batch_id', batchId)
      .order('date', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapToEntity);
  }

  private mapToEntity(data: any): StockTransaction {
    return new StockTransaction(
      data.id,
      data.ingredient_id,
      data.ingredient_name,
      data.quantity,
      data.unit,
      data.type,
      new Date(data.date),
      data.performed_by,
      data.cost_per_unit,
      data.reason,
      data.batch_id,
      data.order_id,
      data.related_entity_id
    );
  }
}
