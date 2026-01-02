import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IShiftRepository } from '@/domain/interfaces/repositories/IShiftRepository';
import { Shift } from '@/types';

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
    const { outletId, ...rest } = shift as any;
    const { error } = await supabase.from(this.tableName).upsert({
      ...rest,
      outlet_id: outletId,
    });
    if (error) throw error;
  }

  async deleteShift(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
  }
}
