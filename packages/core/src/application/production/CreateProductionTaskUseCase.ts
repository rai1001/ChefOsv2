import { CreateProductionTaskDTO, ProductionTask } from '../../domain/entities/ProductionTask';
import { IProductionTaskRepository } from '../../infrastructure/repositories/IProductionTaskRepository';

export class CreateProductionTaskUseCase {
  constructor(private readonly repository: IProductionTaskRepository) {}

  async execute(dto: CreateProductionTaskDTO): Promise<ProductionTask> {
    if (!dto.outletId) throw new Error('Outlet ID is required');
    if (!dto.fichaId) throw new Error('Ficha ID is required');
    if (!dto.quantity || dto.quantity.value <= 0) throw new Error('Valid quantity is required');
    if (!dto.scheduledFor) throw new Error('Scheduled date is required');

    return this.repository.create(dto);
  }
}
