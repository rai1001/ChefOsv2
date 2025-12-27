import { HACCPLog, HACCPTask, CreateHACCPLogDTO } from '../../domain/entities/HACCPLog';
import { RepositoryOptions } from './RepositoryOptions';

export interface IHACCPRepository {
  // Tasks
  getTasks(outletId: string, options?: RepositoryOptions): Promise<HACCPTask[]>;
  getTaskById(id: string): Promise<HACCPTask | null>;
  createTask(task: Omit<HACCPTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<HACCPTask>;

  // Logs
  createLog(
    dto: CreateHACCPLogDTO & { isCompliant: boolean; taskName: string },
    options?: RepositoryOptions
  ): Promise<HACCPLog>;
  getLogs(
    outletId: string,
    filters?: {
      taskId?: string;
      startDate?: Date;
      endDate?: Date;
      isCompliant?: boolean;
    }
  ): Promise<HACCPLog[]>;
}
