import { Event, CreateEventDTO, EventStatus } from '../../entities/Event';
import { RepositoryOptions } from './RepositoryOptions';

export interface IEventRepository {
  create(dto: CreateEventDTO, options?: RepositoryOptions): Promise<Event>;
  findById(id: string): Promise<Event | null>;
  findByOutlet(outletId: string): Promise<Event[]>;
  findByDateRange(outletId: string, startDate: Date, endDate: Date): Promise<Event[]>;
  findByStatus(outletId: string, status: EventStatus): Promise<Event[]>;
  update(id: string, data: Partial<Event>, options?: RepositoryOptions): Promise<Event>;
  updateStatus(id: string, status: EventStatus, options?: RepositoryOptions): Promise<Event>;
  delete(id: string, options?: RepositoryOptions): Promise<void>;
}
