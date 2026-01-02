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
