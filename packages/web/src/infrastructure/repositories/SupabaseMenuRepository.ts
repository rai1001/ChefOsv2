import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IMenuRepository } from '@/domain/interfaces/repositories/IMenuRepository';
import { Menu, MenuStatus, MenuSection, MenuItem } from '@/domain/entities/Menu';

@injectable()
export class SupabaseMenuRepository implements IMenuRepository {
  private readonly TABLE_NAME = 'menus';

  async create(menu: Menu): Promise<void> {
    const { error } = await supabase.from(this.TABLE_NAME).insert(this.mapToRow(menu));
    if (error) throw error;
  }

  async findById(id: string): Promise<Menu | null> {
    const { data, error } = await supabase.from(this.TABLE_NAME).select('*').eq('id', id).single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToDomain(data);
  }

  async update(id: string, menu: Partial<Menu>): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .update(this.mapToRowPartial(menu))
      .eq('id', id);

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.TABLE_NAME).delete().eq('id', id);
    if (error) throw error;
  }

  async findByOutlet(outletId: string): Promise<Menu[]> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('outlet_id', outletId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => this.mapToDomain(row));
  }

  async findByStatus(outletId: string, status: MenuStatus): Promise<Menu[]> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('outlet_id', outletId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => this.mapToDomain(row));
  }

  async findActive(outletId: string): Promise<Menu[]> {
    return this.findByStatus(outletId, 'active');
  }

  private mapToDomain(row: any): Menu {
    return new Menu(
      row.id,
      row.name,
      row.type,
      row.status,
      row.outlet_id,
      row.sections || [], // Assumes JSONB storage for sections
      row.start_date ? new Date(row.start_date) : undefined,
      row.end_date ? new Date(row.end_date) : undefined,
      row.description,
      new Date(row.created_at),
      new Date(row.updated_at)
    );
  }

  private mapToRow(menu: Menu): any {
    return {
      id: menu.id,
      name: menu.name,
      type: menu.type,
      status: menu.status,
      outlet_id: menu.outletId,
      sections: menu.sections, // JSONB
      start_date: menu.startDate ? menu.startDate.toISOString() : null,
      end_date: menu.endDate ? menu.endDate.toISOString() : null,
      description: menu.description,
      created_at: menu.createdAt.toISOString(),
      updated_at: menu.updatedAt.toISOString(),
    };
  }

  private mapToRowPartial(menu: Partial<Menu>): any {
    const row: any = {};
    if (menu.name !== undefined) row.name = menu.name;
    if (menu.type !== undefined) row.type = menu.type;
    if (menu.status !== undefined) row.status = menu.status;
    if (menu.sections !== undefined) row.sections = menu.sections;
    if (menu.startDate !== undefined) row.start_date = menu.startDate.toISOString();
    if (menu.endDate !== undefined) row.end_date = menu.endDate.toISOString();
    if (menu.description !== undefined) row.description = menu.description;

    row.updated_at = new Date().toISOString();
    return row;
  }
}
