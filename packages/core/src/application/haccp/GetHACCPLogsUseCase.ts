import { HACCPLog } from '../../domain/entities/HACCPLog';
import { IHACCPRepository } from '../../infrastructure/repositories/IHACCPRepository';

export interface GetHACCPLogsFilters {
  taskId?: string;
  startDate?: Date;
  endDate?: Date;
  isCompliant?: boolean;
}

export class GetHACCPLogsUseCase {
  constructor(private readonly repository: IHACCPRepository) {}

  async execute(outletId: string, filters: GetHACCPLogsFilters = {}): Promise<HACCPLog[]> {
    return this.repository.getLogs(outletId, filters);
  }
}
