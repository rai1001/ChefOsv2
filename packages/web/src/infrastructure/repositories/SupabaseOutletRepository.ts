import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IOutletRepository } from '@/domain/interfaces/repositories/IOutletRepository';
import { Outlet } from '@/types';

@injectable()
export class SupabaseOutletRepository implements IOutletRepository {
  private readonly tableName = 'outlets';

  async getOutlets(): Promise<Outlet[]> {
    // Explicitly select columns to avoid schema cache issues (e.g., missing codeTime)
    const { data, error } = await supabase
      .from(this.tableName)
      .select(
        'id, name, type, is_active, address, phone, auto_purchase_settings, gemini_api_key, workspace_account, outlook_account'
      );

    if (error) throw error;

    // Map snake_case DB columns to camelCase domain objects
    return (data || []).map(this.mapToDomain);
  }

  async getOutletById(id: string): Promise<Outlet | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(
        'id, name, type, is_active, address, phone, auto_purchase_settings, gemini_api_key, workspace_account, outlook_account'
      )
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
      phone: row.phone,
      autoPurchaseSettings: row.auto_purchase_settings || undefined,
      geminiApiKey: row.gemini_api_key || undefined,
      workspaceAccount: row.workspace_account || undefined,
      outlookAccount: row.outlook_account || undefined,
    };
  }

  private mapToRow(outlet: Outlet): any {
    return {
      id: outlet.id,
      name: outlet.name,
      type: outlet.type,
      is_active: outlet.isActive,
      address: outlet.address,
      phone: outlet.phone,
      auto_purchase_settings: outlet.autoPurchaseSettings,
      gemini_api_key: outlet.geminiApiKey,
      workspace_account: outlet.workspaceAccount,
      outlook_account: outlet.outlookAccount,
    };
  }

  private mapToRowPartial(outlet: Partial<Outlet>): any {
    const row: any = {};
    if (outlet.name !== undefined) row.name = outlet.name;
    if (outlet.type !== undefined) row.type = outlet.type;
    if (outlet.isActive !== undefined) row.is_active = outlet.isActive;
    if (outlet.address !== undefined) row.address = outlet.address;
    if (outlet.phone !== undefined) row.phone = outlet.phone;
    if (outlet.autoPurchaseSettings !== undefined)
      row.auto_purchase_settings = outlet.autoPurchaseSettings;
    if (outlet.geminiApiKey !== undefined) row.gemini_api_key = outlet.geminiApiKey;
    if (outlet.workspaceAccount !== undefined) row.workspace_account = outlet.workspaceAccount;
    if (outlet.outlookAccount !== undefined) row.outlook_account = outlet.outlookAccount;
    return row;
  }
}
