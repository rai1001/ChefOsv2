import { Event, EventStatus } from '../../domain/entities/Event';
import { IEventRepository } from '../../infrastructure/repositories/IEventRepository';

export interface UpdateEventDTO {
  eventName?: string;
  eventType?: string;
  eventDate?: Date;
  numberOfGuests?: number;
  status?: EventStatus;
  notes?: string;
  // Add other fields as needed
}

export class UpdateEventUseCase {
  constructor(private readonly repository: IEventRepository) {}

  async execute(id: string, updates: UpdateEventDTO): Promise<Event> {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new Error('Event not found');
    }

    // Reuse generic update if available or specific methods.
    // Checking IEventRepository definition might depend on implementation details in next steps,
    // but assuming standard update pattern.
    return this.repository.update(id, updates);
  }
}
