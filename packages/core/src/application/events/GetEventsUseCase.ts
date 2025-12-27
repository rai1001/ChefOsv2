import { Event, EventStatus } from '../../domain/entities/Event';
import { IEventRepository } from '../../infrastructure/repositories/IEventRepository';

export interface GetEventsFilters {
  status?: EventStatus;
  startDate?: Date;
  endDate?: Date;
}

export class GetEventsUseCase {
  constructor(private readonly repository: IEventRepository) {}

  async execute(outletId: string, filters: GetEventsFilters = {}): Promise<Event[]> {
    if (filters.startDate && filters.endDate) {
      return this.repository.findByDateRange(outletId, filters.startDate, filters.endDate);
    }

    // Fallback to getting all (or future ones) if no date range.
    // For now, assuming findByOutlet returns all.
    const events = await this.repository.findByOutlet(outletId);

    if (filters.status) {
      return events.filter((e) => e.status === filters.status);
    }

    return events;
  }
}
