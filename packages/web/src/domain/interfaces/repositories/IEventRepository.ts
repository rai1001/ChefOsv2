
import { Event } from '../../entities/Event';

export interface IEventRepository {
    getEvents(filters: { dateStart?: string; dateEnd?: string; outletId?: string }): Promise<Event[]>;
    saveEvent(event: Event): Promise<void>;
    saveEvents(events: Event[]): Promise<void>;
    deleteEvent(eventId: string): Promise<void>;
}
