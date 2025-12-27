import {
  ProductionTask,
  ProductionTaskStatus,
  ProductionStation,
} from '../../domain/entities/ProductionTask';
import { IProductionTaskRepository } from '../../infrastructure/repositories/IProductionTaskRepository';

export interface GetProductionTasksFilters {
  status?: ProductionTaskStatus;
  station?: ProductionStation;
  startDate?: Date;
  endDate?: Date;
  eventId?: string;
}

export class GetProductionTasksUseCase {
  constructor(private readonly repository: IProductionTaskRepository) {}

  async execute(
    outletId: string,
    filters: GetProductionTasksFilters = {}
  ): Promise<ProductionTask[]> {
    // Repository methods are split by concern, so implementation might need to combine them or rely on a more generic query method if available.
    // The current interface has: findByEvent, findByOutlet, findByStation, findByStatus, findByDateRange.
    // Ideally, we would have a generic `find(query)` method.
    // For now, I'll filter in memory if multiple criteria are passed, or choose the most specific method.

    let tasks: ProductionTask[] = [];

    if (filters.eventId) {
      tasks = await this.repository.findByEvent(filters.eventId);
    } else if (filters.startDate && filters.endDate) {
      tasks = await this.repository.findByDateRange(outletId, filters.startDate, filters.endDate);
    } else if (filters.status) {
      tasks = await this.repository.findByStatus(outletId, filters.status);
    } else if (filters.station) {
      tasks = await this.repository.findByStation(outletId, filters.station);
    } else {
      tasks = await this.repository.findByOutlet(outletId);
    }

    // Apply remaining filters in-memory
    // If we used findByEvent (which doesn't require outletId provided in this scope, but usually event is tied to outlet), verify outlet matches if strictness needed.

    return tasks.filter((task) => {
      let matches = true;
      if (filters.status && task.status !== filters.status) matches = false;
      if (filters.station && task.station !== filters.station) matches = false;
      return matches;
    });
  }
}
