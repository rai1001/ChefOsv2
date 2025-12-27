import {
  ProductionTask,
  CreateProductionTaskDTO,
  UpdateProductionTaskDTO,
  ProductionTaskStatus,
  ProductionStation,
} from '../../domain/entities/ProductionTask';
import { RepositoryOptions } from './RepositoryOptions';

export interface IProductionTaskRepository {
  create(dto: CreateProductionTaskDTO, options?: RepositoryOptions): Promise<ProductionTask>;
  findById(id: string): Promise<ProductionTask | null>;
  findByEvent(eventId: string): Promise<ProductionTask[]>;
  findByOutlet(outletId: string): Promise<ProductionTask[]>;
  findByStation(outletId: string, station: ProductionStation): Promise<ProductionTask[]>;
  findByStatus(outletId: string, status: ProductionTaskStatus): Promise<ProductionTask[]>;
  findByDateRange(outletId: string, startDate: Date, endDate: Date): Promise<ProductionTask[]>;
  update(
    id: string,
    dto: UpdateProductionTaskDTO,
    options?: RepositoryOptions
  ): Promise<ProductionTask>;
  updateStatus(
    id: string,
    status: ProductionTaskStatus,
    options?: RepositoryOptions
  ): Promise<ProductionTask>;
  delete(id: string, options?: RepositoryOptions): Promise<void>;
}
