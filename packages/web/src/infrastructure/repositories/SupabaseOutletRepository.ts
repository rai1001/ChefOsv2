import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IOutletRepository } from '@/domain/interfaces/repositories/IOutletRepository';
import { Outlet } from '@/types';

@injectable()
export class SupabaseOutletRepository implements IOutletRepository {
  private readonly tableName = 'outlets';

  async getOutlets(): Promise<Outlet[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('id, name, type, is_active, address');

    if (error) throw error;

    // Map snake_case DB columns to camelCase domain objects
    return (data || []).map(this.mapToDomain);
  }

  async getOutletById(id: string): Promise<Outlet | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('id, name, type, is_active, address')
      .eq('id', id)
      .single();

    if (error) return null;
    return this.mapToDomain(data);
  }

  async saveOutlet(outlet: Outlet): Promise<void> {
    const row = this.mapToRow(outlet);
    const { error } = await supabase.from(this.tableName).upsert(row);
    if (error) throw error;
  }

  async updateOutlet(id: string, updates: Partial<Outlet>): Promise<void> {
    const rowUpdates = this.mapToRowPartial(updates);
    const { error } = await supabase.from(this.tableName).update(rowUpdates).eq('id', id);
    if (error) throw error;
  }

  async deleteOutlet(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
  }

  private mapToDomain(row: any): Outlet {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      isActive: row.is_active,
      address: row.address,
      phone: undefined,
      autoPurchaseSettings: undefined,
      geminiApiKey: undefined,
      workspaceAccount: undefined,
      outlookAccount: undefined,
    };
  }

  private mapToRow(outlet: Outlet): any {
    return {
      id: outlet.id,
      name: outlet.name,
      type: outlet.type,
      is_active: outlet.isActive,
      address: outlet.address,
    };
  }

  private mapToRowPartial(outlet: Partial<Outlet>): any {
    const row: any = {};
    if (outlet.name !== undefined) row.name = outlet.name;
    if (outlet.type !== undefined) row.type = outlet.type;
    if (outlet.isActive !== undefined) row.is_active = outlet.isActive;
    if (outlet.address !== undefined) row.address = outlet.address;
    return row;
  }
}
