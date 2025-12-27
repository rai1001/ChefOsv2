import { ProductionTask, ProductionTaskStatus } from '../../domain/entities/ProductionTask';
import { IProductionTaskRepository } from '../../infrastructure/repositories/IProductionTaskRepository';

export class UpdateTaskStatusUseCase {
  constructor(private readonly repository: IProductionTaskRepository) {}

  async execute(id: string, status: ProductionTaskStatus): Promise<ProductionTask> {
    const task = await this.repository.findById(id);
    if (!task) throw new Error('Production task not found');

    const updateDto: any = { status };
    const now = new Date();

    if (
      status === ProductionTaskStatus.IN_PROGRESS &&
      task.status === ProductionTaskStatus.PENDING
    ) {
      updateDto.startedAt = now;
    } else if (status === ProductionTaskStatus.COMPLETED) {
      updateDto.completedAt = now;
      if (task.startedAt) {
        // Calculate duration in minutes
        updateDto.actualDuration = Math.round((now.getTime() - task.startedAt.getTime()) / 60000);
      }
    }

    // Use updateStatus for simple status change or generic update if we have extra fields
    if (Object.keys(updateDto).length > 1) {
      return this.repository.update(id, updateDto);
    }

    return this.repository.updateStatus(id, status);
  }
}
