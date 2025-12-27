import { ProductionTask } from '../../domain/entities/ProductionTask';
import { IProductionTaskRepository } from '../../infrastructure/repositories/IProductionTaskRepository';

export class ScheduleProductionUseCase {
  constructor(private readonly repository: IProductionTaskRepository) {}

  async execute(
    id: string,
    scheduledFor: Date,
    estimatedDuration?: number
  ): Promise<ProductionTask> {
    const task = await this.repository.findById(id);
    if (!task) throw new Error('Production task not found');

    return this.repository.update(id, { scheduledFor, estimatedDuration });
  }
}
