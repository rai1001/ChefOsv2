import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IEmployeeRepository } from '@/domain/interfaces/repositories/IEmployeeRepository';
import { Employee } from '@/domain/entities/Employee';

@injectable()
export class SupabaseEmployeeRepository implements IEmployeeRepository {
  private readonly tableName = 'employees';

  async getEmployees(outletId?: string): Promise<Employee[]> {
    let query = supabase.from(this.tableName).select('*');
    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }
    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row) => ({
      ...row,
      outletId: row.outlet_id,
    })) as unknown as Employee[];
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    const { data, error } = await supabase.from(this.tableName).select('*').eq('id', id).single();

    if (error || !data) return null;
    return {
      ...data,
      outletId: data.outlet_id,
    } as unknown as Employee;
  }

  async saveEmployee(employee: Employee): Promise<void> {
    const { outletId, ...rest } = employee;
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
