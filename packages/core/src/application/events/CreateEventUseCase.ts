import { CreateEventDTO, Event } from '../../domain/entities/Event';
import { IEventRepository } from '../../infrastructure/repositories/IEventRepository';

export class CreateEventUseCase {
  constructor(private readonly repository: IEventRepository) {}

  async execute(dto: CreateEventDTO): Promise<Event> {
    if (!dto.outletId) throw new Error('Outlet ID is required');
    if (!dto.eventName) throw new Error('Event name is required');
    if (!dto.eventDate) throw new Error('Event date is required');
    if (dto.numberOfGuests < 0) throw new Error('Number of guests cannot be negative');

    return this.repository.create({
      ...dto,
    });
  }
}
