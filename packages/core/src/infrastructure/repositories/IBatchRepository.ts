import { Batch, CreateBatchDTO, ConsumeBatchDTO } from '../../domain/entities/Batch';
import { RepositoryOptions } from './RepositoryOptions';

export interface IBatchRepository {
  create(dto: CreateBatchDTO, options?: RepositoryOptions): Promise<Batch>;
  findById(id: string): Promise<Batch | null>;
  findByIngredient(ingredientId: string): Promise<Batch[]>;
  findActiveBatchesFIFO(ingredientId: string): Promise<Batch[]>;
  findExpiringSoon(outletId: string, daysAhead: number): Promise<Batch[]>;
  consume(dto: ConsumeBatchDTO, options?: RepositoryOptions): Promise<Batch>;
  updateStatus(id: string, status: string, options?: RepositoryOptions): Promise<Batch>;
  delete(id: string, options?: RepositoryOptions): Promise<void>;
}
