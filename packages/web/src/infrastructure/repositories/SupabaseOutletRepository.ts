import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IOutletRepository } from '@/domain/interfaces/repositories/IOutletRepository';
import { Outlet } from '@/types';

@injectable()
export class SupabaseOutletRepository implements IOutletRepository {
  private readonly tableName = 'outlets';

  async getOutlets(): Promise<Outlet[]> {
    const { data, error } = await supabase.from(this.tableName).select('*');
    if (error) throw error;
    return data as Outlet[];
  }

  async getOutletById(id: string): Promise<Outlet | null> {
    const { data, error } = await supabase.from(this.tableName).select('*').eq('id', id).single();
    if (error) return null;
    return data as Outlet;
  }

  async saveOutlet(outlet: Outlet): Promise<void> {
    const { error } = await supabase.from(this.tableName).upsert(outlet);
    if (error) throw error;
  }

  async updateOutlet(id: string, updates: Partial<Outlet>): Promise<void> {
    const { error } = await supabase.from(this.tableName).update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteOutlet(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
  }
}
