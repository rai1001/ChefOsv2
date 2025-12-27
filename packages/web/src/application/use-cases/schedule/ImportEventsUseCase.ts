
import { injectable, inject } from 'inversify';
import { IEventRepository } from '@/domain/interfaces/repositories/IEventRepository';
import { TYPES } from '../../di/types';
import { Event } from '@/domain/entities/Event';

@injectable()
export class ImportEventsUseCase {
    constructor(
        @inject(TYPES.EventRepository) private eventRepository: IEventRepository
    ) { }

    async execute(events: Event[]): Promise<void> {
        return this.eventRepository.saveEvents(events);
    }
}
