import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IEventRepository } from '@/domain/interfaces/repositories/IEventRepository';
import { Event } from '@/domain/entities/Event';

@injectable()
export class SupabaseEventRepository implements IEventRepository {
  private readonly tableName = 'events';

  async getEvents(filters: {
    dateStart?: string;
    dateEnd?: string;
    outletId?: string;
  }): Promise<Event[]> {
    let query = supabase.from(this.tableName).select('*');

    if (filters.outletId) query = query.eq('outlet_id', filters.outletId);
    if (filters.dateStart) query = query.gte('date', filters.dateStart);
    if (filters.dateEnd) query = query.lte('date', filters.dateEnd);

    const { data, error } = await query;
    if (error) throw error;

    // Map to legacy frontend structure (outlet_id -> outletId) if needed
    return (data || []).map((row) => ({
      ...row,
      outletId: row.outlet_id,
      menuId: (row as any).menu_id,
    })) as Event[];
  }

  async saveEvent(event: Event): Promise<void> {
    const { outletId, menuId, ...rest } = event;
    const { error } = await supabase.from(this.tableName).upsert({
      ...rest,
      id: event.id,
      outlet_id: outletId,
      menu_id: menuId,
    });
    if (error) throw error;
  }

  async saveEvents(events: Event[]): Promise<void> {
    const data = events.map((e) => {
      const { outletId, menuId, ...rest } = e;
      return {
        ...rest,
        id: e.id,
        outlet_id: outletId,
        menu_id: menuId,
      };
    });
    const { error } = await supabase.from(this.tableName).upsert(data);
    if (error) throw error;
  }

  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', eventId);
    if (error) throw error;
  }
}
