import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IEmployeeRepository } from '@/domain/interfaces/repositories/IEmployeeRepository';
import { Employee } from '@/types';

@injectable()
export class SupabaseEmployeeRepository implements IEmployeeRepository {
  private readonly tableName = 'employees';

  async getEmployees(outletId: string): Promise<Employee[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('outlet_id', outletId);

    if (error) throw error;
    return (data || []).map((row) => ({
      ...row,
      outletId: row.outlet_id,
    })) as unknown as Employee[];
  }

  async saveEmployee(employee: Employee): Promise<void> {
    const { outletId, ...rest } = employee as any;
    const { error } = await supabase.from(this.tableName).upsert({
      ...rest,
      outlet_id: outletId,
    });
    if (error) throw error;
  }

  async deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
  }
}
