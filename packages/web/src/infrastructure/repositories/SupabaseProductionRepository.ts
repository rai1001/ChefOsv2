import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { ProductionTask, Quantity } from '@culinaryos/core';
import { IProductionRepository } from './FirebaseProductionRepository';

@injectable()
export class SupabaseProductionRepository implements IProductionRepository {
  async getTasksByEvent(_eventId: string): Promise<ProductionTask[]> {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*')
      // .eq('event_id', eventId) // Schema doesn't support eventId yet
      .limit(50);

    if (error) throw error;
    return (data || []).map(this.mapToDomain);
  }

  async createTask(task: ProductionTask): Promise<void> {
    const { error } = await supabase.from('production_tasks').insert(this.mapToRow(task));

    if (error) throw error;
  }

  async updateTask(id: string, task: Partial<ProductionTask>): Promise<void> {
    const { error } = await supabase
      .from('production_tasks')
      .update(this.mapToRowPartial(task))
      .eq('id', id);

    if (error) throw error;
  }

  private mapToDomain(row: any): ProductionTask {
    // Core ProductionTask requires station, priority, fichaName etc.
    return {
      id: row.id,
      outletId: row.outlet_id,
      eventId: undefined, // Unavailable in DB
      fichaId: row.recipe_id, // Mapped
      fichaName: 'Unknown', // Join or fetch needed
      quantity: new Quantity(row.quantity_planned, row.unit || 'unit'),
      station: row.station || 'prep',
      priority: row.priority || 'medium',
      status: row.status as any,
      assignedTo: row.assigned_to,
      scheduledFor: row.due_date ? new Date(row.due_date) : new Date(),
      estimatedDuration: 0,
      actualDuration: 0,
      startedAt: undefined,
      completedAt: undefined,
      notes: row.notes,
      createdBy: 'system',
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    } as unknown as ProductionTask;
  }

  private mapToRow(task: ProductionTask): any {
    return {
      id: task.id,
      outlet_id: task.outletId,
      recipe_id: task.fichaId,
      status: task.status,
      quantity_planned: task.quantity.value,
      quantity_actual: 0, // Not in Core type but in DB
      unit: task.quantity.unit.toString(),
      assigned_to: task.assignedTo,
      due_date: task.scheduledFor.toISOString(),
      notes: task.notes,
      // event_id: task.eventId // Not in schema
    };
  }

  private mapToRowPartial(task: Partial<ProductionTask>): any {
    const row: any = {};
    if (task.status) row.status = task.status;
    row.updated_at = new Date().toISOString();
    return row;
  }
}
