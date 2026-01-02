import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { ISupplierRepository } from '@/domain/interfaces/repositories/ISupplierRepository';
import { Supplier } from '@/domain/entities/Supplier';

@injectable()
export class SupabaseSupplierRepository implements ISupplierRepository {
  async getSuppliers(outletId: string): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('outlet_id', outletId)
      .order('name');

    if (error) throw error;
    return data.map(this.mapToDomain);
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToDomain(data);
  }

  async createSupplier(supplier: Supplier): Promise<void> {
    const { error } = await supabase.from('suppliers').insert(this.mapToRow(supplier));

    if (error) throw error;
  }

  async updateSupplier(id: string, supplier: Partial<Supplier>): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .update(this.mapToRow(supplier, true))
      .eq('id', id);

    if (error) throw error;
  }

  async deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);

    if (error) throw error;
  }

  async searchSuppliers(queryStr: string, outletId: string): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('outlet_id', outletId)
      .ilike('name', `%${queryStr}%`);

    if (error) throw error;
    return data.map(this.mapToDomain);
  }

  /**
   * Finds supplier by exact name (case-insensitive) or creates a new one
   */
  async findOrCreateSupplier(name: string, outletId: string): Promise<string> {
    const normalizedName = name.trim();

    // Try to find existing supplier (case-insensitive)
    const { data: existing, error: searchError } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('outlet_id', outletId)
      .ilike('name', normalizedName)
      .limit(1)
      .single();

    if (existing && !searchError) {
      return existing.id;
    }

    // Create new supplier
    const newSupplier = new Supplier(
      crypto.randomUUID(),
      outletId,
      normalizedName,
      undefined, // contactPerson
      undefined, // email
      undefined, // phone
      undefined, // address
      undefined, // paymentTerms
      0, // leadTimeDays
      undefined, // rating
      true, // isActive
      new Date()
    );

    const { data: inserted, error: insertError } = await supabase
      .from('suppliers')
      .insert(this.mapToRow(newSupplier))
      .select('id')
      .single();

    if (insertError) throw insertError;

    return inserted.id;
  }

  private mapToDomain(row: any): Supplier {
    return new Supplier(
      row.id,
      row.outlet_id,
      row.name,
      row.contact_person,
      row.email,
      row.phone,
      row.address,
      row.payment_terms,
      row.lead_time_days,
      row.rating,
      row.is_active,
      new Date(row.created_at),
      row.updated_at ? new Date(row.updated_at) : undefined
    );
  }

  private mapToRow(supplier: Partial<Supplier>, isUpdate = false): any {
    const data: any = {};
    if (supplier.name !== undefined) data.name = supplier.name;
    if (supplier.outletId !== undefined) data.outlet_id = supplier.outletId;
    if (supplier.contactPerson !== undefined) data.contact_person = supplier.contactPerson;
    if (supplier.email !== undefined) data.email = supplier.email;
    if (supplier.phone !== undefined) data.phone = supplier.phone;
    if (supplier.address !== undefined) data.address = supplier.address;
    if (supplier.paymentTerms !== undefined) data.payment_terms = supplier.paymentTerms;
    if (supplier.leadTimeDays !== undefined) data.lead_time_days = supplier.leadTimeDays;
    if (supplier.rating !== undefined) data.rating = supplier.rating;
    if (supplier.isActive !== undefined) data.is_active = supplier.isActive;
    if (!isUpdate && supplier.id) data.id = supplier.id; // Only set ID on insert

    return data;
  }
}
