import { ProductionTask } from '../../domain/entities/ProductionTask';
import { IProductionTaskRepository } from '../../infrastructure/repositories/IProductionTaskRepository';

export class AssignTaskUseCase {
  constructor(private readonly repository: IProductionTaskRepository) {}

  async execute(id: string, assignedTo: string): Promise<ProductionTask> {
    const task = await this.repository.findById(id);
    if (!task) throw new Error('Production task not found');

    return this.repository.update(id, { assignedTo });
  }
}
