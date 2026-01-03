import { injectable } from 'inversify';
import {
  IProductionTaskRepository,
  ProductionTask,
  CreateProductionTaskDTO,
  UpdateProductionTaskDTO,
  ProductionTaskStatus,
  ProductionStation,
  RepositoryOptions,
  Quantity,
  Unit,
} from '@culinaryos/core';
// import { db } from '@/config/firebase';
import { LoggingService } from '../services/LoggingService';
import { supabasePersistenceService } from '@/services/supabasePersistenceService';

@injectable()
export class CoreProductionRepositoryAdapter implements IProductionTaskRepository {
  private collectionName = 'productionTasks';

  private mapEntity(data: any): ProductionTask {
    return {
      ...data,
      quantity: new Quantity(
        data.quantity?.value || 0,
        typeof data.quantity?.unit === 'string'
          ? Unit.from(data.quantity.unit)
          : (data.quantity?.unit as Unit) || Unit.from('kg') // Default
      ),
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : new Date(),
      startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    } as ProductionTask;
  }

  async create(
    dto: CreateProductionTaskDTO,
    _options?: RepositoryOptions
  ): Promise<ProductionTask> {
    const id = crypto.randomUUID();
    const now = new Date();
    const FichaNamePlaceholder = 'Unknown Recipe';

    const task: any = {
      id,
      outletId: dto.outletId,
      eventId: dto.eventId,
      fichaId: dto.fichaId,
      fichaName: FichaNamePlaceholder,
      quantity: { value: dto.quantity.value, unit: dto.quantity.unit.toString() },
      station: dto.station,
      priority: dto.priority || ('medium' as any),
      status: ProductionTaskStatus.PENDING,
      assignedTo: dto.assignedTo,
      scheduledFor: dto.scheduledFor?.toISOString(),
      estimatedDuration: dto.estimatedDuration,
      notes: dto.notes,
      createdBy: 'system',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    try {
      await supabasePersistenceService.create(this.collectionName, task);
      return this.mapEntity(task);
    } catch (error) {
      LoggingService.error(`Failed to create production task: ${id}`, { error, task });
      throw error;
    }
  }

  async findById(id: string): Promise<ProductionTask | null> {
    const data = await supabasePersistenceService.getById<any>(this.collectionName, id);
    if (!data) return null;
    return this.mapEntity(data);
  }

  async findByEvent(eventId: string): Promise<ProductionTask[]> {
    return supabasePersistenceService
      .query<ProductionTask>(this.collectionName, (query) => query.eq('eventId', eventId))
      .then((docs) => docs.map((d: any) => this.mapEntity(d)));
  }

  async findByOutlet(outletId: string): Promise<ProductionTask[]> {
    return supabasePersistenceService
      .query<ProductionTask>(this.collectionName, (query) => query.eq('outletId', outletId))
      .then((docs) => docs.map((d: any) => this.mapEntity(d)));
  }

  async findByStation(outletId: string, station: ProductionStation): Promise<ProductionTask[]> {
    return supabasePersistenceService
      .query<ProductionTask>(this.collectionName, (query) =>
        query.eq('outletId', outletId).eq('station', station)
      )
      .then((docs) => docs.map((d: any) => this.mapEntity(d)));
  }

  async findByStatus(outletId: string, status: ProductionTaskStatus): Promise<ProductionTask[]> {
    return supabasePersistenceService
      .query<ProductionTask>(this.collectionName, (query) =>
        query.eq('outletId', outletId).eq('status', status)
      )
      .then((docs) => docs.map((d: any) => this.mapEntity(d)));
  }

  async findByDateRange(
    outletId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProductionTask[]> {
    return supabasePersistenceService
      .query<ProductionTask>(this.collectionName, (query) =>
        query
          .eq('outletId', outletId)
          .gte('scheduledFor', startDate.toISOString())
          .lte('scheduledFor', endDate.toISOString())
      )
      .then((docs) => docs.map((d: any) => this.mapEntity(d)));
  }

  async update(
    id: string,
    dto: UpdateProductionTaskDTO,
    _options?: RepositoryOptions
  ): Promise<ProductionTask> {
    const updates: any = { ...dto, updatedAt: new Date().toISOString() };
    if (dto.scheduledFor) updates.scheduledFor = dto.scheduledFor.toISOString();
    if (dto.startedAt) updates.startedAt = dto.startedAt.toISOString();
    if (dto.completedAt) updates.completedAt = dto.completedAt.toISOString();

    await supabasePersistenceService.update(this.collectionName, id, updates);
    const updated = await this.findById(id);
    if (!updated) throw new Error('Task not found after update');
    return updated;
  }

  async updateStatus(
    id: string,
    status: ProductionTaskStatus,
    _options?: RepositoryOptions
  ): Promise<ProductionTask> {
    const updates: any = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === ProductionTaskStatus.IN_PROGRESS) {
      updates.startedAt = new Date().toISOString();
    } else if (status === ProductionTaskStatus.COMPLETED) {
      updates.completedAt = new Date().toISOString();
      const current = await this.findById(id);
      if (current?.startedAt) {
        const start = current.startedAt;
        const end = new Date();
        updates.actualDuration = Math.round((end.getTime() - start.getTime()) / 60000);
      }
    }

    await supabasePersistenceService.update(this.collectionName, id, updates);
    const updated = await this.findById(id);
    if (!updated) throw new Error('Task not found after update');
    return updated;
  }

  async delete(id: string, _options?: RepositoryOptions): Promise<void> {
    await supabasePersistenceService.delete(this.collectionName, id);
  }
}
