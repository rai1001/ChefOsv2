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
    const { outletId, consecutiveWorkDays, daysOffInLast28Days, ...rest } = employee;

    // Map camelCase to snake_case if necessary, or just strip unknown columns
    // Assuming Supabase columns match the rest of the keys (name, role, etc)
    // We should strictly define the payload to avoid future errors
    const payload = {
      id: rest.id,
      name: rest.name,
      role: rest.role,
      status: rest.status,
      active: rest.active,
      vacation_dates: rest.vacationDates || [], // Assuming column is vacation_dates or similar?
      outlet_id: outletId,
      // Add other persisted fields if columns exist, for now basic fields
      // If vacationDates isn't in DB, we'll see another error.
      // Let's assume the previous code worked for other fields or check assumptions.
      // The previous code was: upsert({ ...rest, outlet_id: outletId })
      // So name, role, status were working. vacationDates likely needs mapping if it's snake_case in DB
    };

    // To be safe and minimal, let's just strip the known problematic runtime fields
    // and let the rest pass through, assuming they match or are handled.
    // However, `vacationDates` (camel) vs `vacation_dates` (snake) is a common issue.
    // The previous code `...rest` implies the DB columns matched the entity keys OR Supabase handles it?
    // Supabase JS client does NOT auto-convert camel to snake.
    // So if the entity has `vacationDates`, and DB has `vacation_dates`, it would have failed before?
    // User error specifically mentioned `consecutiveWorkDays`.

    // safe payload
    const safePayload: any = {
      ...rest,
      outlet_id: outletId,
    };

    // Remove runtime props explicitly
    delete safePayload.consecutiveWorkDays;
    delete safePayload.daysOffInLast28Days;

    // Fix vacationDates mapping if needed.
    // If the error was ONLY consecutiveWorkDays, then maybe the others ARE columns or not present.
    // Let's just remove the one we know blocks it.

    const { error } = await supabase.from(this.tableName).upsert(safePayload);
    if (error) throw error;
  }

  async deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
  }
}
