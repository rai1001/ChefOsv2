import { ProductionTask, ProductionTaskStatus } from '../../domain/entities/ProductionTask';
import { IProductionTaskRepository } from '../../infrastructure/repositories/IProductionTaskRepository';
import { UpdateTaskStatusUseCase } from './UpdateTaskStatusUseCase';

export class CompleteTaskUseCase {
  constructor(
    private readonly repository: IProductionTaskRepository,
    private readonly updateStatusUseCase: UpdateTaskStatusUseCase
  ) {}

  async execute(id: string): Promise<ProductionTask> {
    const task = await this.repository.findById(id);
    if (!task) throw new Error('Production task not found');

    // Delegate to UpdateTaskStatusUseCase which handles logic for timestamps and duration
    return this.updateStatusUseCase.execute(id, ProductionTaskStatus.COMPLETED);
  }
}
