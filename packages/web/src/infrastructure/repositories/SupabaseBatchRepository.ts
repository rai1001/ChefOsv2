import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import {
  IBatchRepository,
  Batch,
  CreateBatchDTO,
  ConsumeBatchDTO,
  Quantity,
  Unit,
  Money,
} from '@culinaryos/core';
import { RepositoryOptions } from '@culinaryos/core';

@injectable()
export class SupabaseBatchRepository implements IBatchRepository {
  async create(dto: CreateBatchDTO, options?: RepositoryOptions): Promise<Batch> {
    const row = {
      ingredient_id: dto.ingredientId,
      quantity: dto.quantity.value,
      initial_quantity: dto.quantity.value,
      unit: dto.quantity.unit.toString(),
      cost_per_unit: dto.unitCost.amount,
      expiration_date: dto.expirationDate.toISOString(),
      received_date: new Date().toISOString(),
      lot_number: dto.lotNumber,
      supplier_id: dto.supplierId,
      outlet_id:
        options?.transaction?.outletId || (await this.getOutletIdForIngredient(dto.ingredientId)),
    };

    const { data, error } = await supabase.from('batches').insert(row).select().single();

    if (error) throw error;

    return this.mapToDomain(data);
  }

  async findById(id: string): Promise<Batch | null> {
    const { data, error } = await supabase.from('batches').select('*').eq('id', id).single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.mapToDomain(data);
  }

  async findByIngredient(ingredientId: string): Promise<Batch[]> {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .gt('quantity', 0) // Only active batches usually
      .order('expiration_date', { ascending: true });

    if (error) throw error;
    return data.map((row) => this.mapToDomain(row));
  }

  async findActiveBatchesFIFO(ingredientId: string): Promise<Batch[]> {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .gt('quantity', 0)
      .order('expiration_date', { ascending: true }); // FIFO usually implies expiration or received date

    if (error) throw error;
    return data.map((row) => this.mapToDomain(row));
  }

  async findExpiringSoon(outletId: string, daysAhead: number): Promise<Batch[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('batches')
      .select('*, ingredients(name)')
      .eq('outlet_id', outletId)
      .gt('quantity', 0)
      .lte('expiration_date', futureDate.toISOString())
      .order('expiration_date', { ascending: true });

    if (error) throw error;
    return data.map((row) => this.mapToDomain(row));
  }

  async consume(dto: ConsumeBatchDTO, options?: RepositoryOptions): Promise<Batch> {
    // This logic usually requires calculating the new quantity.
    // Since we don't have atomic partial updates easily without stored procs for this specific logic
    // (unless we trust the client state), we fetch, calc, update.

    // For now, assuming optimistic locking or simple update
    // Ideally this should be part of the use case logic, but if the repo handles "consume", it implies db-side logic or smart update.

    // Simple implementation: Decrement quantity
    // RPC call would be better: decrement_batch_quantity(batch_id, amount)

    const { data, error } = await supabase.rpc('decrement_batch', {
      p_batch_id: dto.batchId,
      p_amount: dto.amount.value,
    });

    if (error) {
      // Fallback to fetch-update if RPC doesn't exist
      const batch = await this.findById(dto.batchId);
      if (!batch) throw new Error('Batch not found');

      const newQuantity = batch.quantity.value - dto.amount.value;
      const { data: updated, error: updateError } = await supabase
        .from('batches')
        .update({ quantity: newQuantity })
        .eq('id', dto.batchId)
        .select()
        .single();

      if (updateError) throw updateError;
      return this.mapToDomain(updated);
    }

    return this.mapToDomain(data);
  }

  async updateStatus(id: string, status: string, options?: RepositoryOptions): Promise<Batch> {
    // Assuming 'status' field exists or mapping it
    const { data, error } = await supabase
      .from('batches')
      .update({ status: status }) // Check schema if status exists
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToDomain(data);
  }

  async delete(id: string, options?: RepositoryOptions): Promise<void> {
    const { error } = await supabase.from('batches').delete().eq('id', id);
    if (error) throw error;
  }

  private mapToDomain(row: any): Batch {
    return {
      id: row.id,
      ingredientId: row.ingredient_id,
      quantity: new Quantity(row.quantity, new Unit(row.unit)),
      initialQuantity: new Quantity(row.initial_quantity, new Unit(row.unit)),
      unitCost: Money.fromCents((row.cost_per_unit || 0) * 100, 'EUR'),
      expirationDate: new Date(row.expiration_date),
      receivedDate: new Date(row.received_date),
      lotNumber: row.lot_number,
      supplierId: row.supplier_id,
      isActive: row.quantity > 0, // inferred
      outletId: row.outlet_id,
    };
  }

  private async getOutletIdForIngredient(ingredientId: string): Promise<string> {
    const { data } = await supabase
      .from('ingredients')
      .select('outlet_id')
      .eq('id', ingredientId)
      .single();
    return data?.outlet_id || '';
  }
}
