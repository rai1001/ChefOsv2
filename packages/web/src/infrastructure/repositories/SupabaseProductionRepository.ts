import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import {
  ProductionTask,
  Quantity,
  IProductionTaskRepository,
  CreateProductionTaskDTO,
  UpdateProductionTaskDTO,
  ProductionTaskStatus,
  ProductionStation,
  RepositoryOptions,
} from '@culinaryos/core';

@injectable()
export class SupabaseProductionRepository implements IProductionTaskRepository {
  async create(dto: CreateProductionTaskDTO, options?: RepositoryOptions): Promise<ProductionTask> {
    // Stub implementation - Schema mapping might be needed
    const row = {
      outlet_id: dto.outletId,
      recipe_id: dto.fichaId,
      quantity_planned: dto.quantity.value,
      unit: dto.quantity.unit.toString(),
      due_date: dto.scheduledFor.toISOString(),
      notes: dto.notes,
      priority: dto.priority,
      assigned_to: dto.assignedTo,
      status: 'pending',
    };

    const { data, error } = await supabase.from('production_tasks').insert(row).select().single();
    if (error) throw error;
    return this.mapToDomain(data);
  }

  async findById(id: string): Promise<ProductionTask | null> {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return this.mapToDomain(data);
  }

  async findByEvent(eventId: string): Promise<ProductionTask[]> {
    // Schema doesn't support event_id yet, returning empty or filtering if added later
    const { data, error } = await supabase.from('production_tasks').select('*').limit(50); // Temporary stub
    if (error) throw error;
    return (data || []).map(this.mapToDomain);
  }

  async findByOutlet(outletId: string): Promise<ProductionTask[]> {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*')
      .eq('outlet_id', outletId);
    if (error) throw error;
    return (data || []).map(this.mapToDomain);
  }

  async findByStation(outletId: string, station: ProductionStation): Promise<ProductionTask[]> {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('station', station);
    if (error) throw error;
    return (data || []).map(this.mapToDomain);
  }

  async findByStatus(outletId: string, status: ProductionTaskStatus): Promise<ProductionTask[]> {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('status', status);
    if (error) throw error;
    return (data || []).map(this.mapToDomain);
  }

  async findByDateRange(
    outletId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProductionTask[]> {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('due_date', startDate.toISOString())
      .lte('due_date', endDate.toISOString());
    if (error) throw error;
    return (data || []).map(this.mapToDomain);
  }

  async update(
    id: string,
    dto: UpdateProductionTaskDTO,
    options?: RepositoryOptions
  ): Promise<ProductionTask> {
    const updates: any = {};
    if (dto.status) updates.status = dto.status;

    if (dto.assignedTo) updates.assigned_to = dto.assignedTo;
    if (dto.actualDuration) updates.actual_duration = dto.actualDuration;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('production_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.mapToDomain(data);
  }

  async updateStatus(
    id: string,
    status: ProductionTaskStatus,
    options?: RepositoryOptions
  ): Promise<ProductionTask> {
    const { data, error } = await supabase
      .from('production_tasks')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.mapToDomain(data);
  }

  async delete(id: string, options?: RepositoryOptions): Promise<void> {
    const { error } = await supabase.from('production_tasks').delete().eq('id', id);
    if (error) throw error;
  }

  // Legacy method compat
  async getTasksByEvent(eventId: string): Promise<ProductionTask[]> {
    return this.findByEvent(eventId);
  }

  async createTask(task: ProductionTask): Promise<void> {
    // Basic stub mapping to create
    // await this.create(...) // Skipping full map for now, just void return to satisfy any legacy calls if removed interface
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
