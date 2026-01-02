import { injectable } from 'inversify';
import { getCollection, setDocument, updateDocument } from '@/services/firestoreService';
import { ProductionTask } from '@culinaryos/core';

export interface IProductionRepository {
  getTasksByEvent(eventId: string): Promise<ProductionTask[]>;
  createTask(task: ProductionTask): Promise<void>;
  updateTask(id: string, task: Partial<ProductionTask>): Promise<void>;
}

@injectable()
export class FirebaseProductionRepository implements IProductionRepository {
  private collectionName = 'productionTasks';

  async getTasksByEvent(eventId: string): Promise<ProductionTask[]> {
    const tasks = await getCollection<any>(this.collectionName);
    return tasks.filter((t) => t.eventId === eventId) as ProductionTask[];
  }

  async createTask(task: ProductionTask): Promise<void> {
    await setDocument(this.collectionName, task.id, {
      ...task,
      createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
      updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt,
      scheduledFor:
        task.scheduledFor instanceof Date ? task.scheduledFor.toISOString() : task.scheduledFor,
    } as any);
  }

  async updateTask(id: string, task: Partial<ProductionTask>): Promise<void> {
    const updateData: any = { ...task, updatedAt: new Date().toISOString() };
    if (task.scheduledFor instanceof Date)
      updateData.scheduledFor = task.scheduledFor.toISOString();
    if (task.createdAt instanceof Date) updateData.createdAt = task.createdAt.toISOString();

    await updateDocument(this.collectionName, id, updateData);
  }
}
