import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IShiftRepository } from '@/domain/interfaces/repositories/IShiftRepository';
import { Shift } from '@/domain/entities/Shift';

@injectable()
export class SupabaseShiftRepository implements IShiftRepository {
  private readonly tableName = 'shifts';

  async getShifts(filters: {
    dateStart: string;
    dateEnd: string;
    outletId: string;
  }): Promise<Shift[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('outlet_id', filters.outletId)
      .gte('start_time', filters.dateStart)
      .lte('start_time', filters.dateEnd);

    if (error) throw error;
    return (data || []).map((row) => ({
      ...row,
      outletId: row.outlet_id,
    })) as unknown as Shift[];
  }

  async saveShift(shift: Shift): Promise<void> {
    const { outletId, ...rest } = shift;
    const { error } = await supabase.from(this.tableName).upsert({
      ...rest,
      outlet_id: outletId,
    });
    if (error) throw error;
  }

  async saveShifts(shifts: Shift[]): Promise<void> {
    const data = shifts.map((s) => {
      const { outletId, ...rest } = s;
      return {
        ...rest,
        outlet_id: outletId,
      };
    });
    const { error } = await supabase.from(this.tableName).upsert(data);
    if (error) throw error;
  }

  async deleteShift(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
  }

  async deleteShiftsByDate(date: string, outletId?: string): Promise<void> {
    let query = supabase.from(this.tableName).delete().eq('date', date);
    if (outletId) query = query.eq('outlet_id', outletId);

    const { error } = await query;
    if (error) throw error;
  }
}
