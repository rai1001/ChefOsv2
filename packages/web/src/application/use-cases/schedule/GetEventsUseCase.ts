
import { injectable, inject } from 'inversify';
import { IEventRepository } from '@/domain/interfaces/repositories/IEventRepository';
import { TYPES } from '../../di/types';
import { Event } from '@/domain/entities/Event';

@injectable()
export class GetEventsUseCase {
    constructor(
        @inject(TYPES.EventRepository) private eventRepository: IEventRepository
    ) { }

    async execute(filters: { dateStart?: string; dateEnd?: string; outletId?: string }): Promise<Event[]> {
        return this.eventRepository.getEvents(filters);
    }
}
